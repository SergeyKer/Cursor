export const PRACTICE_MAX_WRONG_ATTEMPTS = 3

export interface PracticeRetryResolution {
  nextWrongAttemptsOnCurrentQuestion: number
  shouldEnterCorrection: boolean
  shouldAutoAdvanceToNextQuestion: boolean
}

export function resolvePracticeRetryPolicy(params: {
  currentWrongAttemptsOnQuestion: number
  isCorrect: boolean
}): PracticeRetryResolution {
  if (params.isCorrect) {
    return {
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: false,
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
