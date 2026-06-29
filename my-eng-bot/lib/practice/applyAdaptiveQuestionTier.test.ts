import { describe, expect, it } from 'vitest'
import {
  applyAdaptiveChoiceTier,
  normalizeAdaptiveQuestionInSession,
} from '@/lib/practice/applyAdaptiveQuestionTier'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 's1',
    lessonId: '1',
    topic: 'Test',
    level: 'A2',
    mode: 'challenge',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: '1' },
    status: 'active',
    currentIndex: 9,
    questions: CHALLENGE_STEP_SPECS.map((spec, index) => ({
      id: `q${index}`,
      lessonId: '1',
      type: spec.type,
      prompt: 'Test',
      targetAnswer: "It's cold.",
      options: ["It's cold.", "It's colde.", "It's colds."],
      xpBase: 10,
      difficulty: 2,
      tolerance: 'strict' as const,
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 1,
    instructionAcknowledged: true,
    ...overrides,
  }
}

describe('applyAdaptiveQuestionTier', () => {
  it('returns null without choice-like errors before step 11', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const session = baseSession({ currentIndex: 10 })
    expect(applyAdaptiveChoiceTier(session, 10, lesson!)).toBeNull()
  })

  it('downgrades speed-round options after choice-like error', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const session = baseSession({
      currentIndex: 10,
      answers: [
        {
          questionId: 'q0',
          userAnswer: 'wrong',
          isCorrect: false,
          corrected: false,
          correctAnswer: "It's cold.",
          xpEarned: 0,
          responseTimeMs: 1,
          timestamp: 1,
        },
      ],
    })
    const patched = applyAdaptiveChoiceTier(session, 10, lesson!)
    expect(patched).not.toBeNull()
    expect(patched!.options).toBeDefined()
    expect(patched!.options).not.toEqual(session.questions[10]!.options)
  })

  it('normalizes session when landing on step 11 after increment', () => {
    const session = baseSession({
      currentIndex: 10,
      answers: [
        {
          questionId: 'q2',
          userAnswer: 'wrong',
          isCorrect: false,
          corrected: false,
          correctAnswer: "It's cold.",
          xpEarned: 0,
          responseTimeMs: 1,
          timestamp: 1,
        },
      ],
    })
    const normalized = normalizeAdaptiveQuestionInSession(session)
    expect(normalized.questions[10]?.options).not.toEqual(session.questions[10]?.options)
  })

  it('leaves session unchanged when currentIndex is not 10', () => {
    const session = baseSession({ currentIndex: 5 })
    expect(normalizeAdaptiveQuestionInSession(session)).toBe(session)
  })
})
