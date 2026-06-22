import { describe, expect, it } from 'vitest'
import {
  isPracticeAwaitingAiGeneration,
  normalizePracticeSessionTargetCount,
  resolvePracticeTargetQuestionCount,
} from '@/lib/practice/practiceSessionProgress'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'p1',
    lessonId: '1',
    topic: 'Это / Пора',
    level: 'A1',
    mode: 'reference',
    entrySource: 'menu',
    generationSource: 'ai_generated',
    source: { kind: 'static_lesson', lessonId: '1' },
    status: 'active',
    questions: [
      {
        id: 'q1',
        lessonId: '1',
        type: 'choice',
        prompt: 'Test',
        targetAnswer: 'A',
        acceptedAnswers: ['A'],
        xpBase: 5,
        difficulty: 1,
        tolerance: 'normalized',
      },
    ],
    currentIndex: 0,
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 1,
    instructionAcknowledged: false,
    ...overrides,
  }
}

describe('resolvePracticeTargetQuestionCount', () => {
  it('uses targetQuestionCount when present', () => {
    expect(resolvePracticeTargetQuestionCount(baseSession({ targetQuestionCount: 7 }))).toBe(7)
  })

  it('falls back to mode plan length when targetQuestionCount is missing', () => {
    expect(resolvePracticeTargetQuestionCount(baseSession({ targetQuestionCount: undefined }))).toBe(7)
    expect(resolvePracticeTargetQuestionCount(baseSession({ mode: 'relaxed', targetQuestionCount: undefined }))).toBe(6)
  })
})

describe('isPracticeAwaitingAiGeneration', () => {
  it('returns true for reference AI session on last loaded question before target', () => {
    expect(
      isPracticeAwaitingAiGeneration(
        baseSession({
          targetQuestionCount: 7,
          questions: [baseSession().questions[0]!],
          currentIndex: 0,
        })
      )
    ).toBe(true)
  })

  it('returns false when all target questions are loaded', () => {
    const questions = Array.from({ length: 7 }, (_, index) => ({
      ...baseSession().questions[0]!,
      id: `q${index + 1}`,
    }))
    expect(
      isPracticeAwaitingAiGeneration(
        baseSession({
          targetQuestionCount: 7,
          questions,
          currentIndex: 6,
        })
      )
    ).toBe(false)
  })

  it('returns false for local generation source', () => {
    expect(
      isPracticeAwaitingAiGeneration(
        baseSession({
          generationSource: 'local',
          targetQuestionCount: 7,
        })
      )
    ).toBe(false)
  })
})

describe('normalizePracticeSessionTargetCount', () => {
  it('restores targetQuestionCount for AI sessions missing the field', () => {
    const normalized = normalizePracticeSessionTargetCount(
      baseSession({ targetQuestionCount: undefined })
    )
    expect(normalized.targetQuestionCount).toBe(7)
  })

  it('leaves local sessions unchanged', () => {
    const session = baseSession({ generationSource: 'local', targetQuestionCount: undefined })
    expect(normalizePracticeSessionTargetCount(session)).toBe(session)
  })
})
