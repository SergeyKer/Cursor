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

function hasConsecutiveUserBubblesWithoutSystemBetween(
  messages: ReturnType<typeof buildPracticeFeedMessages>
): boolean {
  for (let i = 1; i < messages.length; i += 1) {
    const prev = messages[i - 1]
    const current = messages[i]
    if (prev?.kind === 'answer' && current.kind === 'answer') {
      return true
    }
  }
  return false
}

const wrongAttempt1 = {
  questionId: 'q1',
  userAnswer: "It's time to sleep.",
  isCorrect: false,
  corrected: false,
  correctAnswer: "It's dark.",
  feedbackMessage: "🔴 Неверно. Правильно: It's dark.",
  feedbackTone: 'error' as const,
  xpEarned: 0,
  timestamp: 1,
}

const wrongAttempt2 = {
  questionId: 'q1',
  userAnswer: "It's time to sleep.",
  isCorrect: false,
  corrected: false,
  correctAnswer: "It's dark.",
  feedbackMessage: "🔴 Неверно. Попробуйте ещё раз: It's dark.",
  feedbackTone: 'error' as const,
  xpEarned: 0,
  timestamp: 2,
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

  it('correction re-submit submitting: committed answer, feedback, then pending (no user-user pair)', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1] }),
      state: 'submitting',
      audience: 'adult',
      pendingAnswer: "It's time to sleep.",
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:It's time to sleep.",
      "feedback:🔴 Неверно. Правильно: It's dark.",
      "answer:It's time to sleep.",
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
    expect(messages.map((m) => m.id)).toEqual([
      'practice-question-q1',
      'practice-answer-q1-current',
      'practice-status-q1',
      'practice-answer-q1-pending',
    ])
  })

  it('correction re-submit checking: keeps feedback between attempts and adds checking slot', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1] }),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: 'sdsd',
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:It's time to sleep.",
      "feedback:🔴 Неверно. Правильно: It's dark.",
      'answer:sdsd',
      `service:${PRACTICE_CHECKING_MESSAGE}`,
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
    expect(messages.at(-1)?.id).toBe('practice-checking-q1')
    expect(messages.at(-2)?.id).toBe('practice-answer-q1-pending')
  })

  it('correction re-submit committed: one user bubble per attempt with feedback between', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1, wrongAttempt2] }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:It's time to sleep.",
      "feedback:🔴 Неверно. Правильно: It's dark.",
      "answer:It's time to sleep.",
      "feedback:🔴 Неверно. Попробуйте ещё раз: It's dark.",
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
  })
})
