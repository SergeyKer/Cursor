import { describe, expect, it } from 'vitest'
import {
  applyPracticeForgivenessToSession,
  requestPracticeForgiveness,
  resolvePracticeForgivenessBubbleMode,
  spendAndApplyPracticeForgiveness,
} from '@/lib/practice/practiceCoinForgiveness'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { normalizeStoredPracticeSession } from '@/lib/practice/storage/practiceStorage'
import type { PracticeSession } from '@/types/practice'

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
  const questions = Array.from({ length: 12 }, (_, index) => ({
    id: `q${index + 1}`,
    lessonId: 'topic',
    type: 'choice' as const,
    prompt: 'Test',
    targetAnswer: 'A',
    acceptedAnswers: ['A'],
    xpBase: 5,
    difficulty: 1 as const,
    tolerance: 'normalized' as const,
  }))
  return {
    id: 'run',
    lessonId: 'topic',
    topic: 'Topic',
    level: 'A1',
    mode: 'challenge',
    entrySource: 'menu',
    generationSource: 'local',
    source: { kind: 'static_lesson', lessonId: 'topic' },
    status: 'active',
    questions,
    currentIndex: 4,
    answers: [questions[0]!, questions[1]!].map((question, index) => ({
      questionId: question.id,
      userAnswer: 'B',
      correctAnswer: 'A',
      isCorrect: false,
      corrected: false,
      xpEarned: 0,
      responseTimeMs: 100,
      timestamp: index,
    })),
    score: 0,
    xp: 0,
    streak: 0,
    startedAt: 1,
    version: 2,
    targetQuestionCount: 12,
    ...overrides,
  }
}

const offerContext = {
  state: 'active' as const,
  tier: 1 as const,
  ringCount: 2,
  lastQualifyingDayKey: '2026-07-11',
  todayKey: '2026-07-12',
}

describe('practice coin forgiveness offer', () => {
  it('offers rescue on step 5 only when a qualifying pass can still be saved', () => {
    expect(resolvePracticeForgivenessBubbleMode({ ...offerContext, session: session() })).toBe('active')
    expect(
      resolvePracticeForgivenessBubbleMode({
        ...offerContext,
        session: session({ currentIndex: 3 }),
      })
    ).toBeNull()
    expect(
      resolvePracticeForgivenessBubbleMode({
        ...offerContext,
        session: session({ mode: 'balanced' }),
      })
    ).toBeNull()
  })

  it('blocks offer without medal, after today ring, at ring 5, or after use', () => {
    expect(resolvePracticeForgivenessBubbleMode({ ...offerContext, tier: 0, session: session() })).toBeNull()
    expect(
      resolvePracticeForgivenessBubbleMode({
        ...offerContext,
        lastQualifyingDayKey: offerContext.todayKey,
        session: session(),
      })
    ).toBeNull()
    expect(resolvePracticeForgivenessBubbleMode({ ...offerContext, ringCount: 5, session: session() })).toBeNull()
    expect(
      resolvePracticeForgivenessBubbleMode({
        ...offerContext,
        session: session({ forgivenessUsedThisRun: true }),
      })
    ).toBe('exhausted')
  })
})

describe('practice coin forgiveness transaction', () => {
  it('spends one coin only after session apply succeeds', () => {
    const rewards = {
      ...createDefaultRewardsState(),
      currencies: { ...createDefaultRewardsState().currencies, coins: 2 },
    }
    const requested = requestPracticeForgiveness(session())
    let current = requested.session
    const result = spendAndApplyPracticeForgiveness({
      rewardsState: rewards,
      apply: () => {
        const applied = applyPracticeForgivenessToSession(current)
        current = applied.session
        return applied.ok
      },
    })
    expect(result.ok).toBe(true)
    expect(result.state.currencies.coins).toBe(1)
    expect(current.forgivenessEffectiveBonus).toBe(1)
  })

  it('rolls the coin back when session apply fails', () => {
    const rewards = {
      ...createDefaultRewardsState(),
      currencies: { ...createDefaultRewardsState().currencies, coins: 1 },
    }
    const result = spendAndApplyPracticeForgiveness({
      rewardsState: rewards,
      apply: () => false,
    })
    expect(result.ok).toBe(false)
    expect(result.rolledBack).toBe(true)
    expect(result.state.currencies.coins).toBe(1)
  })

  it('normalizes a reloaded used session and never offers or reapplies', () => {
    const restored = normalizeStoredPracticeSession(
      session({
        forgivenessUsedThisRun: true,
        forgivenessEffectiveBonus: 1,
        forgivenessQuestionId: 'q5',
      })
    )
    expect(resolvePracticeForgivenessBubbleMode({ ...offerContext, session: restored })).toBe('exhausted')
    expect(applyPracticeForgivenessToSession(restored).ok).toBe(false)
  })
})
