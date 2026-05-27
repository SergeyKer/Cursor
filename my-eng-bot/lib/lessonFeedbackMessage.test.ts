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
    ).toBe('После from — одно слово.')
  })

  it('appends Скажи line from second error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from — одно слово.',
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toBe('После from — одно слово.\nСкажи: Russia')
  })

  it('skips Скажи when correct answer is empty', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'Почти.',
        correctAnswer: '  ',
        attemptNumber: 3,
      })
    ).toBe('Почти.')
  })

  it('uses per-attempt number, not global step counter — first attempt stays hint-only even when step has 2+ errors', () => {
    const hint = 'После from — одно слово.'
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 1,
      })
    ).toBe(hint)
    expect(
      formatLessonErrorFeedback({
        message: hint,
        correctAnswer: 'Russia',
        attemptNumber: 2,
      })
    ).toBe(`${hint}\nСкажи: Russia`)
  })
})
