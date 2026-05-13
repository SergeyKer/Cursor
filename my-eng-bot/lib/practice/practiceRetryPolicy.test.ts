import { describe, expect, it } from 'vitest'
import { PRACTICE_MAX_WRONG_ATTEMPTS, resolvePracticeRetryPolicy } from '@/lib/practice/practiceRetryPolicy'

describe('resolvePracticeRetryPolicy', () => {
  it('keeps correction mode before wrong-attempt limit', () => {
    const result = resolvePracticeRetryPolicy({
      currentWrongAttemptsOnQuestion: 1,
      isCorrect: false,
    })

    expect(result).toEqual({
      nextWrongAttemptsOnCurrentQuestion: 2,
      shouldEnterCorrection: true,
      shouldAutoAdvanceToNextQuestion: false,
    })
  })

  it('auto-advances after reaching wrong-attempt limit', () => {
    const result = resolvePracticeRetryPolicy({
      currentWrongAttemptsOnQuestion: PRACTICE_MAX_WRONG_ATTEMPTS - 1,
      isCorrect: false,
    })

    expect(result).toEqual({
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: true,
    })
  })

  it('resets wrong attempts on correct answer', () => {
    const result = resolvePracticeRetryPolicy({
      currentWrongAttemptsOnQuestion: 2,
      isCorrect: true,
    })

    expect(result).toEqual({
      nextWrongAttemptsOnCurrentQuestion: 0,
      shouldEnterCorrection: false,
      shouldAutoAdvanceToNextQuestion: false,
    })
  })
})
