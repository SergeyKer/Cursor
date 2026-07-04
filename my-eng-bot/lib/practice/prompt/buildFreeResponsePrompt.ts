import {
  buildTranslateBackedFreeResponsePrompt,
  freeResponsePromptHasValidContext,
  isTranslateBackedFreeResponseExercise,
} from '@/lib/practice/prompt/freeResponseTranslateMode'
import {
  mergePromptParts,
  resolveSituationLine,
} from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptAxis, PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType } from '@/types/practice'

const LESSON_FREE_RESPONSE_FRAMES: Record<string, Record<PracticePromptAxis, string>> = {
  '1': {
    state: 'Опишите по-английски, что сейчас происходит.',
    action: 'Напишите, что пора сделать по ситуации.',
    creative: 'Напишите своё предложение по новой ситуации.',
  },
  '2': {
    state: 'Сформулируйте вопрос Who по ситуации.',
    action: 'Ответьте коротким предложением.',
    creative: 'Дайте новый короткий ответ по теме.',
  },
  '3': {
    state: 'Составьте правильную фразу по ситуации.',
    action: 'Ответьте полным предложением.',
    creative: 'Перенесите правило на новую лексику.',
  },
  '4': {
    state: 'Опишите настроение или состояние.',
    action: 'Ответьте предложением о себе.',
    creative: 'Напишите новое предложение по теме.',
  },
}

function defaultFrame(lessonId: string, axis: PracticePromptAxis): string {
  const frames = LESSON_FREE_RESPONSE_FRAMES[lessonId] ?? LESSON_FREE_RESPONSE_FRAMES['1']!
  return frames[axis]
}

export function findLessonFreeResponseSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'free-response',
    stepIndex,
  })
  if (!resolved) return null
  return {
    step: resolved.step,
    exercise: resolved.exercise,
    variantProfileId: resolved.variantProfileId,
    variantIndex: resolved.variantIndex,
    axis: resolved.axis ?? 'state',
    sourceStepNumber: resolved.sourceStepNumber,
  }
}

export function buildFreeResponsePrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number
): string {
  if (isTranslateBackedFreeResponseExercise(source.exercise)) {
    return buildTranslateBackedFreeResponsePrompt(source.exercise)
  }
  const axis = source.axis ?? 'state'
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  const frame = defaultFrame(lesson.id, axis)
  return mergePromptParts([situation, frame])
}

export function buildEtalonFreeResponsePromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonFreeResponseSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildFreeResponsePrompt(source, lesson, stepIndex)
}

export function freeResponsePromptHasContext(prompt: string): boolean {
  return freeResponsePromptHasValidContext(prompt)
}

export const FREE_RESPONSE_SYSTEM_RULES = [
  'For type free-response with translate source: prompt MUST start with Переведите на английский: "…" using a Russian phrase from referenceCanonicalStep.exercise.variants.',
  'targetAnswer is the exact English translation of that Russian phrase; acceptedAnswers must mirror lesson variants (It is/It\'s, I am/I\'m, etc.).',
  'Do not set keywords or minWords for translate-backed free-response.',
  'hint: short grammar cue without the full answer.',
  'Rotate Russian phrases across scenarios; each prompt must match its targetAnswer.',
] as const
