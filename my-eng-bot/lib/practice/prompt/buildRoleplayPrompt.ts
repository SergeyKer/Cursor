import { mergePromptParts, resolveSituationLine, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

const LESSON_ROLEPLAY_LEADS: Record<string, string> = {
  '1': 'Собеседник описывает момент из вашего дня.',
  '2': 'Собеседник задаёт короткий вопрос по теме Who.',
  '3': 'Собеседник просит уточнить фразу.',
  '4': 'Собеседник спрашивает о вас в неформальном тоне.',
}

export function findLessonRoleplaySourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'roleplay-mini',
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

export function buildRoleplayPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number
): string {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  const lead = LESSON_ROLEPLAY_LEADS[lesson.id] ?? 'Собеседник ждёт короткий ответ.'
  return mergePromptParts([situation, lead, 'Ответьте по-английски одним-двумя предложениями.'])
}

export function buildEtalonRoleplayPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonRoleplaySourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildRoleplayPrompt(source, lesson, stepIndex)
}

export function roleplayPromptHasContext(prompt: string): boolean {
  return situationalPromptHasContext(prompt)
}

export const ROLEPLAY_MINI_SYSTEM_RULES = [
  'For type roleplay-mini: Russian situational mini-dialogue lead; learner replies in 1-2 English sentences.',
  'keywords: 2-4 meaningful words; minWords: 3; tolerance soft.',
] as const
