import type { PracticeEntrySource } from '@/types/practice'

export const PRACTICE_MAX_WRONG_ATTEMPTS = 3

export interface PracticeRetryResolution {
  nextWrongAttemptsOnCurrentQuestion: number
  shouldEnterCorrection: boolean
  shouldAutoAdvanceToNextQuestion: boolean
}

export function resolvePracticeRetryPolicy(params: {
  currentWrongAttemptsOnQuestion: number
  isCorrect: boolean
  /** quick_test: 1 wrong → auto-advance (no correction). */
  entrySource?: PracticeEntrySource
}): PracticeRetryResolution {
  if (params.isCorrect) {
    return {
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: false,
    }
  }

  if (params.entrySource === 'quick_test') {
    return {
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: true,
    }
  }

  const nextWrongAttempts = params.currentWrongAttemptsOnQuestion + 1
  if (nextWrongAttempts >= PRACTICE_MAX_WRONG_ATTEMPTS) {
    return {
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: true,
    }
  }

  return {
    nextWrongAttemptsOnCurrentQuestion: nextWrongAttempts,
    shouldEnterCorrection: true,
    shouldAutoAdvanceToNextQuestion: false,
  }
}
