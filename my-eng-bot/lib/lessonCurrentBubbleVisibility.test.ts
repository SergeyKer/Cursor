import { describe, expect, it } from 'vitest'
import type { LessonTimelineEntry } from '@/hooks/useLessonEngine'
import {
  hasHistoricalAttemptsForCurrentStep,
  shouldHideCurrentLessonBubbles,
  shouldSkipRepeatHistoryLessonBubble,
} from '@/lib/lessonCurrentBubbleVisibility'

function makeEntry(overrides: Partial<LessonTimelineEntry> & Pick<LessonTimelineEntry, 'isCurrent'>): LessonTimelineEntry {
  return {
    stepIndex: 0,
    submittedAnswer: null,
    feedback: null,
    step: {
      stepNumber: 1,
      stepType: 'exercise',
      bubbles: [
        { type: 'positive', content: 'Intro' },
        { type: 'info', content: 'Rule' },
        { type: 'task', content: 'Task' },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Pick one',
        options: ['A', 'B'],
        correctAnswer: 'A',
      },
    },
    ...overrides,
  }
}

describe('shouldHideCurrentLessonBubbles', () => {
  it('hides current bubbles on first error when history attempt exists', () => {
    const current = makeEntry({ isCurrent: true })
    const history = makeEntry({
      isCurrent: false,
      submittedAnswer: 'B',
      feedback: { type: 'error', message: 'Почти.' },
    })
    const timeline = [history, current]

    expect(hasHistoricalAttemptsForCurrentStep(timeline, current)).toBe(true)
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'feedback',
        latestFeedbackType: 'error',
        hasHistoricalAttemptsForCurrentStep: true,
      }),
    ).toBe(true)
  })

  it('hides current bubbles on success feedback', () => {
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'feedback',
        latestFeedbackType: 'success',
        hasHistoricalAttemptsForCurrentStep: false,
      }),
    ).toBe(true)
  })

  it('hides current bubbles during checking on retry after an error', () => {
    const current = makeEntry({ isCurrent: true })
    const history = makeEntry({
      isCurrent: false,
      submittedAnswer: 'B',
      feedback: { type: 'error', message: 'Почти.' },
    })
    const timeline = [history, current]

    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'checking',
        latestFeedbackType: undefined,
        hasHistoricalAttemptsForCurrentStep: hasHistoricalAttemptsForCurrentStep(timeline, current),
      }),
    ).toBe(true)
  })

  it('does not hide current bubbles before any attempt (idle, no history)', () => {
    const current = makeEntry({ isCurrent: true })
    const timeline = [current]

    expect(hasHistoricalAttemptsForCurrentStep(timeline, current)).toBe(false)
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'idle',
        latestFeedbackType: undefined,
        hasHistoricalAttemptsForCurrentStep: false,
      }),
    ).toBe(false)
  })

  it('keeps current bubbles visible during first-attempt checking', () => {
    const current = makeEntry({ isCurrent: true })
    const timeline = [current]

    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'checking',
        latestFeedbackType: undefined,
        hasHistoricalAttemptsForCurrentStep: false,
      }),
    ).toBe(false)
  })

  it('skips lesson bubble in history from the second attempt onward', () => {
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: false,
        historyAttemptOrdinal: 1,
      }),
    ).toBe(false)
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: false,
        historyAttemptOrdinal: 2,
      }),
    ).toBe(true)
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: true,
        historyAttemptOrdinal: 2,
      }),
    ).toBe(false)
  })

  it('does not hide puzzle step current bubbles', () => {
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: true,
        isCurrent: true,
        status: 'feedback',
        latestFeedbackType: 'error',
        hasHistoricalAttemptsForCurrentStep: true,
      }),
    ).toBe(false)
  })
})
