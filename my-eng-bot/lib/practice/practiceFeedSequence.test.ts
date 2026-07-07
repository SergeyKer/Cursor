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
  feedbackMessage: "Неверно. Правильно: It's dark.",
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
  feedbackMessage: "Неверно. Попробуйте ещё раз: It's dark.",
  feedbackTone: 'error' as const,
  xpEarned: 0,
  timestamp: 2,
}

describe('buildPracticeFeedMessages sequence', () => {
  it('briefing: empty feed (intro lives in PracticeBriefingScreen)', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({ instructionAcknowledged: false }),
      state: 'briefing',
      audience: 'adult',
    })
    expect(messages).toEqual([])
  })

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

  it('checking without showCheckingStatusLine: question + pending answer only', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: "I'm happy.",
    })
    expect(messageKinds(messages)).toEqual(['lesson', "answer:I'm happy."])
  })

  it('checking with showCheckingStatusLine: question + pending answer + checking status', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: "I'm happy.",
      showCheckingStatusLine: true,
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:I'm happy.",
      `service:${PRACTICE_CHECKING_MESSAGE}`,
    ])
    expect(messages[1]?.id).toBe('practice-answer-q1-current')
  })

  it('feedback reuses the same answer id as checking pending slot', () => {
    const checking = buildPracticeFeedMessages({
      session: makeSession(),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: "I'm happy.",
      showCheckingStatusLine: true,
    })
    const feedback = buildPracticeFeedMessages({
      session: makeSession({
        answers: [
          {
            questionId: 'q1',
            userAnswer: "I'm happy.",
            isCorrect: true,
            corrected: false,
            correctAnswer: "I'm happy.",
            feedbackMessage: 'Верно.',
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
    expect(checking[1]?.id).toBe(feedback[1]?.id)
    expect(feedback[2]?.id).toBe('practice-feedback-q1-1-0')
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
      'feedback:🟢 Верно. Хороший ответ.',
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
      "feedback:🟡 Неверно. Правильно: It's dark.",
      "answer:It's time to sleep.",
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
    expect(messages.map((m) => m.id)).toEqual([
      'practice-question-q1',
      'practice-answer-q1-current',
      'practice-feedback-q1-1-0',
      'practice-answer-q1-pending',
    ])
  })

  it('correction re-submit checking: keeps feedback between attempts and adds checking slot', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1] }),
      state: 'checking',
      audience: 'adult',
      pendingAnswer: 'sdsd',
      showCheckingStatusLine: true,
    })
    expect(messageKinds(messages)).toEqual([
      'lesson',
      "answer:It's time to sleep.",
      "feedback:🟡 Неверно. Правильно: It's dark.",
      'answer:sdsd',
      `service:${PRACTICE_CHECKING_MESSAGE}`,
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
    expect(messages.at(-1)?.id).toBe('practice-checking-q1')
    expect(messages.at(-2)?.id).toBe('practice-answer-q1-pending')
    expect(messages.find((m) => m.id === 'practice-feedback-q1-1-0')?.text).toBe(
      "🟡 Неверно. Правильно: It's dark."
    )
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
      "feedback:🟡 Неверно. Правильно: It's dark.",
      "answer:It's time to sleep.",
      "feedback:🟡 Неверно. Попробуйте ещё раз: It's dark.",
    ])
    expect(hasConsecutiveUserBubblesWithoutSystemBetween(messages)).toBe(false)
  })

  it('keeps first-attempt feedback id stable when second wrong attempt commits', () => {
    const afterFirstWrong = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1] }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })
    const afterSecondWrong = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1, wrongAttempt2] }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })

    const firstFeedbackId = afterFirstWrong.find((m) => m.tone === 'error')?.id
    const firstFeedbackAfterSecond = afterSecondWrong.find((m) => m.id === firstFeedbackId)

    expect(firstFeedbackId).toBe('practice-feedback-q1-1-0')
    expect(firstFeedbackAfterSecond?.text).toBe("🟡 Неверно. Правильно: It's dark.")
    expect(afterSecondWrong.filter((m) => m.tone === 'error')).toHaveLength(2)
  })

  it('includes repeatAnswer for choice errors on attempts 1 and 2', () => {
    const afterFirstWrong = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1] }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })
    const afterSecondWrong = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1, wrongAttempt2] }),
      state: 'correction',
      audience: 'adult',
      feedbackType: 'error',
    })

    expect(afterFirstWrong.find((m) => m.tone === 'error')?.repeatAnswer).toBe("It's dark.")
    expect(afterSecondWrong.filter((m) => m.tone === 'error').every((m) => m.repeatAnswer === "It's dark.")).toBe(
      true
    )
  })

  it('omits repeatAnswer on third wrong-limit advance', () => {
    const wrongLimit = {
      ...wrongAttempt1,
      timestamp: 3,
      feedbackMessage: "Три раза не вышло - ничего страшного. Правильно: It's dark.",
      feedbackTone: 'success' as const,
    }
    const messages = buildPracticeFeedMessages({
      session: makeSession({ answers: [wrongAttempt1, wrongAttempt2, wrongLimit] }),
      state: 'feedback',
      audience: 'adult',
      feedbackType: 'success',
    })
    const limitFeedback = messages.filter((m) => m.tone === 'success').at(-1)
    expect(limitFeedback?.repeatAnswer).toBeUndefined()
  })

  it('voice-shadow shows neutral info label without pedagogical hint', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        questions: [
          {
            id: 'q1',
            type: 'voice-shadow',
            prompt: 'Repeat the phrase.',
            targetAnswer: "I'm happy.",
            audioText: "I'm happy.",
          },
        ],
      }),
      state: 'active',
      audience: 'adult',
    })
    const lesson = messages.find((message) => message.kind === 'lesson')
    const infoBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'info')
    expect(infoBubble?.content).toMatch(/Прослушайте фразу/i)
  })

  it('voice-shadow keeps info bubble and answer out of task prompt', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        questions: [
          {
            id: 'q1',
            type: 'voice-shadow',
            prompt: 'Ситуация: На улице темно.',
            targetAnswer: "It's dark.",
            audioText: "It's dark.",
            hint: "Начните с It's и добавьте прилагательное.",
          },
        ],
      }),
      state: 'active',
      audience: 'adult',
    })
    const lesson = messages.find((message) => message.kind === 'lesson')
    expect(lesson?.bubbles?.some((bubble) => bubble.type === 'info')).toBe(true)
    const infoBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'info')
    expect(infoBubble?.content).toMatch(/Прослушайте фразу/i)
    expect(infoBubble?.content).not.toMatch(/прилагательн/i)
    const taskBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'task')
    expect(taskBubble?.content).toBe('Ситуация: На улице темно.')
    expect(taskBubble?.content).not.toContain("It's dark")
  })

  it('dictation keeps info instruction and situation-only task prompt', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        questions: [
          {
            id: 'q1',
            type: 'dictation',
            prompt: 'Ситуация: На улице холодно. Прослушайте английскую фразу и запишите её целиком.',
            targetAnswer: "It's cold.",
            audioText: "It's cold.",
          },
        ],
      }),
      state: 'active',
      audience: 'adult',
    })
    const lesson = messages.find((message) => message.kind === 'lesson')
    const infoBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'info')
    expect(infoBubble?.content).toMatch(/Напишите фразу на слух/i)
    const taskBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'task')
    expect(taskBubble?.content).toBe('Ситуация: На улице холодно.')
    expect(taskBubble?.content).not.toMatch(/Прослушайте/i)
  })

  it('listening-select keeps info instruction and situation-only task prompt', () => {
    const messages = buildPracticeFeedMessages({
      session: makeSession({
        questions: [
          {
            id: 'q1',
            type: 'listening-select',
            prompt: 'Ситуация: Ты говоришь, что немного устал после дня. Прослушайте фразу и выберите правильный ответ.',
            targetAnswer: "I'm tired.",
            audioText: "I'm tired.",
            options: ["I'm tired.", "I'm from Spain.", 'I am an engineer.'],
          },
        ],
      }),
      state: 'active',
      audience: 'adult',
    })
    const lesson = messages.find((message) => message.kind === 'lesson')
    const infoBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'info')
    expect(infoBubble?.content).toMatch(/Прослушайте и выберите/i)
    const taskBubble = lesson?.bubbles?.find((bubble) => bubble.type === 'task')
    expect(taskBubble?.content).toBe('Ситуация: Ты говоришь, что немного устал после дня.')
    expect(taskBubble?.content).not.toMatch(/Прослушайте/i)
  })
})
