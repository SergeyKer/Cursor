import { describe, expect, it } from 'vitest'
import { buildPracticeWrongAnswerFeedback } from '@/lib/practice/practiceFeedbackCopy'

describe('buildPracticeWrongAnswerFeedback', () => {
  it('uses the same first-attempt copy for child and adult', () => {
    const expected = "🔴 Неверно. Правильно: It's dark."
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 1,
        audience: 'child',
      })
    ).toBe(expected)
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 1,
        audience: 'adult',
      })
    ).toBe(expected)
  })

  it('uses child phrasing on the second attempt', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
        audience: 'child',
      })
    ).toBe("🔴 Неверно. Давай ещё раз: It's dark.")
  })

  it('uses adult phrasing on the second attempt', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
        audience: 'adult',
      })
    ).toBe("🔴 Неверно. Попробуйте ещё раз: It's dark.")
  })

  it('defaults second attempt to adult phrasing', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "It's dark.",
        attemptNumber: 2,
      })
    ).toBe("🔴 Неверно. Попробуйте ещё раз: It's dark.")
  })

  it('trims the correct answer', () => {
    expect(
      buildPracticeWrongAnswerFeedback({
        correctAnswer: "  It's dark.  ",
        attemptNumber: 1,
      })
    ).toBe("🔴 Неверно. Правильно: It's dark.")
  })
})
