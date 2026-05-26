import { describe, expect, it } from 'vitest'
import { formatStreakProgressCopy } from './streakProgressCopy'
import { createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('streakProgressCopy', () => {
  const today = getTodayDateString()

  it('shows intro for streak below 3', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    const copy = formatStreakProgressCopy(state, today)
    expect(copy.introLine).toContain('+10 XP')
    expect(copy.bonusTodayLabel).toBeNull()
  })

  it('shows tier bonus and next threshold for streak 4', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    const copy = formatStreakProgressCopy(state, today)
    expect(copy.bonusTodayLabel).toBe('+10 XP')
    expect(copy.statusLine).toContain('первый шаг')
    expect(copy.nextThresholdLine).toContain('+15 XP')
  })

  it('shows claimed status when bonus taken today', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 6
    state.progress.lastStreakDailyBonusDate = today
    const copy = formatStreakProgressCopy(state, today)
    expect(copy.statusLine).toBe('Бонус получен')
    expect(copy.nextThresholdLine).toContain('+20 XP')
  })

  it('shows max tier message at streak 7+', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 8
    const copy = formatStreakProgressCopy(state, today)
    expect(copy.bonusTodayLabel).toBe('+20 XP')
    expect(copy.nextThresholdLine).toContain('Максимум +20 XP')
  })
})
