import { describe, expect, it } from 'vitest'
import { formatStreakSessionHint, shouldShowStreakSessionHint } from './streakSessionHint'
import { streakDailyBonusXp } from './streakDailyBonus'
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

  it('formats +10/+15/+20 XP by streak tier', () => {
    for (const [streak, bonus] of [
      [3, 10],
      [5, 15],
      [7, 20],
    ] as const) {
      const state = createDefaultRewardsState()
      state.progress.dailyStreak = streak
      expect(streakDailyBonusXp(streak)).toBe(bonus)
      expect(formatStreakSessionHint(state, 'adult', today)).toContain(`+${bonus} XP`)
    }
  })
})
