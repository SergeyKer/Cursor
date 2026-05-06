import { describe, expect, it } from 'vitest'
import { buildNextBestActions } from '@/lib/adaptiveRetention/nextBestAction'
import type { LearnerSnapshot } from '@/types/adaptiveRetention'

function snapshot(overrides: Partial<LearnerSnapshot> = {}): LearnerSnapshot {
  return {
    generatedAt: 1,
    audience: 'adult',
    segment: 'adult',
    level: 'a1',
    daysSinceLastActive: null,
    hasAnyHistory: false,
    vocabulary: {
      coins: 0,
      streak: 0,
      completedSessions: 0,
      unlockedWorldIds: ['home'],
      dueWordCount: 0,
      learnedWordCount: 0,
      weakWordCount: 0,
    },
    practice: {
      completedSessions: 0,
      lastCompletedAt: null,
      weakAnswerCount: 0,
    },
    lessons: {
      completedLessons: 0,
      lastCompletedAt: null,
    },
    customPacks: {
      total: 0,
      latestPackId: null,
      latestPackTitle: null,
    },
    weakSpots: [],
    ...overrides,
  }
}

describe('buildNextBestActions', () => {
  it('prioritizes return flow after a pause', () => {
    const actions = buildNextBestActions(snapshot({ daysSinceLastActive: 5, hasAnyHistory: true }))

    expect(actions[0]?.kind).toBe('return_flow')
  })

  it('prioritizes due SRS words when there is no return flow', () => {
    const actions = buildNextBestActions(snapshot({
      hasAnyHistory: true,
      vocabulary: {
        coins: 0,
        streak: 0,
        completedSessions: 1,
        unlockedWorldIds: ['home'],
        dueWordCount: 4,
        learnedWordCount: 5,
        weakWordCount: 1,
      },
    }))

    expect(actions[0]?.kind).toBe('srs_review')
  })

  it('uses custom packs before generic topic packs', () => {
    const actions = buildNextBestActions(snapshot({
      hasAnyHistory: true,
      customPacks: {
        total: 1,
        latestPackId: 'custom-1',
        latestPackTitle: 'Unit 5',
      },
    }))

    expect(actions[0]?.kind).toBe('custom_pack')
  })
})
