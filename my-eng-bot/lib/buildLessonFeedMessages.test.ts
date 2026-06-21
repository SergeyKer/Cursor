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

describe('buildLessonFeedMessages - sentence_puzzle order', () => {
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

describe('buildLessonFeedMessages - non-puzzle regression', () => {
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

  it('sets repeatAnswer only from second error on the same step', () => {
    const step = {
      stepNumber: 3,
      bubbles: [{ type: 'task', content: 'Задание' }],
      exercise: {
        type: 'fill_text',
        correctAnswer: 'Russia',
        hint: 'После from - одно слово.',
      },
    } as LessonData['steps'][number]

    const firstError = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: 'Moscow',
      feedback: { type: 'error', message: 'После from - одно слово.' },
      step,
    })
    const secondError = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: 'Rus',
      feedback: { type: 'error', message: 'После from - одно слово.' },
      step,
    })
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      submittedAnswer: 'R',
      step,
    })
    const timeline = buildActiveStepTimeline([], currentEntry, [firstError, secondError], 'fill_text')

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'checking',
      showCheckingStatusLine: true,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    const errorMessages = messages.filter(
      (message): message is Extract<(typeof messages)[number], { kind: 'status'; tone: 'error' }> =>
        message.kind === 'status' && message.tone === 'error'
    )
    expect(errorMessages).toHaveLength(2)
    expect(errorMessages[0]?.repeatAnswer).toBeUndefined()
    expect(errorMessages[1]).toMatchObject({
      repeatAnswer: 'Russia',
      text: '🟡 После from - одно слово.',
    })
  })

  it('omits repeatAnswer on first error after success on another variant of the same step', () => {
    const step = {
      stepNumber: 3,
      bubbles: [{ type: 'task', content: 'Задание' }],
      exercise: {
        type: 'fill_text',
        correctAnswer: 'Russia',
        hint: 'Одно слово после from - как Russia или France.',
      },
    } as LessonData['steps'][number]

    const variantSuccess = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: 'Russia',
      feedback: { type: 'success', message: 'Верно. Следующий вариант (2 из 3).' },
      step,
    })
    const firstErrorOnNextVariant = makeTimelineEntry({
      isCurrent: false,
      submittedAnswer: 'Rus',
      feedback: { type: 'error', message: 'Одно слово после from - как Russia или France.' },
      step,
    })
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      submittedAnswer: null,
      feedback: null,
      step,
    })
    const timeline = buildActiveStepTimeline(
      [],
      currentEntry,
      [variantSuccess, firstErrorOnNextVariant],
      'fill_text'
    )

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'feedback',
      latestFeedbackType: 'error',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    const errorMessages = messages.filter(
      (message): message is Extract<(typeof messages)[number], { kind: 'status'; tone: 'error' }> =>
        message.kind === 'status' && message.tone === 'error'
    )
    expect(errorMessages).toHaveLength(1)
    expect(errorMessages[0]?.repeatAnswer).toBeUndefined()
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

describe('buildLessonFeedMessages - success advance', () => {
  it('omits empty current lesson shell during success feedback advance', () => {
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      stepIndex: 0,
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

    const currentLesson = messages.find(
      (message) => message.kind === 'lesson' && !message.isHistorical
    )
    expect(currentLesson).toBeUndefined()
    const feedbackIndex = messages.findIndex(
      (message) => message.kind === 'status' && message.tone === 'success'
    )
    expect(feedbackIndex).toBeGreaterThanOrEqual(0)
    expect(messages.findIndex((message) => message.id === 'lesson-1-0-current')).toBe(-1)
  })

  it('omits current lesson row when success attempt is already in history', () => {
    const currentEntry = makeTimelineEntry({
      isCurrent: true,
      stepIndex: 0,
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
    const historyAttempt = {
      stepIndex: 0,
      submittedAnswer: "I'm happy.",
      feedback: { type: 'success', message: 'Верно.' },
      isCurrent: false,
      step: currentEntry.step,
    }
    const timeline = buildActiveStepTimeline([], currentEntry, [historyAttempt], 'fill_choice')

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'feedback',
      latestFeedbackType: 'success',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(
      messages.some((message) => message.kind === 'lesson' && !message.isHistorical)
    ).toBe(false)
    expect(messages.some((message) => message.kind === 'status' && message.tone === 'success')).toBe(
      true
    )
    expect(
      messages.some(
        (message) => message.kind === 'lesson' && message.id === 'lesson-1-0-0-history'
      )
    ).toBe(true)
  })

  it('keeps historical lesson card visible after step completes', () => {
    const step2 = {
      stepNumber: 2,
      bubbles: [{ type: 'task', content: 'Step 2' }],
      exercise: {
        type: 'fill_choice',
        options: ['a', 'an', 'the'],
        correctAnswer: 'a',
      },
    } as LessonData['steps'][number]
    const step3 = {
      stepNumber: 3,
      bubbles: [{ type: 'task', content: 'Step 3' }],
      exercise: {
        type: 'fill_choice',
        options: ['a', 'an', 'the'],
        correctAnswer: 'an',
      },
    } as LessonData['steps'][number]

    const timeline: LessonTimelineEntry[] = [
      {
        stepIndex: 1,
        submittedAnswer: 'a',
        feedback: { type: 'success', message: 'Верно. Шаг 2 из 7.' },
        isCurrent: false,
        step: step2,
      },
      {
        stepIndex: 2,
        submittedAnswer: null,
        feedback: null,
        isCurrent: true,
        step: step3,
      },
    ]

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'idle',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    const historyLesson = messages.find(
      (message) => message.kind === 'lesson' && message.isHistorical && message.id.startsWith('lesson-2-')
    )

    expect(historyLesson?.bubbles.length).toBeGreaterThan(0)
    const feedbackIndex = messages.findIndex(
      (message) => message.kind === 'status' && message.text.includes('Шаг 2 из 7')
    )
    const historyLessonIndex = messages.findIndex((message) => message.id === historyLesson?.id)
    expect(historyLessonIndex).toBeGreaterThanOrEqual(0)
    expect(historyLessonIndex).toBeLessThan(feedbackIndex)
  })

  it('omits empty current lesson shell during success feedback when attempt is in history', () => {
    const step1 = {
      stepNumber: 1,
      bubbles: [{ type: 'task', content: 'Step 1' }],
      exercise: {
        type: 'fill_choice',
        options: ["I'm happy.", 'I am a student.'],
        correctAnswer: "I'm happy.",
      },
    } as LessonData['steps'][number]

    const timeline: LessonTimelineEntry[] = [
      {
        stepIndex: 0,
        submittedAnswer: "I'm happy.",
        feedback: { type: 'success', message: 'Верно. Шаг 1 из 7.' },
        isCurrent: false,
        step: step1,
      },
      {
        stepIndex: 0,
        submittedAnswer: null,
        feedback: null,
        isCurrent: true,
        step: step1,
      },
    ]

    const messages = buildLessonFeedMessages({
      timeline,
      status: 'feedback',
      latestFeedbackType: 'success',
      showCheckingStatusLine: false,
      showAdvancingStatusLine: false,
      isAdvancingToNextStep: false,
      isAdvancingToNextVariant: false,
    })

    expect(
      messages.some((message) => message.kind === 'lesson' && !message.isHistorical)
    ).toBe(false)
    const successIndex = messages.findIndex(
      (message) => message.kind === 'status' && message.tone === 'success'
    )
    expect(successIndex).toBeGreaterThanOrEqual(0)
    expect(
      messages.findIndex((message) => message.id === 'lesson-1-0-current')
    ).toBe(-1)
  })
})
