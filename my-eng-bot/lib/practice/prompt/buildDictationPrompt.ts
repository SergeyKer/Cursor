import { sanitizeVoiceShadowPrompt } from '@/lib/practice/buildVoiceShadowPrompt'
import { mergePromptParts, resolveSituationLine, situationalPromptHasContext } from '@/lib/practice/prompt/promptSourceUtils'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import type { LessonData } from '@/types/lesson'

export function findLessonDictationSourceForPractice(
  lesson: LessonData,
  stepIndex = 0
): PracticePromptSource | null {
  const resolved = resolveReferenceLessonStep({
    lesson,
    referenceExerciseType: 'dictation',
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

export function buildDictationPrompt(
  source: PracticePromptSource,
  lesson: LessonData,
  stepIndex: number,
  targetAnswer: string
): string {
  const situation = resolveSituationLine(source.step, lesson, stepIndex)
  const base = mergePromptParts([situation, 'Прослушайте и напишите услышанное по-английски.'])
  return sanitizeVoiceShadowPrompt(base, targetAnswer)
}

export function buildEtalonDictationPromptForLesson(lesson: LessonData, stepIndex = 0): string | null {
  const source = findLessonDictationSourceForPractice(lesson, stepIndex)
  if (!source) return null
  return buildDictationPrompt(source, lesson, stepIndex, source.exercise.correctAnswer)
}

export function dictationPromptHasContext(prompt: string): boolean {
  return situationalPromptHasContext(prompt)
}

export const DICTATION_SYSTEM_RULES = [
  'For type dictation: Russian prompt with listen instruction and situation; never include the English phrase in prompt.',
  'audioText and targetAnswer must be the full English phrase; leave hint empty.',
] as const
