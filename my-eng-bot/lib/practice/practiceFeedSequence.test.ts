import { describe, expect, it } from 'vitest'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import { PRACTICE_CHECKING_MESSAGE } from '@/lib/practice/practiceAnswerPanelLock'
import type { PracticeSession } from '@/types/practice'

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 's1',
    mode: 'reference',
    topic: 'Знакомство',
    status: 'active',
    currentIndex: 0,
    questions: [
      {
        id: 'q1',
        type: 'choice',
        prompt: 'Какой ответ подойдет?',
        targetAnswer: "I'm happy.",
        options: ["I'm happy.", "I'm exhausted."],
      },
    ],
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
    ...overrides,
  }
}

function messageKinds(messages: ReturnType<typeof buildPracticeFeedMessages>): string[] {
  return messages.map((message) => {
    if (message.kind === 'lesson') return 'lesson'
    if (message.kind === 'answer') return `answer:${message.text}`
    if (message.tone === 'service') return `service:${message.text}`
    return `feedback:${message.text}`
  })
}

describe('buildPracticeFeedMessages sequence', () => {
  it('active: only question card', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'active',
      audience: 'adult',
    })
    expect(messageKinds(messages)).toEqual(['lesson'])
  })

  it('submitting: question + pending answer', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'submitting',
      audience: 'adult',
      pendingAnswer: "I'm happy.",
    })
    expect(messageKinds(messages)).toEqual(['lesson', "answer:I'm happy."])
  })

  it('checking: question + pending answer + checking status', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: "I'm happy.",
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:I'm happy.",
      `service:${PRACTICE_CHECKING_MESSAGE}`,
    ])
  })

  it('success feedback: question stays + answer + success feedback in status slot', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        answers: [
          {
            questionId: 'q1',
            userAnswer: "I'm happy.",
            isCorrect: true,
            corrected: false,
            correctAnswer: "I'm happy.",
            feedbackMessage: 'Верно. Хороший ответ.',
            feedbackTone: 'success',
            xpEarned: 5,
            timestamp: 1,
          },
        ],
      }),
      state: 'feedback',
      audience: 'adult',
      feedbackType: 'success',
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:I'm happy.",
      'feedback:Верно. Хороший ответ.',
    ])
  })

  it('error correction: question stays + answer + error feedback', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        answers: [
          {
            questionId: 'q1',
            userAnswer: "I'm exhausted.",
            isCorrect: false,
            corrected: false,
            correctAnswer: "I'm happy.",
            feedbackMessage: 'Почти. Правильно: I\'m happy.',
            feedbackTone: 'error',
            xpEarned: 0,
            timestamp: 1,
          },
        ],
      }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })
    expect(messageKinds(messages)[0]).toBe('lesson')
    expect(messageKinds(messages)).toContain("answer:I'm exhausted.")
  })
})
