import { describe, expect, it } from 'vitest'
import {
  buildLessonAnswerMessageId,
  resolveLessonAnswerAttemptNumber,
} from '@/lib/lessonFeedAnswerId'
import type { LessonTimelineEntry } from '@/hooks/useLessonEngine'

function entry(
  overrides: Partial<LessonTimelineEntry> & Pick<LessonTimelineEntry, 'isCurrent'>
): LessonTimelineEntry {
  return {
    stepIndex: 0,
    submittedAnswer: null,
    feedback: null,
    step: {
      stepNumber: 3,
      bubbles: [],
      exercise: { type: 'fill_choice', correctAnswer: 'x', options: ['x'] },
    } as LessonTimelineEntry['step'],
    ...overrides,
  }
}

describe('lessonFeedAnswerId', () => {
  it('keeps the same id for current checking and history feedback on first try', () => {
    const currentChecking = entry({ isCurrent: true, submittedAnswer: "I'm happy." })
    const historyFeedback = entry({
      isCurrent: false,
      submittedAnswer: "I'm happy.",
      feedback: { type: 'error', message: 'Почти.' },
    })
    const timeline = [historyFeedback, currentChecking]

    const checkingAttempt = resolveLessonAnswerAttemptNumber({
      entry: currentChecking,
      historyAttemptOrdinal: 0,
      timeline: [currentChecking],
    })
    const historyAttempt = resolveLessonAnswerAttemptNumber({
      entry: historyFeedback,
      historyAttemptOrdinal: 1,
      timeline,
    })

    expect(buildLessonAnswerMessageId(3, checkingAttempt)).toBe('answer-step-3-try-1')
    expect(buildLessonAnswerMessageId(3, historyAttempt)).toBe('answer-step-3-try-1')
  })

  it('increments attempt number on retry', () => {
    const firstHistory = entry({
      isCurrent: false,
      submittedAnswer: 'wrong',
      feedback: { type: 'error', message: 'Почти.' },
    })
    const currentChecking = entry({ isCurrent: true, submittedAnswer: "I'm happy." })
    const timeline = [firstHistory, currentChecking]

    const retryAttempt = resolveLessonAnswerAttemptNumber({
      entry: currentChecking,
      historyAttemptOrdinal: 0,
      timeline,
    })

    expect(buildLessonAnswerMessageId(3, retryAttempt)).toBe('answer-step-3-try-2')
  })
})
