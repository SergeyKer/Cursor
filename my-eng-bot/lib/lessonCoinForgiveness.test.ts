import { describe, expect, it } from 'vitest'
import {
  canOfferCoinErrorForgiveness,
  COIN_ERROR_FORGIVENESS_COST,
  isCoinForgivenessStep,
} from './lessonCoinForgiveness'

describe('lessonCoinForgiveness', () => {
  it('allows steps 4-6 only', () => {
    expect(isCoinForgivenessStep(4)).toBe(true)
    expect(isCoinForgivenessStep(5)).toBe(true)
    expect(isCoinForgivenessStep(6)).toBe(true)
    expect(isCoinForgivenessStep(3)).toBe(false)
    expect(isCoinForgivenessStep(7)).toBe(false)
  })

  it('offers forgiveness after error on translate step 4', () => {
    expect(
      canOfferCoinErrorForgiveness({
        stepNumber: 4,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Who likes music?',
          answerFormat: 'full_sentence',
        },
        hasErrorOnStep: true,
        forgivenessUsedThisRun: false,
        status: 'feedback',
      })
    ).toBe(true)
  })

  it('does not offer on choice step 7', () => {
    expect(
      canOfferCoinErrorForgiveness({
        stepNumber: 7,
        exercise: {
          type: 'fill_choice',
          question: 'Q',
          options: ['a'],
          correctAnswer: 'a',
        },
        hasErrorOnStep: true,
        forgivenessUsedThisRun: false,
        status: 'feedback',
      })
    ).toBe(false)
  })

  it('does not offer twice per run', () => {
    expect(
      canOfferCoinErrorForgiveness({
        stepNumber: 6,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        hasErrorOnStep: true,
        forgivenessUsedThisRun: true,
        status: 'feedback',
      })
    ).toBe(false)
  })

  it('uses 1 coin per forgiveness', () => {
    expect(COIN_ERROR_FORGIVENESS_COST).toBe(1)
  })
})
