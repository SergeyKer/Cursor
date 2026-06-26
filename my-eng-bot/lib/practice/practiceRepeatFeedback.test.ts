import { describe, expect, it } from 'vitest'
import { resolvePracticeRepeatAnswer } from '@/lib/practice/practiceRepeatFeedback'
import type { PracticeAnswer } from '@/types/practice'

const wrongChoiceAnswer: PracticeAnswer = {
  questionId: 'q1',
  userAnswer: "It's time to sleep.",
  isCorrect: false,
  corrected: false,
  correctAnswer: "It's dark.",
  feedbackTone: 'error',
  xpEarned: 0,
  timestamp: 1,
}

describe('resolvePracticeRepeatAnswer', () => {
  it('returns correct answer for choice errors on attempts 1 and 2', () => {
    expect(
      resolvePracticeRepeatAnswer({
        answer: wrongChoiceAnswer,
        attemptNumber: 1,
        questionType: 'choice',
      })
    ).toBe("It's dark.")
    expect(
      resolvePracticeRepeatAnswer({
        answer: wrongChoiceAnswer,
        attemptNumber: 2,
        questionType: 'choice',
      })
    ).toBe("It's dark.")
  })

  it('returns correct answer for voice-shadow errors on attempts 1 and 2', () => {
    expect(
      resolvePracticeRepeatAnswer({
        answer: wrongChoiceAnswer,
        attemptNumber: 1,
        questionType: 'voice-shadow',
      })
    ).toBe("It's dark.")
  })

  it('skips repeat for other non-voice types', () => {
    expect(
      resolvePracticeRepeatAnswer({
        answer: wrongChoiceAnswer,
        attemptNumber: 1,
        questionType: 'dictation',
      })
    ).toBeUndefined()
  })

  it('skips repeat on third wrong-limit success feedback', () => {
    expect(
      resolvePracticeRepeatAnswer({
        answer: { ...wrongChoiceAnswer, feedbackTone: 'success' },
        attemptNumber: 3,
        questionType: 'choice',
      })
    ).toBeUndefined()
  })

  it('skips repeat for correct answers', () => {
    expect(
      resolvePracticeRepeatAnswer({
        answer: { ...wrongChoiceAnswer, isCorrect: true },
        attemptNumber: 1,
        questionType: 'choice',
      })
    ).toBeUndefined()
  })
})
