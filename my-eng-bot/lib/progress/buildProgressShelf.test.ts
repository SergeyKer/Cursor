import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { buildProgressShelf } from '@/lib/progress/buildProgressShelf'
import { createDefaultRewardsState } from '@/lib/rewardsState'

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
    expect(shelf.currencies.coins).toBeGreaterThanOrEqual(0)
    expect(shelf.opportunity).toBeNull()
  })

  it('reflects streak and level from rewards', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 12
    state.progress.totalXP = 250
    const shelf = buildProgressShelf(state)
    expect(shelf.dailyStreak).toBe(5)
    expect(shelf.bestDailyStreak).toBe(12)
    expect(shelf.level).toBeGreaterThanOrEqual(1)
    expect(shelf.isEmptyShelf).toBe(false)
  })
})
