import {
  mergePromptParts,
  resolveSituationLine,
  situationalPromptHasContext,
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
  return situationalPromptHasContext(prompt)
}

export const FREE_RESPONSE_SYSTEM_RULES = [
  'For type free-response: prompt MUST be Russian situational context (Ситуация / Тема) plus an open-ended writing task.',
  'Never use "Переведите на английский" for free-response.',
  'targetAnswer is one canonical English sentence; acceptedAnswers may include It is / It\'s variants.',
  'keywords: 2-4 meaningful content words (not It, time, to). minWords: 3.',
  'hint: short grammar cue without the full answer.',
] as const
