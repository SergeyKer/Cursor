import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { calculateLevel, createDefaultRewardsState } from '@/lib/rewardsState'

describe('buildProgressShelf', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty shelf for default rewards', () => {
    const shelf = buildProgressShelf(createDefaultRewardsState())
    expect(shelf.isEmptyShelf).toBe(true)
    expect(shelf.medals.gold).toBe(0)
    expect(shelf.medals.silver).toBe(0)
    expect(shelf.medals.bronze).toBe(0)
    expect(shelf.lessonRows).toHaveLength(4)
    expect(shelf.topicAwardRows.length).toBeGreaterThanOrEqual(4)
    expect(shelf.currencies.coins).toBeGreaterThanOrEqual(0)
    expect(shelf.opportunity).toBeNull()
  })

  it('reflects streak and level from rewards', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 12
    state.progress.totalXP = 250
    Object.assign(state.progress, calculateLevel(250), { totalXP: 250 })
    state.progress.lastActiveDate = '2026-07-18'
    const shelf = buildProgressShelf(state, '2026-07-18')
    expect(shelf.dailyStreak).toBe(5)
    expect(shelf.bestDailyStreak).toBe(12)
    expect(shelf.level).toBe(3)
    expect(shelf.currentLevelXP).toBe(30)
    expect(shelf.xpToNextLevel).toBe(140)
    expect(shelf.isEmptyShelf).toBe(false)
  })

  it('shows display streak 0 when series expired, keeps best and non-empty shelf', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-07-10'
    const shelf = buildProgressShelf(state, '2026-07-18')
    expect(shelf.dailyStreak).toBe(0)
    expect(shelf.bestDailyStreak).toBe(5)
    expect(shelf.isEmptyShelf).toBe(false)
  })
})
