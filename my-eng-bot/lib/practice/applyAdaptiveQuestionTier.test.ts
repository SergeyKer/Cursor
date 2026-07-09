import { describe, expect, it } from 'vitest'
import {
  applyAdaptiveChoiceTier,
  normalizeAdaptiveQuestionInSession,
} from '@/lib/practice/applyAdaptiveQuestionTier'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { PracticeSession } from '@/types/practice'

function baseSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 's1',
    lessonId: '1',
    mode: 'challenge',
    topic: 'Test',
    status: 'active',
    currentIndex: 10,
    source: { kind: 'static_lesson', lessonId: '1' },
    questions: Array.from({ length: 12 }, (_, index) => ({
      id: `q${index}`,
      lessonId: '1',
      type: index === 10 ? ('error-fix' as const) : ('choice' as const),
      prompt: 'Ситуация: На улице темно. Исправьте: "It\'s cold."',
      targetAnswer: "It's dark.",
      acceptedAnswers: ["It's dark."],
      xpBase: 6,
      difficulty: 3,
      tolerance: 'normalized' as const,
    })),
    answers: [],
    score: 0,
    xp: 0,
    streak: 0,
    instructionAcknowledged: true,
    ...overrides,
  }
}

describe('applyAdaptiveQuestionTier', () => {
  it('does not patch error-fix (no choice options)', () => {
    const lesson = getStructuredLessonById('1')
    const session = baseSession()
    expect(applyAdaptiveChoiceTier(session, 10, lesson!)).toBeNull()
    expect(normalizeAdaptiveQuestionInSession(session)).toBe(session)
  })
})
