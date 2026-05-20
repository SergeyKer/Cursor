import { describe, expect, it } from 'vitest'
import { formatLessonErrorFeedback } from '@/lib/lessonFeedbackMessage'

describe('formatLessonErrorFeedback', () => {
  it('returns hint only on first error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from — одно слово.',
        correctAnswer: 'Russia',
        exerciseErrors: 1,
      })
    ).toBe('После from — одно слово.')
  })

  it('appends Скажи line from second error', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'После from — одно слово.',
        correctAnswer: 'Russia',
        exerciseErrors: 2,
      })
    ).toBe('После from — одно слово.\nСкажи: Russia')
  })

  it('skips Скажи when correct answer is empty', () => {
    expect(
      formatLessonErrorFeedback({
        message: 'Почти.',
        correctAnswer: '  ',
        exerciseErrors: 3,
      })
    ).toBe('Почти.')
  })
})
