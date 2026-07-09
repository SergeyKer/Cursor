import { describe, expect, it } from 'vitest'
import { validatePracticeAnswer } from '@/lib/practice/practiceValidation'
import type { PracticeQuestion } from '@/types/practice'

const baseQuestion: PracticeQuestion = {
  id: 'q1',
  lessonId: '1',
  type: 'free-response',
  prompt: 'Translate.',
  targetAnswer: 'It is time to go.',
  acceptedAnswers: ['It is time to go.', "It's time to go."],
  xpBase: 5,
  difficulty: 1,
  tolerance: 'normalized',
}

describe('validatePracticeAnswer', () => {
  it('accepts normalized learner variants', () => {
    expect(validatePracticeAnswer("it's time to go", baseQuestion)).toBe(true)
  })

  it('uses strict equality for choice chip selection', () => {
    const choiceQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'choice',
      options: ['It is time to go.', 'It time go.'],
      tolerance: 'strict',
    }

    expect(validatePracticeAnswer('it is time to go', choiceQuestion, 'chip')).toBe(true)
    expect(validatePracticeAnswer('it is time go', choiceQuestion, 'chip')).toBe(false)
  })

  it('accepts contraction variants when typing a choice correction', () => {
    const choiceQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'choice',
      targetAnswer: "It's dark.",
      acceptedAnswers: ["It's dark."],
      options: ["It's dark.", "It's time to go.", "It's time to drink."],
      tolerance: 'strict',
    }

    expect(validatePracticeAnswer('It is dark', choiceQuestion, 'typed')).toBe(true)
    expect(validatePracticeAnswer("it's dark", choiceQuestion, 'typed')).toBe(true)
    expect(validatePracticeAnswer("It's time to drink.", choiceQuestion, 'typed')).toBe(false)
  })

  it('accepts roleplay answers with lesson-aware validation', () => {
    const roleplayQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'roleplay-mini',
      targetAnswer: "It's time to go.",
      tolerance: 'soft',
      minWords: 2,
      keywords: ['time', 'to', 'go'],
    }

    expect(validatePracticeAnswer("It's time to go now", roleplayQuestion)).toBe(true)
    expect(validatePracticeAnswer('time', roleplayQuestion)).toBe(false)
  })

  it('accepts normalized translate-backed free-response variants', () => {
    const translateQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'free-response',
      targetAnswer: "I'm fine.",
      acceptedAnswers: ["I'm fine.", 'I am fine.'],
      tolerance: 'normalized',
      keywords: undefined,
    }

    expect(validatePracticeAnswer('I am fine', translateQuestion)).toBe(true)
    expect(validatePracticeAnswer("I'm happy", translateQuestion)).toBe(false)
  })

  it('uses soft pattern for boss primary and exact match for boss correction', () => {
    const bossQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'boss-challenge',
      targetAnswer: "It's time to go home.",
      acceptedAnswers: ["It's time to go home."],
      tolerance: 'soft',
      minWords: 4,
      keywords: ['time to'],
    }

    expect(validatePracticeAnswer('Its time to sleep noww', bossQuestion, 'typed')).toBe(true)
    expect(validatePracticeAnswer("It's time to goes home", bossQuestion, 'typed')).toBe(false)
    expect(validatePracticeAnswer('Its time to sleep noww', bossQuestion, 'correction')).toBe(false)
    expect(validatePracticeAnswer("It's time to go home.", bossQuestion, 'correction')).toBe(true)
  })
})

