import {
  isTranslateStylePrompt,
  situationalPromptHasContext,
} from '@/lib/practice/prompt/promptSourceUtils'
import type { Exercise } from '@/types/lesson'

export function isTranslateBackedFreeResponseExercise(exercise: Exercise): boolean {
  return (
    exercise.type === 'translate' &&
    (exercise.answerFormat === 'full_sentence' || !exercise.answerFormat)
  )
}

export function buildTranslateBackedFreeResponsePrompt(exercise: Exercise): string {
  return exercise.question?.trim() ?? ''
}

export function freeResponsePromptHasValidContext(prompt: string): boolean {
  const trimmed = prompt?.trim() ?? ''
  if (!trimmed) return false
  return isTranslateStylePrompt(trimmed) || situationalPromptHasContext(trimmed)
}

export function canonicalAcceptedAnswersForExercise(exercise: Exercise): string[] {
  return Array.from(
    new Set(
      [exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])]
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}
