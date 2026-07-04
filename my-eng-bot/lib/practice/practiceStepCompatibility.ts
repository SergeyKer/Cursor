import { inferChoiceGranularity } from '@/lib/practice/choiceOptionGranularity'
import type { Exercise } from '@/types/lesson'
import type { PracticeExerciseType } from '@/types/practice'

function exerciseHasSentenceOptions(exercise: Exercise): boolean {
  return (exercise.options ?? []).some((option) => inferChoiceGranularity({ targetAnswer: option }) === 'sentence')
}

export function isExerciseCompatibleWithPracticeType(
  practiceType: PracticeExerciseType,
  exercise: Exercise
): boolean {
  switch (practiceType) {
    case 'context-clue':
      if (exercise.type === 'sentence_puzzle') return false
      if (exercise.type === 'fill_text') return true
      if (exercise.type === 'translate') return exercise.answerFormat === 'full_sentence' || !exercise.answerFormat
      if (exercise.type === 'fill_choice') return exerciseHasSentenceOptions(exercise) || Boolean(exercise.options?.length)
      return Boolean(exercise.options?.length)
    case 'choice':
      return exercise.type === 'fill_choice' && (exercise.options?.length ?? 0) >= 2
    case 'dropdown-fill':
      return (
        exercise.type === 'fill_text' ||
        (exercise.type === 'fill_choice' &&
          (exercise.question?.includes('___') || Boolean(exercise.options?.length)))
      )
    case 'listening-select':
    case 'speed-round':
      return Boolean(exercise.options?.length) || exercise.type === 'fill_choice' || exercise.type === 'translate'
    case 'sentence-surgery':
      return exercise.type === 'sentence_puzzle'
    case 'free-response':
      return exercise.type === 'translate' || exercise.type === 'write_own'
    case 'dictation':
      return exercise.type === 'translate' || exercise.type === 'fill_choice' || exercise.type === 'fill_text'
    case 'roleplay-mini':
      return exercise.type === 'translate' || exercise.type === 'write_own'
    case 'boss-challenge':
      return exercise.type === 'translate' || exercise.type === 'write_own'
    default:
      return true
  }
}
