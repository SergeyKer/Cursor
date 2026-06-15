import { describe, expect, it } from 'vitest'
import {
  canShowActiveCoinForgivenessButton,
  canShowExhaustedCoinForgivenessButton,
  canSpendCoinsForForgiveness,
  COIN_ERROR_FORGIVENESS_COST,
  isCoinForgivenessStep,
  resolveCoinForgivenessAppliedPreviewAnswer,
  resolveCoinForgivenessBubbleMode,
} from './lessonCoinForgiveness'
import type { Exercise } from '@/types/lesson'

const baseGuardParams = {
  hasErrorOnStep: true,
  forgivenessUsedThisRun: false,
  forgivenessConfirmPending: false,
  forgivenessAppliedAckActive: false,
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

  it('stays active after closing confirm without spending', () => {
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
      })
    ).toBe('active')
    expect(
      resolveCoinForgivenessBubbleMode({
        ...baseGuardParams,
        stepNumber: 6,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        forgivenessConfirmPending: true,
      })
    ).toBe('frozen')
    expect(
      resolveCoinForgivenessBubbleMode({
        ...baseGuardParams,
        stepNumber: 6,
        exercise: {
          type: 'translate',
          question: 'Q',
          correctAnswer: 'Hi.',
          answerFormat: 'full_sentence',
        },
        forgivenessConfirmPending: false,
      })
    ).toBe('active')
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

  it('freezes bubble during applied ack', () => {
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
        forgivenessAppliedAckActive: true,
      })
    ).toBe('frozen')
  })
})

describe('resolveCoinForgivenessAppliedPreviewAnswer', () => {
  it('returns active exercise answer for translate', () => {
    expect(
      resolveCoinForgivenessAppliedPreviewAnswer(
        { type: 'translate', question: 'Q', correctAnswer: "I'm happy." } as Exercise,
        0,
        "I'm happy."
      )
    ).toBe("I'm happy.")
  })

  it('returns current puzzle sub answer', () => {
    expect(
      resolveCoinForgivenessAppliedPreviewAnswer(
        {
          type: 'sentence_puzzle',
          question: 'Q',
          puzzleVariants: [
            { correctAnswer: 'Sub one.', correctOrder: ['Sub', 'one'], title: '1', instruction: '', errorText: '', hintText: '', words: [] },
            { correctAnswer: 'Sub two.', correctOrder: ['Sub', 'two'], title: '2', instruction: '', errorText: '', hintText: '', words: [] },
            { correctAnswer: 'Sub three.', correctOrder: ['Sub', 'three'], title: '3', instruction: '', errorText: '', hintText: '', words: [] },
          ],
        } as Exercise,
        1,
        'Sub one.'
      )
    ).toBe('Sub two.')
  })
})
