import {
  buildBrokenPhraseFromTarget,
  errorFixPairIsAligned,
  errorFixPromptHasLeakMarkers,
  errorFixPromptLeaksTargetAnswer,
  extractErrorFixBrokenPhrase,
  extractSituationKeyFromErrorFixPrompt,
  inferErrorFixAxis,
  inferSituationAxis,
  isErrorFixBrokenValid,
  isErrorFixTargetComplete,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'
import { pickSuggestedScenario } from '@/lib/practice/buildPracticeDiversity'
import {
  mergePromptParts,
  resolveSituationLine,
  situationalPromptHasContext,
} from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonErrorFixSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'error-fix',
    stepIndex,
  })
  if (!resolved) return null
  return {
    step: resolved.step,
    exercise: resolved.exercise,
    variantProfileId: resolved.variantProfileId,
    variantIndex: resolved.variantIndex,
    sourceStepNumber: resolved.sourceStepNumber,
  }
}

export function formatErrorFixPrompt(situationLine: string, broken: string): string {
  const brokenClean = broken.trim().replace(/[.!?…]+$/u, '')
  return mergePromptParts([situationLine, `Исправьте: "${brokenClean}."`])
}

function resolveAlignedErrorFixSituation(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string
): string {
  const primary = resolveSituationLine(source.step, lesson, stepIndex)
  const primaryKey = extractSituationKeyFromErrorFixPrompt(primary) || primary
  if (errorFixPairIsAligned(primaryKey, targetAnswer, lesson.id)) return primary

  const targetAxis = inferErrorFixAxis(targetAnswer)
  const situations = lesson.repeatConfig?.sourceSituations ?? []
  const aligned = situations.filter((item) => {
    const axis = inferSituationAxis(item)
    return axis === 'unknown' || axis === targetAxis
  })
  const suggested = pickSuggestedScenario(aligned.length > 0 ? aligned : situations, stepIndex, [])
  if (suggested) {
    return `Ситуация: ${suggested.replace(/[.!?…]+$/u, '')}.`
  }
  return primary
}

/** Resolve target that stays aligned with the source-step situation (lesson 1). */
export function resolveErrorFixTargetAnswer(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  requestedTarget: string
): string {
  const etalon = source.exercise.correctAnswer.trim()
  const requested = requestedTarget.trim()
  if (!requested) return etalon

  if (!isErrorFixTargetComplete(requested, lesson.id)) return etalon || requested

  const situation = resolveAlignedErrorFixSituation(source, lesson, stepIndex, requested)
  const situationKey = extractSituationKeyFromErrorFixPrompt(situation) || situation

  if (errorFixPairIsAligned(situationKey, requested, lesson.id)) {
    return requested
  }

  return etalon || requested
}

export function buildErrorFixPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string,
  brokenOverride?: string
): string | null {
  const resolvedTarget = resolveErrorFixTargetAnswer(source, lesson, stepIndex, targetAnswer)
  if (!isErrorFixTargetComplete(resolvedTarget, lesson.id)) return null

  const situation = resolveAlignedErrorFixSituation(source, lesson, stepIndex, resolvedTarget)
  const situationKey = extractSituationKeyFromErrorFixPrompt(situation) || situation
  if (!errorFixPairIsAligned(situationKey, resolvedTarget, lesson.id)) return null

  const broken =
    brokenOverride?.trim() ||
    buildBrokenPhraseFromTarget(resolvedTarget, lesson) ||
    null
  if (!broken || !isErrorFixBrokenValid(broken, resolvedTarget)) return null
  return formatErrorFixPrompt(situation, broken)
}

export function buildEtalonErrorFixPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonErrorFixSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildErrorFixPrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

export function errorFixPromptHasContext(prompt: string): boolean {
  if (!situationalPromptHasContext(prompt)) return false
  if (errorFixPromptHasLeakMarkers(prompt)) return false
  if (!/Исправьте:/iu.test(prompt)) return false
  return extractErrorFixBrokenPhrase(prompt) != null
}

export function isErrorFixAiPairValid(params: {
  prompt: string
  targetAnswer: string
  lessonId?: string
}): boolean {
  const { prompt, targetAnswer, lessonId } = params
  if (!errorFixPromptHasContext(prompt)) return false
  if (!isErrorFixTargetComplete(targetAnswer, lessonId)) return false
  if (errorFixPromptLeaksTargetAnswer(prompt, targetAnswer)) return false

  const broken = extractErrorFixBrokenPhrase(prompt)
  if (!broken || !isErrorFixBrokenValid(broken, targetAnswer)) return false

  const situationKey = extractSituationKeyFromErrorFixPrompt(prompt)
  if (!errorFixPairIsAligned(situationKey, targetAnswer, lessonId)) return false

  return true
}

export const ERROR_FIX_SYSTEM_RULES = [
  'For type error-fix: prompt = Russian Ситуация:/Тема: from sourceSituations + Исправьте: "{broken}." via mergePromptParts.',
  'Do not put say/write instructions in prompt; those appear only in the UI info label.',
  'Never use Переведите, ___ gap-fill, Выберите слово, Собеседник, or listening instructions in error-fix prompts.',
  'Never include targetAnswer in prompt; broken ≠ targetAnswer; normalize(broken) ≠ normalize(targetAnswer).',
  'When canonicalSourceExercise has translate/gap-fill wording, ignore it; use error-fix situation + Исправьте template only.',
  'Prefer wrong content word broken phrases from lesson distractors aligned with the situation; word-order or missing-content-word only as fallback.',
  'Never use contraction-only, missing-is, or punctuation-only broken phrases.',
  'Broken must stay on the same grammar axis as targetAnswer (It\'s + adj with It\'s + adj; It\'s time to + verb with It\'s time to + verb).',
  'Leave hint empty; do not provide options or audioText.',
  'Each scenario needs a unique Russian situation and a matching targetAnswer; do not repeat identical situation text across scenarios in one reference pass.',
  'Lesson 1: weather/distance situations → It\'s + adjective (It\'s dark / It\'s cold); «Пора …» / time situations → It\'s time to + verb. Never mix axes.',
  'Lesson 1: never use incomplete targetAnswer like "It\'s time." - always It\'s time to + verb.',
  'Lesson 1: rotate weather/time/distance; do not default to "темно" / It\'s dark unless it is the only unused scenario.',
] as const
