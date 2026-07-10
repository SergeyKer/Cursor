import { pickSuggestedScenario } from '@/lib/practice/buildPracticeDiversity'
import {
  mergePromptParts,
  normalizePracticeEmDashes,
  resolveSituationLine,
  situationalPromptHasContext,
} from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveBossActionFrame } from '@/lib/practice/bossChallengeAnswerValidation'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

const EXAM_META_RE = /финальный вызов|примените тему|соберите всё|развёрнут/iu

function looksLikeBareTranslateHook(situation: string): boolean {
  const trimmed = situation.replace(/^Ситуация:\s*/iu, '').replace(/^Тема:\s*/iu, '').trim()
  if (!trimmed) return true
  if (/^[Яя]\s+[а-яё]/u.test(trimmed) && trimmed.length < 40) return true
  if (/^Кто\s+/u.test(trimmed) && trimmed.endsWith('?')) return true
  return false
}

function wrapBareSituation(situation: string, lesson: LessonData): string {
  const raw = situation.replace(/^Ситуация:\s*/iu, '').replace(/^Тема:\s*/iu, '').trim()
  if (!raw) return `Тема: ${lesson.topic.trim() || 'практика'}.`
  const core = raw.replace(/[.!?…]+$/u, '')
  // Keep distinctive content in the first clause so situation keys stay unique.
  if (lesson.id === '4' || /\b(i am|i'm|from)\b/i.test(lesson.topic)) {
    return `Ситуация: на знакомстве - ${core}.`
  }
  if (lesson.id === '2' || /who/i.test(lesson.topic)) {
    return `Ситуация: разговор о вкусах - ${core}.`
  }
  return `Ситуация: ${core}.`
}

export function findLessonBossChallengeSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'boss-challenge',
    stepIndex,
  })
  if (!resolved) return null
  return {
    step: resolved.step,
    exercise: resolved.exercise,
    variantProfileId: resolved.variantProfileId,
    variantIndex: resolved.variantIndex,
    axis: 'creative',
    sourceStepNumber: resolved.sourceStepNumber,
  }
}

export function buildBossChallengePrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer?: string
): string {
  const pool = lesson.repeatConfig?.sourceSituations ?? []
  const suggested = pickSuggestedScenario(pool, stepIndex, [])
  let situation = suggested
    ? `Ситуация: ${suggested.replace(/[.!?…]+$/u, '')}.`
    : resolveSituationLine(source.step, lesson, stepIndex)
  if (looksLikeBareTranslateHook(situation)) {
    situation = wrapBareSituation(situation, lesson)
  }
  const frame = resolveBossActionFrame({
    lesson,
    targetAnswer: targetAnswer ?? source.exercise.correctAnswer,
  })
  return normalizePracticeEmDashes(mergePromptParts([situation, frame]))
}

export function buildEtalonBossChallengePromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonBossChallengeSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildBossChallengePrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

const ENGLISH_PATTERN_STARTER_RE = /\b(i am|i'm|who|i know what)\b/iu

export function bossChallengePromptHasContext(prompt: string): boolean {
  if (!situationalPromptHasContext(prompt)) return false
  if (EXAM_META_RE.test(prompt)) return false
  if (/Переведите/iu.test(prompt)) return false
  // No English pattern starters in the task prompt (anchors stay in keywords/validation).
  if (ENGLISH_PATTERN_STARTER_RE.test(prompt)) return false
  // Must include a concrete action cue (not only situation).
  return (
    /напиш/iu.test(prompt) ||
    /скажи/iu.test(prompt) ||
    /спроси/iu.test(prompt) ||
    /ответь/iu.test(prompt)
  )
}

export const BOSS_CHALLENGE_SYSTEM_RULES = [
  'For type boss-challenge: prompt = Russian Ситуация:/Тема: + short concrete Russian action frame (e.g. что пора сделать / о себе по ситуации / спросите по ситуации).',
  'Never put English pattern starters in prompt (I am…, Who…, I know what…); pattern anchors belong in keywords only.',
  'Never use exam meta: Финальный вызов, примените тему урока, соберите всё, развёрнутый ответ.',
  'Do not put long say/write meta in prompt; UI info label carries soft instruction.',
  'Never use Переведите, interlocutor/Собеседник, Исправьте, ___ gap-fill, or listening instructions.',
  'minWords: 4; tolerance soft; keywords = pattern anchors (e.g. time to, I am), not full target lexicon.',
  'Rotate Russian situations across sourceSituations; do not repeat identical situation text across scenarios in one reference pass.',
  'For weather/time lessons prefer variety across situations; for any lesson never reuse situation text in one reference pass.',
  'Leave hint empty; no options/audioText; apply lesson theme creatively; no targetAnswer leak in prompt.',
] as const
