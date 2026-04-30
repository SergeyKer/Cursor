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

  it('uses strict equality for choice questions', () => {
    const choiceQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'choice',
      options: ['It is time to go.', 'It time go.'],
      tolerance: 'strict',
    }

    expect(validatePracticeAnswer('it is time to go', choiceQuestion)).toBe(true)
    expect(validatePracticeAnswer('it is time go', choiceQuestion)).toBe(false)
  })

  it('accepts soft free responses by length and keyword', () => {
    const softQuestion: PracticeQuestion = {
      ...baseQuestion,
      type: 'roleplay-mini',
      tolerance: 'soft',
      keywords: ['time'],
      minWords: 3,
    }

    expect(validatePracticeAnswer('I think it is time now', softQuestion)).toBe(true)
    expect(validatePracticeAnswer('time', softQuestion)).toBe(false)
  })
})

