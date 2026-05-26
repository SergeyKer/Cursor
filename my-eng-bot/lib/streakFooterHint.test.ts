import { describe, expect, it } from 'vitest'
import {
  formatStreakFooterApplied,
  formatStreakFooterPreview,
  resolveStreakFooterPriorityLine,
  shouldShowStreakFooterPreview,
} from './streakFooterHint'
import { awardGlobalXp, createDefaultRewardsState, getTodayDateString } from './rewardsState'

describe('streakFooterHint', () => {
  const today = getTodayDateString()

  it('shows preview when streak>=3 and bonus not claimed', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 4
    expect(formatStreakFooterPreview(state, 'adult', today)).toContain('+10 XP')
    expect(shouldShowStreakFooterPreview(state, today)).toBe(true)
  })

  it('returns null preview when streak<3 or bonus claimed', () => {
    const low = createDefaultRewardsState()
    low.progress.dailyStreak = 2
    expect(formatStreakFooterPreview(low, 'adult', today)).toBeNull()

    const claimed = createDefaultRewardsState()
    claimed.progress.dailyStreak = 5
    claimed.progress.lastStreakDailyBonusDate = today
    expect(formatStreakFooterPreview(claimed, 'adult', today)).toBeNull()
    expect(shouldShowStreakFooterPreview(claimed, today)).toBe(false)
  })

  it('formats applied ticker from lastReward streakBonus', () => {
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = '2026-05-18'
    state = awardGlobalXp(state, 5, 'communication_goal_progress', { today: '2026-05-19' })
    expect(formatStreakFooterApplied(state, 'adult')).toContain('+10 XP')
    expect(formatStreakFooterApplied(state, 'child')).toContain('⚡3')
  })

  it('respects footer priority reward > sessionHint > preview', () => {
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: 'Reward line',
        appliedTicker: 'Applied',
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('reward')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: 'Applied',
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('applied')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: null,
        sessionHint: 'Session',
        preview: 'Preview',
      }).source
    ).toBe('sessionHint')
    expect(
      resolveStreakFooterPriorityLine({
        rewardTicker: null,
        appliedTicker: null,
        sessionHint: null,
        preview: 'Preview',
      }).source
    ).toBe('preview')
  })
})
