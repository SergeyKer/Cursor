import { describe, expect, it } from 'vitest'
import { formatStreakSessionHint, shouldShowStreakSessionHint } from './streakSessionHint'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('streakSessionHint', () => {
  const today = getTodayDateString()

  it('returns hint when streak>=3 and bonus not claimed', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    expect(formatStreakSessionHint(state, 'adult', today)).toContain('+15 XP')
    expect(shouldShowStreakSessionHint(state, today)).toBe(true)
  })

  it('returns null when bonus already claimed today', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 7
    state.progress.lastStreakDailyBonusDate = today
    expect(formatStreakSessionHint(state, 'adult', today)).toBeNull()
    expect(shouldShowStreakSessionHint(state, today)).toBe(false)
  })
})
