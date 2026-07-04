import { resolveSituationLine, mergePromptParts, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonDropdownFillSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'dropdown-fill',
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

export function buildDropdownFillPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number
): string {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  const question = source.exercise.question?.trim() ?? ''
  const gapLine = question.includes('___') ? question : 'Впишите одно слово в пропуск в английской фразе.'
  return mergePromptParts([situation, 'Выберите одно слово для пропуска.', gapLine])
}

export function buildEtalonDropdownFillPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonDropdownFillSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildDropdownFillPrompt(source, lesson, stepIndex)
}

export function dropdownFillPromptHasContext(prompt: string): boolean {
  return situationalPromptHasContext(prompt)
}

export const DROPDOWN_FILL_SYSTEM_RULES = [
  'For type dropdown-fill: prompt in Russian with situation; targetAnswer is a single word; provide at least 3 single-word options including targetAnswer.',
  'Never use full-sentence options for dropdown-fill.',
] as const
