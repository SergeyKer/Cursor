import { describe, expect, it } from 'vitest'
import { buildActiveStepTimeline, type LessonTimelineEntry } from '@/hooks/useLessonEngine'
import { buildLessonFeedMessages } from '@/lib/buildLessonFeedMessages'
import { LESSON_CHECKING_MESSAGE } from '@/lib/lessonAnswerPanelLock'
import type { LessonData } from '@/types/lesson'

function makePuzzleStep(stepNumber = 5): LessonData['steps'][number] {
  return {
    stepNumber,
    bubbles: [{ type: 'task', content: 'Соберите предложение.' }],
    exercise: { type: 'sentence_puzzle', correctAnswer: "I'm happy." },
  } as LessonData['steps'][number]
}

function makeTimelineEntry(
  overrides: Partial<LessonTimelineEntry> & Pick<LessonTimelineEntry, 'isCurrent'>
): LessonTimelineEntry {
  return {
    stepIndex: 4,
    submittedAnswer: null,
    feedback: null,
    step: makePuzzleStep(),
    ...overrides,
  }
}

function messageTexts(messages: ReturnType<typeof buildLessonFeedMessages>): string[] {
  return messages.map((message) => {
    if (message.kind === 'lesson') return 'lesson'
    if (message.kind === 'answer') return `answer:${message.text}`
    return `${message.tone}:${message.text}`
  })
}

function buildPuzzleTimeline(params: {
  currentSubmittedAnswer?: string | null
  currentFeedback?: LessonTimelineEntry['feedback']
  attempts?: Array<Pick<LessonTimelineEntry, 'submittedAnswer' | 'feedback'>>
  status: 'idle' | 'checking' | 'feedback'
}): LessonTimelineEntry[] {
  const currentEntry: LessonTimelineEntry = {
    stepIndex: 4,
    submittedAnswer: params.currentSubmittedAnswer ?? null,
    feedback: params.currentFeedback ?? null,
    isCurrent: true,
    step: makePuzzleStep(),
  }
  const attemptEntries: LessonTimelineEntry[] = (params.attempts ?? []).map((attempt) => ({
    stepIndex: 4,
    submittedAnswer: attempt.submittedAnswer ?? null,
    feedback: attempt.feedback ?? null,
    isCurrent: false,
    step: makePuzzleStep(),
  }))

  return buildActiveStepTimeline([], currentEntry, attemptEntries, 'sentence_puzzle')
}

describe('buildLessonFeedMessages — sentence_puzzle order', () => {
  it('sub-puzzle 1 checking: checking is the tail message', () => {
    const timeline = buildPuzzleTimeline({
      currentSubmittedAnswer: "I'm happy",
      status: 'checking',
    })

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.at(-1)?.kind).toBe('status')
    expect(messages.at(-1)).toMatchObject({
      kind: 'status',
      text: LESSON_CHECKING_MESSAGE,
      tone: 'service',
    })
    expect(messageTexts(messages)).toEqual([
      'lesson',
      "answer:I'm happy",
      `service:${LESSON_CHECKING_MESSAGE}`,
    ])
  })

  it('sub-puzzle 2 checking: checking follows history, not buried above it', () => {
    const timeline = buildPuzzleTimeline({
      currentSubmittedAnswer: 'I am from Russia',
      status: 'checking',
      attempts: [
        {
          submittedAnswer: "I'm happy",
          feedback: { type: 'success', message: 'Верно.' },
        },
      ],
    })

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.at(-1)).toMatchObject({
      kind: 'status',
      text: LESSON_CHECKING_MESSAGE,
      tone: 'service',
    })
    expect(messageTexts(messages)).toEqual([
      'lesson',
      "answer:I'm happy",
      'success:🟢 Верно.',
      'answer:I am from Russia',
      `service:${LESSON_CHECKING_MESSAGE}`,
    ])
  })

  it('sub-puzzle 2 error retry checking: checking stays after prior attempts', () => {
    const timeline = buildPuzzleTimeline({
      currentSubmittedAnswer: 'from I am Russia',
      status: 'checking',
      attempts: [
        {
          submittedAnswer: "I'm happy",
          feedback: { type: 'success', message: 'Верно.' },
        },
        {
          submittedAnswer: 'Russia I am from',
          feedback: { type: 'error', message: 'Порядок неверный. Попробуйте ещё раз.' },
        },
      ],
    })

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.at(-1)?.text).toBe(LESSON_CHECKING_MESSAGE)
    expect(messageTexts(messages).at(-2)).toBe('answer:from I am Russia')
  })

  it('sub-puzzle 3 completion feedback from history stays at tail', () => {
    const timeline = buildPuzzleTimeline({
      currentSubmittedAnswer: null,
      status: 'feedback',
      attempts: [
        {
          submittedAnswer: "I'm happy",
          feedback: { type: 'success', message: 'Верно.' },
        },
        {
          submittedAnswer: 'I am from Russia',
          feedback: { type: 'success', message: 'Верно.' },
        },
        {
          submittedAnswer: 'I am a student',
          feedback: { type: 'success', message: 'Все три предложения собраны.' },
        },
      ],
    })

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'feedback',
      latestFeedbackType: 'success',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.at(-1)).toMatchObject({
      kind: 'status',
      tone: 'success',
      text: '🟢 Все три предложения собраны.',
    })
  })
})

describe('buildLessonFeedMessages — non-puzzle regression', () => {
  it('keeps attempts before current entry for fill_text steps', () => {
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      submittedAnswer: 'Russia',
      step: {
        stepNumber: 3,
        bubbles: [{ type: 'task', content: 'Задание 2' }],
        exercise: { type: 'fill_text', correctAnswer: 'Russia' },
      } as LessonData['steps'][number],
    })
    const attemptEntry = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: 'Moscow',
      feedback: { type: 'error', message: 'Почти. Попробуйте ещё раз.' },
      step: currentEntry.step,
    })
    const timeline = buildActiveStepTimeline([], currentEntry, [attemptEntry], 'fill_text')

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messageTexts(messages)).toEqual([
      'lesson',
      'answer:Moscow',
      'error:🟡 Почти. Попробуйте ещё раз.',
      'answer:Russia',
      `service:${LESSON_CHECKING_MESSAGE}`,
    ])
  })

  it('shows lesson card for each multi-variant success in history', () => {
    const variantOneStep = {
      stepNumber: 3,
      stepType: 'exercise' as const,
      bubbles: [{ type: 'task' as const, content: 'Задание 1' }],
      exercise: {
        type: 'fill_text' as const,
        question: 'Переведите: "Я из России."',
        correctAnswer: 'Russia',
        variants: [
          { id: 'v1', question: 'Переведите: "Я из России."', correctAnswer: 'Russia' },
          { id: 'v2', question: 'Переведите: "Я из Москвы."', correctAnswer: 'Moscow' },
          { id: 'v3', question: 'Переведите: "Я из Питера."', correctAnswer: 'Petersburg' },
        ],
      },
    } as LessonData['steps'][number]

    const currentEntry: LessonTimelineEntry = {
      stepIndex: 2,
      submittedAnswer: null,
      feedback: null,
      isCurrent: true,
      step: {
        ...variantOneStep,
        exercise: {
          ...variantOneStep.exercise!,
          question: 'Переведите: "Я из Питера."',
          correctAnswer: 'Petersburg',
          currentVariantIndex: 2,
        },
      },
    }

    const attemptEntries: LessonTimelineEntry[] = [
      {
        stepIndex: 2,
        submittedAnswer: 'Russia',
        feedback: { type: 'success', message: 'Верно. Следующий вариант (2 из 3).' },
        isCurrent: false,
        step: {
          ...variantOneStep,
          exercise: {
            ...variantOneStep.exercise!,
            question: 'Переведите: "Я из России."',
            correctAnswer: 'Russia',
            currentVariantIndex: 0,
          },
        },
      },
      {
        stepIndex: 2,
        submittedAnswer: 'Moscow',
        feedback: { type: 'success', message: 'Верно. Следующий вариант (3 из 3).' },
        isCurrent: false,
        step: {
          ...variantOneStep,
          exercise: {
            ...variantOneStep.exercise!,
            question: 'Переведите: "Я из Москвы."',
            correctAnswer: 'Moscow',
            currentVariantIndex: 1,
          },
        },
      },
    ]

    const timeline = buildActiveStepTimeline([], currentEntry, attemptEntries, 'fill_text')
    const messages = buildLessonFeedMessages({
      timeline,
      status: 'idle',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.filter((message) => message.kind === 'lesson')).toHaveLength(3)
    expect(messageTexts(messages)).toEqual([
      'lesson',
      'answer:Russia',
      'success:🟢 Верно. Следующий вариант (2 из 3).',
      'lesson',
      'answer:Moscow',
      'success:🟢 Верно. Следующий вариант (3 из 3).',
      'lesson',
    ])
  })

  it('keeps current lesson card visible while checking a new variant', () => {
    const variantOneStep = {
      stepNumber: 3,
      stepType: 'exercise' as const,
      bubbles: [{ type: 'task' as const, content: 'Задание 1' }],
      exercise: {
        type: 'fill_text' as const,
        question: 'Переведите: "Я из Москвы."',
        correctAnswer: 'Moscow',
        variants: [
          { id: 'v1', question: 'Переведите: "Я из России."', correctAnswer: 'Russia' },
          { id: 'v2', question: 'Переведите: "Я из Москвы."', correctAnswer: 'Moscow' },
        ],
      },
    } as LessonData['steps'][number]

    const currentEntry: LessonTimelineEntry = {
      stepIndex: 2,
      submittedAnswer: 'Moscow',
      feedback: null,
      isCurrent: true,
      step: {
        ...variantOneStep,
        exercise: {
          ...variantOneStep.exercise!,
          question: 'Переведите: "Я из Москвы."',
          correctAnswer: 'Moscow',
          currentVariantIndex: 1,
        },
      },
    }

    const attemptEntries: LessonTimelineEntry[] = [
      {
        stepIndex: 2,
        submittedAnswer: 'Russia',
        feedback: { type: 'success', message: 'Верно. Следующий вариант (2 из 3).' },
        isCurrent: false,
        step: {
          ...variantOneStep,
          exercise: {
            ...variantOneStep.exercise!,
            question: 'Переведите: "Я из России."',
            correctAnswer: 'Russia',
            currentVariantIndex: 0,
          },
        },
      },
    ]

    const timeline = buildActiveStepTimeline([], currentEntry, attemptEntries, 'fill_text')
    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(messages.filter((message) => message.kind === 'lesson')).toHaveLength(2)
    expect(messageTexts(messages)).toEqual([
      'lesson',
      'answer:Russia',
      'success:🟢 Верно. Следующий вариант (2 из 3).',
      'lesson',
      'answer:Moscow',
      `service:${LESSON_CHECKING_MESSAGE}`,
    ])
  })
})

describe('buildLessonFeedMessages — success advance', () => {
  it('hides current lesson card during success feedback without placeholder gap', () => {
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      submittedAnswer: "I'm happy.",
      feedback: { type: 'success', message: 'Верно.' },
      step: {
        stepNumber: 1,
        bubbles: [{ type: 'task', content: 'Step 1' }],
        exercise: {
          type: 'fill_choice',
          options: ["I'm happy.", 'I am a student.', "I'm from Russia."],
          correctAnswer: "I'm happy.",
        },
      } as LessonData['steps'][number],
    })
    const timeline = buildActiveStepTimeline([], currentEntry, [], 'fill_choice')

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'feedback',
      latestFeedbackType: 'success',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: true,
      isAdvancingToNextStep: true,
      isAdvancingToNextVariant: false,
    })

    expect(messages.some((message) => message.kind === 'lesson')).toBe(false)
    expect(messages.some((message) => message.kind === 'status' && message.tone === 'success')).toBe(
      true
    )
  })
})
