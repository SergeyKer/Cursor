import { describe, expect, it } from 'vitest'
import {
  canShowActiveCoinForgivenessButton,
  canShowExhaustedCoinForgivenessButton,
  canSpendCoinsForForgiveness,
  COIN_ERROR_FORGIVENESS_COST,
  isCoinForgivenessStep,
  resolveCoinForgivenessBubbleMode,
} from './lessonCoinForgiveness'

const baseGuardParams = {
  hasErrorOnStep: true,
  forgivenessUsedThisRun: false,
  forgivenessOfferDeclinedThisRun: false,
  forgivenessConfirmPending: false,
  exerciseErrors: 1,
  status: 'feedback' as const,
  coinBalance: 5,
}

describe('lessonCoinForgiveness', () => {
  it('allows steps 4-7 only', () => {
    expect(isCoinForgivenessStep(4)).toBe(true)
    expect(isCoinForgivenessStep(5)).toBe(true)
    expect(isCoinForgivenessStep(6)).toBe(true)
    expect(isCoinForgivenessStep(7)).toBe(true)
    expect(isCoinForgivenessStep(3)).toBe(false)
    expect(isCoinForgivenessStep(8)).toBe(false)
  })

  it('offers forgiveness after first error on translate step 4', () => {
    expect(
      canShowActiveCoinForgivenessButton({
        ...baseGuardParams,
        stepNumber: 4,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Who likes music?',
          answerFormat: 'full_sentence',
        },
      })
    ).toBe(true)
  })

  it('offers forgiveness on fill_choice step 7', () => {
    expect(
      canShowActiveCoinForgivenessButton({
        ...baseGuardParams,
        stepNumber: 7,
        exercise: {
          type: 'fill_choice',
          question: 'Q',
          options: ['a'],
          correctAnswer: 'a',
        },
      })
    ).toBe(true)
  })

  it('does not offer on second error', () => {
    expect(
      canShowActiveCoinForgivenessButton({
        ...baseGuardParams,
        stepNumber: 6,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        exerciseErrors: 2,
      })
    ).toBe(false)
  })

  it('does not offer twice per run', () => {
    expect(
      canShowActiveCoinForgivenessButton({
        ...baseGuardParams,
        stepNumber: 6,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        forgivenessUsedThisRun: true,
      })
    ).toBe(false)
  })

  it('shows exhausted button after forgiveness was used', () => {
    expect(
      canShowExhaustedCoinForgivenessButton({
        ...baseGuardParams,
        stepNumber: 5,
        exercise: {
          type: 'sentence_puzzle',
          question: 'Q',
          correctAnswer: 'I am happy.',
        },
        forgivenessUsedThisRun: true,
      })
    ).toBe(true)
  })

  it('hides buttons after decline for the run', () => {
    expect(
      resolveCoinForgivenessBubbleMode({
        ...baseGuardParams,
        stepNumber: 4,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        forgivenessOfferDeclinedThisRun: true,
      })
    ).toBeNull()
  })

  it('shows active button with zero coin balance', () => {
    expect(
      canShowActiveCoinForgivenessButton({
        ...baseGuardParams,
        coinBalance: 0,
        stepNumber: 4,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
      })
    ).toBe(true)
    expect(resolveCoinForgivenessBubbleMode({
      ...baseGuardParams,
      coinBalance: 0,
      stepNumber: 4,
      exercise: {
        type: 'translate',
        question: 'Q',
        correctAnswer: 'Hi.',
        answerFormat: 'full_sentence',
      },
    })).toBe('active')
  })

  it('uses 1 coin per forgiveness', () => {
    expect(COIN_ERROR_FORGIVENESS_COST).toBe(1)
    expect(canSpendCoinsForForgiveness(0)).toBe(false)
    expect(canSpendCoinsForForgiveness(1)).toBe(true)
  })
})
