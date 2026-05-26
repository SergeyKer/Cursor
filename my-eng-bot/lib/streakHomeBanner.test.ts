import { describe, expect, it } from 'vitest'
import { formatStreakHomeBannerText, shouldShowStreakHomeBanner } from './streakHomeBanner'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('streakHomeBanner', () => {
  const today = getTodayDateString()

  it('shows banner when streak>=3, bonus not claimed, footer preview hidden', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    expect(shouldShowStreakHomeBanner(state, false, today)).toBe(true)
    expect(formatStreakHomeBannerText(state, 'adult', today)).toContain('+10 XP')
  })

  it('hides banner when footer preview visible, bonus claimed, or streak<3', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    expect(shouldShowStreakHomeBanner(state, true, today)).toBe(false)

    const claimed = createDefaultRewardsState()
    claimed.progress.dailyStreak = 4
    claimed.progress.lastStreakDailyBonusDate = today
    expect(shouldShowStreakHomeBanner(claimed, false, today)).toBe(false)

    const low = createDefaultRewardsState()
    low.progress.dailyStreak = 2
    expect(shouldShowStreakHomeBanner(low, false, today)).toBe(false)
  })
})
