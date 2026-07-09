import {
  buildBrokenPhraseFromTarget,
  extractErrorFixBrokenPhrase,
  isErrorFixBrokenValid,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'
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

export function buildErrorFixPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string,
  brokenOverride?: string
): string | null {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  const broken =
    brokenOverride?.trim() ||
    buildBrokenPhraseFromTarget(targetAnswer, lesson) ||
    null
  if (!broken || !isErrorFixBrokenValid(broken, targetAnswer)) return null
  return formatErrorFixPrompt(situation, broken)
}

export function buildEtalonErrorFixPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonErrorFixSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildErrorFixPrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

export function errorFixPromptHasContext(prompt: string): boolean {
  if (!situationalPromptHasContext(prompt)) return false
  if (!/Исправьте:/iu.test(prompt)) return false
  return extractErrorFixBrokenPhrase(prompt) != null
}

export const ERROR_FIX_SYSTEM_RULES = [
  'For type error-fix: prompt = Russian Ситуация:/Тема: from sourceSituations + Исправьте: "{broken}." via mergePromptParts.',
  'Do not put say/write instructions in prompt; those appear only in the UI info label.',
  'Never use Переведите, ___ gap-fill, Выберите слово, or listening instructions in error-fix prompts.',
  'Never include targetAnswer in prompt; broken ≠ targetAnswer; normalize(broken) ≠ normalize(targetAnswer).',
  'Prefer wrong content word broken phrases from lesson distractors aligned with the situation; word-order or missing-content-word only as fallback.',
  'Never use contraction-only, missing-is, or punctuation-only broken phrases.',
  'Leave hint empty; do not provide options or audioText.',
  'Rotate Russian situations across sourceSituations; do not repeat identical situation text across scenarios in one reference pass.',
  'Lesson 1: rotate weather/time/distance; do not default to "темно" / It\'s dark unless it is the only unused scenario.',
] as const
