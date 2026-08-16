import { describe, expect, it } from 'vitest'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { displayDailyStreak, isStreakExpired } from '@/lib/streakStatus'

describe('isStreakExpired', () => {
  const today = '2026-07-18'

  it('false when streak is 0', () => {
    const state = createDefaultRewardsState()
    expect(isStreakExpired(state, today)).toBe(false)
  })

  it('false when last active is today', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.lastActiveDate = today
    expect(isStreakExpired(state, today)).toBe(false)
  })

  it('false when last active was yesterday (recoverable)', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.lastActiveDate = '2026-07-17'
    expect(isStreakExpired(state, today)).toBe(false)
  })

  it('true when last active was 2+ days ago', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.lastActiveDate = '2026-07-10'
    expect(isStreakExpired(state, today)).toBe(true)
  })

  it('true when streak > 0 and lastActive is null', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    state.progress.lastActiveDate = null
    expect(isStreakExpired(state, today)).toBe(true)
  })
})

describe('displayDailyStreak', () => {
  const today = '2026-07-18'

  it('returns stored streak when live', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.lastActiveDate = today
    expect(displayDailyStreak(state, today)).toBe(5)
  })

  it('returns 0 when expired', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.lastActiveDate = '2026-07-10'
    expect(displayDailyStreak(state, today)).toBe(0)
  })
})
