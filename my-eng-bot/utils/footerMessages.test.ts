import { describe, expect, it } from 'vitest'
import { getLessonRepeatFooterMessage, getVariantInfo } from '@/utils/footerMessages'
import type { Exercise } from '@/types/lesson'

describe('footerMessages', () => {
  it('returns 1-based variant progress for repeated exercises', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      variants: [
        {
          id: 'v1',
          question: 'Question 1',
          correctAnswer: 'Answer 1',
          acceptedAnswers: ['Answer 1'],
          hint: 'Hint 1',
          difficulty: 'easy',
        },
        {
          id: 'v2',
          question: 'Question 2',
          correctAnswer: 'Answer 2',
          acceptedAnswers: ['Answer 2'],
          hint: 'Hint 2',
          difficulty: 'medium',
        },
        {
          id: 'v3',
          question: 'Question 3',
          correctAnswer: 'Answer 3',
          acceptedAnswers: ['Answer 3'],
          hint: 'Hint 3',
          difficulty: 'hard',
        },
      ],
      currentVariantIndex: 1,
    }

    expect(getVariantInfo(exercise)).toEqual({ current: 2, total: 3 })
  })

  it('builds repeat footer text for intermediate and final variants', () => {
    expect(getLessonRepeatFooterMessage(3, { current: 2, total: 3 })).toBe('Ещё одно! (2 из 3) 🔥')
    expect(getLessonRepeatFooterMessage(4, { current: 3, total: 3 })).toBe('Последнее! (3 из 3)')
  })

  it('does not build repeat footer text outside repeated practice steps', () => {
    expect(getLessonRepeatFooterMessage(2, { current: 1, total: 3 })).toBeNull()
    expect(getVariantInfo(null)).toBeNull()
  })
})
