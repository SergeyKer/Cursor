import { buildChoicePrompt } from '@/lib/practice/buildChoicePrompt'
import { choicePromptHasContext } from '@/lib/practice/buildChoicePrompt'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonSpeedRoundSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'speed-round',
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

export function buildSpeedRoundPrompt(source: PracticePromptSource, lesson: LessonData): string {
  const base = buildChoicePrompt(source.step, source.exercise, lesson)
  if (/быстро/i.test(base)) return base
  return `${base.replace(/[.!?…]+$/u, '')}. Быстро выберите лучший вариант.`
}

export function buildEtalonSpeedRoundPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonSpeedRoundSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildSpeedRoundPrompt(source, lesson)
}

export function speedRoundPromptHasContext(prompt: string): boolean {
  return choicePromptHasContext(prompt)
}

export const SPEED_ROUND_SYSTEM_RULES = [
  'For type speed-round: situational Russian prompt plus quick choice; exactly 3 options; semantic-near distractors.',
] as const
