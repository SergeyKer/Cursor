import { describe, expect, it } from 'vitest'
import { formatLessonErrorFeedback } from '@/lib/lessonFeedbackMessage'

describe('formatLessonErrorFeedback', () => {
  it('returns hint only on first error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from — одно слово.',
        correctAnswer: 'Russia',
        attemptNumber: 1,
      })
    ).toEqual({ hint: 'После from — одно слово.' })
  })

  it('includes repeatAnswer from second error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from — одно слово.',
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toEqual({ hint: 'После from — одно слово.', repeatAnswer: 'Russia' })
  })

  it('skips repeatAnswer when correct answer is empty', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'Почти.',
        correctAnswer: '  ',
        attemptNumber: 3,
      })
    ).toEqual({ hint: 'Почти.' })
  })

  it('uses per-attempt number, not global step counter — first attempt stays hint-only even when step has 2+ errors', () => {
    const hint = 'После from — одно слово.'
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 1,
      })
    ).toEqual({ hint })
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toEqual({ hint, repeatAnswer: 'Russia' })
  })
})
