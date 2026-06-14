import type { Exercise } from '@/types/lesson'

/** Стоимость отмены одной ошибки на шаге 4–6. */
export const COIN_ERROR_FORGIVENESS_COST = 1

/** Шаги урока, где доступна отмена ошибки за монету. */
export const COIN_FORGIVENESS_STEP_NUMBERS = [4, 5, 6] as const

export type CoinForgivenessStepNumber = (typeof COIN_FORGIVENESS_STEP_NUMBERS)[number]

export function isCoinForgivenessStep(stepNumber: number): stepNumber is CoinForgivenessStepNumber {
  return (COIN_FORGIVENESS_STEP_NUMBERS as readonly number[]).includes(stepNumber)
}

export function isCoinForgivenessExercise(exercise: Exercise | null | undefined): boolean {
  if (!exercise) return false
  return (
    exercise.type === 'translate' ||
    exercise.type === 'sentence_puzzle' ||
    (exercise.type === 'fill_text' && exercise.answerFormat === 'full_sentence')
  )
}

export function canOfferCoinErrorForgiveness(params: {
  stepNumber: number
  exercise: Exercise | null | undefined
  hasErrorOnStep: boolean
  forgivenessUsedThisRun: boolean
  status: 'idle' | 'checking' | 'feedback' | 'completed'
}): boolean {
  if (params.forgivenessUsedThisRun) return false
  if (!params.hasErrorOnStep) return false
  if (params.status !== 'feedback') return false
  if (!isCoinForgivenessStep(params.stepNumber)) return false
  if (!isCoinForgivenessExercise(params.exercise)) return false
  return true
}
