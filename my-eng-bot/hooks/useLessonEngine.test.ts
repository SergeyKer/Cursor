import { describe, expect, it, vi } from 'vitest'
import {
  buildActiveStepTimeline,
  resolveCoinForgivenessAutofillPatch,
  resolveExerciseForVariant,
  resolveLessonCurrentEntrySubmittedAnswer,
  scheduleLessonCheckingOutcome,
  type LessonTimelineEntry,
} from '@/hooks/useLessonEngine'
import { LESSON_VALIDATION_DELAY_MS } from '@/lib/lessonAnswerPanelLock'
import type { Exercise } from '@/types/lesson'
import type { LessonData } from '@/types/lesson'

function makeTimelineEntry(
  overrides: Partial<LessonTimelineEntry> & Pick<LessonTimelineEntry, 'isCurrent'>
): LessonTimelineEntry {
  const step = {
    stepNumber: 5,
    bubbles: [{ type: 'task' as const, content: 'Финальная сборка' }],
    exercise: { type: 'sentence_puzzle' as const, correctAnswer: "I'm happy." },
  } as LessonData['steps'][number]

  return {
    stepIndex: 4,
    submittedAnswer: null,
    feedback: null,
    step,
    ...overrides,
  }
}

describe('buildActiveStepTimeline', () => {
  it('places lesson card before attempts for sentence_puzzle feed', () => {
    const currentEntry = makeTimelineEntry({ isCurrent: true })
    const attemptEntry = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: "happy I'm",
      feedback: { type: 'error', message: 'Порядок неверный. Попробуйте ещё раз.' },
    })

    const timeline = buildActiveStepTimeline([], currentEntry, [attemptEntry], 'sentence_puzzle')
    const currentIndex = timeline.findIndex((entry) => entry.isCurrent)
    const attemptIndex = timeline.findIndex((entry) => entry.feedback?.type === 'error')

    expect(currentIndex).toBeGreaterThanOrEqual(0)
    expect(attemptIndex).toBeGreaterThan(currentIndex)
  })

  it('places current step after attempts for multi-variant practice steps', () => {
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      step: {
        stepNumber: 3,
        bubbles: [{ type: 'task', content: 'Задание 2' }],
        exercise: { type: 'fill_text', correctAnswer: 'Russia' },
      } as LessonData['steps'][number],
    })
    const attemptEntry = makeTimelineEntry({
      isCurrent: false,
      feedback: { type: 'success', message: 'Верно. Следующий вариант (2 из 3).' },
    })

    const timeline = buildActiveStepTimeline([], currentEntry, [attemptEntry], 'fill_text')
    const currentIndex = timeline.findIndex((entry) => entry.isCurrent)
    const attemptIndex = timeline.findIndex((entry) => entry.feedback?.type === 'success')

    expect(attemptIndex).toBeLessThan(currentIndex)
  })
})

describe('scheduleLessonCheckingOutcome', () => {
  it('defers callback until lesson validation delay elapses', () => {
    vi.useFakeTimers()
    const onAfterDelay = vi.fn()

    scheduleLessonCheckingOutcome(onAfterDelay, (handler, delayMs) => setTimeout(handler, delayMs))

    vi.advanceTimersByTime(LESSON_VALIDATION_DELAY_MS - 1)
    expect(onAfterDelay).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onAfterDelay).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('resolveLessonCurrentEntrySubmittedAnswer', () => {
  it('keeps pending answer in feed during checking after a wrong attempt', () => {
    expect(
      resolveLessonCurrentEntrySubmittedAnswer({
        isFinale: false,
        status: 'checking',
        currentStep: 2,
        hasRenderedAttempts: true,
        submittedAnswersByStep: { 2: 'Russai' },
      })
    ).toBe('Russai')
  })

  it('hides answer on feedback after wrong attempt', () => {
    expect(
      resolveLessonCurrentEntrySubmittedAnswer({
        isFinale: false,
        status: 'feedback',
        currentStep: 2,
        hasRenderedAttempts: true,
        submittedAnswersByStep: { 2: 'Russai' },
      })
    ).toBeNull()
  })

  it('shows first-attempt answer while idle before checking', () => {
    expect(
      resolveLessonCurrentEntrySubmittedAnswer({
        isFinale: false,
        status: 'idle',
        currentStep: 0,
        hasRenderedAttempts: false,
        submittedAnswersByStep: { 0: 'Russia' },
      })
    ).toBe('Russia')
  })
})

describe('resolveExerciseForVariant', () => {
  it('keeps a plain exercise unchanged when there are no variants', () => {
    const exercise: Exercise = {
      type: 'translate',
      question: 'Translate the sentence.',
      correctAnswer: 'Hello.',
      acceptedAnswers: ['Hello.'],
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
    }

    const resolved = resolveExerciseForVariant(exercise, 0)

    expect(resolved?.question).toBe('Translate the sentence.')
    expect(resolved?.correctAnswer).toBe('Hello.')
  })

  it('projects the active variant onto the effective exercise', () => {
    const exercise: Exercise = {
      type: 'fill_choice',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      hint: 'Base hint',
      options: ['Base answer', 'Wrong 1', 'Wrong 2'],
      answerFormat: 'choice',
      answerPolicy: 'strict',
      variants: [
        {
          id: 'v1',
          question: 'Easy question',
          options: ['Easy answer', 'Easy wrong 1', 'Easy wrong 2'],
          correctAnswer: 'Easy answer',
          acceptedAnswers: ['Easy answer'],
          hint: 'Easy hint',
          difficulty: 'easy',
          answerFormat: 'choice',
          answerPolicy: 'strict',
        },
        {
          id: 'v2',
          question: 'Hard question',
          options: ['Hard answer', 'Hard wrong 1', 'Hard wrong 2'],
          correctAnswer: 'Hard answer',
          acceptedAnswers: ['Hard answer'],
          hint: 'Hard hint',
          difficulty: 'hard',
          answerFormat: 'choice',
          answerPolicy: 'strict',
        },
      ],
    }

    const resolved = resolveExerciseForVariant(exercise, 1)

    expect(resolved?.question).toBe('Hard question')
    expect(resolved?.options).toEqual(['Hard answer', 'Hard wrong 1', 'Hard wrong 2'])
    expect(resolved?.correctAnswer).toBe('Hard answer')
    expect(resolved?.hint).toBe('Hard hint')
    expect(resolved?.currentVariantIndex).toBe(1)
  })

  it('falls back to base exercise fields when variant omits optional fields', () => {
    const exercise: Exercise = {
      type: 'fill_choice',
      question: 'Base question',
      correctAnswer: 'Base answer',
      acceptedAnswers: ['Base answer'],
      hint: 'Base hint',
      options: ['Base answer', 'Wrong 1', 'Wrong 2'],
      answerFormat: 'choice',
      answerPolicy: 'strict',
      variants: [
        {
          id: 'v1',
          question: 'Variant question',
          correctAnswer: 'Variant answer',
          hint: 'Variant hint',
          difficulty: 'easy',
        },
      ],
    }

    const resolved = resolveExerciseForVariant(exercise, 0)

    expect(resolved?.question).toBe('Variant question')
    expect(resolved?.options).toEqual(['Base answer', 'Wrong 1', 'Wrong 2'])
    expect(resolved?.acceptedAnswers).toEqual(['Base answer'])
    expect(resolved?.hint).toBe('Variant hint')
    expect(resolved?.currentVariantIndex).toBe(0)
  })
})

describe('resolveCoinForgivenessAutofillPatch', () => {
  it('returns translate answer for translate exercises', () => {
    expect(
      resolveCoinForgivenessAutofillPatch(
        { type: 'translate', correctAnswer: "I'm happy.", question: 'Q' } as Exercise,
        "I'm happy.",
      ),
    ).toEqual({ kind: 'translate', answer: "I'm happy." })
  })

  it('returns fill_choice patch for choice exercises', () => {
    expect(
      resolveCoinForgivenessAutofillPatch(
        {
          type: 'fill_choice',
          correctAnswer: 'Easy answer',
          question: 'Q',
          options: ['Easy answer', 'Wrong'],
        } as Exercise,
        'Easy answer',
      ),
    ).toEqual({ kind: 'fill_choice', choice: 'Easy answer' })
  })

  it('returns puzzle patch without answer text', () => {
    expect(
      resolveCoinForgivenessAutofillPatch(
        { type: 'sentence_puzzle', correctAnswer: "I'm happy.", question: 'Q' } as Exercise,
        undefined,
      ),
    ).toEqual({ kind: 'sentence_puzzle' })
  })

  it('returns null when translate answer is empty', () => {
    expect(
      resolveCoinForgivenessAutofillPatch(
        { type: 'translate', correctAnswer: '', question: 'Q' } as Exercise,
        '',
      ),
    ).toBeNull()
  })
})
