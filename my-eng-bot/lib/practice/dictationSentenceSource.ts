import { inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import type { Exercise } from '@/types/lesson'

export function isDictationSentenceSource(exercise: Exercise, targetAnswer?: string): boolean {
  if (exercise.type !== 'translate') return false
  if (exercise.answerFormat === 'single_word') return false

  const answer = (targetAnswer ?? exercise.correctAnswer).trim()
  if (!answer) return false

  return (
    inferChoiceGranularity({
      targetAnswer: answer,
      answerFormat: exercise.answerFormat,
      prompt: exercise.question,
      exerciseType: exercise.type,
    }) === 'sentence'
  )
}
