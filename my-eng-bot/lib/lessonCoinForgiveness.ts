import type { Exercise } from '@/types/lesson'

/** Стоимость отмены одной ошибки на шаге 4–7. */
export const COIN_ERROR_FORGIVENESS_COST = 1

/** Шаги урока, где доступна отмена ошибки за монету. */
export const COIN_FORGIVENESS_STEP_NUMBERS = [4, 5, 6, 7] as const

export type CoinForgivenessStepNumber = (typeof COIN_FORGIVENESS_STEP_NUMBERS)[number]

export type CoinForgivenessLessonStatus = 'idle' | 'checking' | 'feedback' | 'completed'

export type CoinForgivenessGuardParams = {
  stepNumber: number
  exercise: Exercise | null | undefined
  hasErrorOnStep: boolean
  forgivenessUsedThisRun: boolean
  forgivenessConfirmPending: boolean
  forgivenessAppliedAckActive?: boolean
  exerciseErrors: number
  status: CoinForgivenessLessonStatus
  coinBalance: number
}

/** Текст правильного ответа для applied-ack (puzzle - текущий sub). */
export function resolveCoinForgivenessAppliedPreviewAnswer(
  exercise: Exercise | null | undefined,
  puzzleSubIndex: number,
  correctAnswer: string | undefined
): string | null {
  if (!exercise) return null
  if (exercise.type === 'sentence_puzzle') {
    const variant = exercise.puzzleVariants?.[puzzleSubIndex]
    if (!variant) return null
    const fromAnswer = variant.correctAnswer?.trim()
    if (fromAnswer) return fromAnswer
    if (variant.correctOrder?.length) return variant.correctOrder.join(' ')
    return null
  }
  const trimmed = correctAnswer?.trim()
  return trimmed || null
}

export function isCoinForgivenessStep(stepNumber: number): stepNumber is CoinForgivenessStepNumber {
  return (COIN_FORGIVENESS_STEP_NUMBERS as readonly number[]).includes(stepNumber)
}

export function isCoinForgivenessExercise(exercise: Exercise | null | undefined): boolean {
  if (!exercise) return false
  return (
    exercise.type === 'translate' ||
    exercise.type === 'sentence_puzzle' ||
    exercise.type === 'fill_choice' ||
    (exercise.type === 'fill_text' && exercise.answerFormat === 'full_sentence')
  )
}

function matchesCoinForgivenessBaseGuard(params: CoinForgivenessGuardParams): boolean {
  if (!params.hasErrorOnStep) return false
  if (params.status !== 'feedback') return false
  if (!isCoinForgivenessStep(params.stepNumber)) return false
  if (!isCoinForgivenessExercise(params.exercise)) return false
  if (params.exerciseErrors !== 1) return false
  return true
}

export function canShowActiveCoinForgivenessButton(params: CoinForgivenessGuardParams): boolean {
  if (params.forgivenessUsedThisRun) return false
  return matchesCoinForgivenessBaseGuard(params)
}

/** Достаточно ли монет для списания (при 0 - позже отдельный путь монетизации). */
export function canSpendCoinsForForgiveness(coinBalance: number): boolean {
  return coinBalance >= COIN_ERROR_FORGIVENESS_COST
}

export function canShowExhaustedCoinForgivenessButton(params: CoinForgivenessGuardParams): boolean {
  if (!params.forgivenessUsedThisRun) return false
  return matchesCoinForgivenessBaseGuard(params)
}

export function canShowFrozenCoinForgivenessButton(params: CoinForgivenessGuardParams): boolean {
  if (params.forgivenessUsedThisRun) return false
  if (!params.forgivenessConfirmPending && !params.forgivenessAppliedAckActive) return false
  return matchesCoinForgivenessBaseGuard(params)
}

export function resolveCoinForgivenessBubbleMode(
  params: CoinForgivenessGuardParams
): 'active' | 'frozen' | 'exhausted' | null {
  if (canShowExhaustedCoinForgivenessButton(params)) return 'exhausted'
  if (canShowFrozenCoinForgivenessButton(params)) return 'frozen'
  if (canShowActiveCoinForgivenessButton(params)) return 'active'
  return null
}

/** @deprecated Используйте canShowActiveCoinForgivenessButton */
export function canOfferCoinErrorForgiveness(params: {
  stepNumber: number
  exercise: Exercise | null | undefined
  hasErrorOnStep: boolean
  forgivenessUsedThisRun: boolean
  status: CoinForgivenessLessonStatus
}): boolean {
  return canShowActiveCoinForgivenessButton({
    ...params,
    forgivenessConfirmPending: false,
    exerciseErrors: 1,
    coinBalance: COIN_ERROR_FORGIVENESS_COST,
  })
}
