import { describe, expect, it } from 'vitest'
import type { LessonTimelineEntry } from '@/hooks/useLessonEngine'
import {
  hasHistoricalAttemptsForCurrentStep,
  hasSameTaskPromptHistoryForCurrentStep,
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
  it('hides current bubbles on success feedback', () => {
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: true,
        status: 'feedback',
        latestFeedbackType: 'success',
        hasSameTaskPromptHistory: false,
      }),
    ).toBe(true)
  })

  it('does not hide historical bubbles via current-only helper', () => {
    expect(
      shouldHideCurrentLessonBubbles({
        isPuzzleStep: false,
        isCurrent: false,
        status: 'feedback',
        latestFeedbackType: 'success',
        hasSameTaskPromptHistory: false,
      }),
    ).toBe(false)
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
        hasSameTaskPromptHistory: hasSameTaskPromptHistoryForCurrentStep(timeline, current),
      }),
    ).toBe(true)
  })
})

describe('hasSameTaskPromptHistoryForCurrentStep', () => {
  it('returns false when history used a different task prompt (new variant)', () => {
    const variantStep = {
      stepNumber: 3,
      stepType: 'exercise' as const,
      bubbles: [{ type: 'task' as const, content: 'Задание' }],
      exercise: {
        type: 'fill_text' as const,
        question: 'Переведите: "Я из Москвы."',
        correctAnswer: 'Moscow',
      },
    }
    const history = makeEntry({
      isCurrent: false,
      submittedAnswer: 'Russia',
      feedback: { type: 'success', message: 'Верно. 2 из 3.' },
      step: {
        ...variantStep,
        exercise: {
          ...variantStep.exercise,
          question: 'Переведите: "Я из России."',
          correctAnswer: 'Russia',
        },
      },
    })
    const current = makeEntry({
      isCurrent: true,
      step: variantStep,
    })
    const timeline = [history, current]

    expect(hasHistoricalAttemptsForCurrentStep(timeline, current)).toBe(true)
    expect(hasSameTaskPromptHistoryForCurrentStep(timeline, current)).toBe(false)
  })

  it('returns false before any attempt (idle, no history)', () => {
    const current = makeEntry({ isCurrent: true })
    const timeline = [current]

    expect(hasHistoricalAttemptsForCurrentStep(timeline, current)).toBe(false)
    expect(hasSameTaskPromptHistoryForCurrentStep(timeline, current)).toBe(false)
  })
})

describe('shouldSkipRepeatHistoryLessonBubble', () => {
  it('skips lesson bubble in history when the task prompt repeats on retry', () => {
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: false,
        historyAttemptOrdinal: 1,
        taskPrompt: 'Task A',
        previousHistoryTaskPrompt: null,
      }),
    ).toBe(false)
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: false,
        historyAttemptOrdinal: 2,
        taskPrompt: 'Task A',
        previousHistoryTaskPrompt: 'Task A',
      }),
    ).toBe(true)
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: false,
        historyAttemptOrdinal: 2,
        taskPrompt: 'Task B',
        previousHistoryTaskPrompt: 'Task A',
      }),
    ).toBe(false)
    expect(
      shouldSkipRepeatHistoryLessonBubble({
        isPuzzleStep: false,
        isCurrent: true,
        historyAttemptOrdinal: 2,
        taskPrompt: 'Task A',
        previousHistoryTaskPrompt: 'Task A',
      }),
    ).toBe(false)
  })
})
