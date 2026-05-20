import { describe, expect, it } from 'vitest'
import {
  appendFooterRewardSnapshot,
  awardGlobalXp,
  createDefaultRewardsState,
  formatGlobalFooterStats,
  getTodayDateString,
  reconcileModeGoalSessions,
  withDailyActivity,
} from './rewardsState'
import { DAILY_STREAK_GLYPH } from './gamificationGlyphs'

describe('rewardsState', () => {
  it('marks level-up in ui when xp crosses threshold', () => {
    const state = createDefaultRewardsState()
    const next = awardGlobalXp(state, 120, 'test_xp')
    expect(next.progress.level).toBe(2)
    expect(next.ui.lastLevelUp?.from).toBe(1)
    expect(next.ui.lastLevelUp?.to).toBe(2)
  })

  it('abandons stale in-progress mode goal session', () => {
    const state = createDefaultRewardsState()
    state.modeGoals.communication = {
      ...state.modeGoals.communication,
      status: 'in_progress',
      goalProgress: 3,
      sessionStartedAt: '2026-05-01T10:00:00.000Z',
      sessionCompletedAt: null,
    }
    const next = reconcileModeGoalSessions(state, new Date('2026-05-01T11:00:00.000Z'))
    expect(next.modeGoals.communication.status).toBe('abandoned')
    expect(next.modeGoals.communication.goalProgress).toBe(0)
  })

  it('appends compact reward snapshot to footer context', () => {
    const state = createDefaultRewardsState()
    const merged = appendFooterRewardSnapshot('Диалог - Present Simple', state)
    expect(merged).toContain('Диалог - Present Simple')
    expect(merged).toContain('⭐')
    expect(merged).toContain(DAILY_STREAK_GLYPH)
  })

  it('formats global footer with daily streak glyph', () => {
    const state = createDefaultRewardsState()
    state.progress.dailyStreak = 3
    expect(formatGlobalFooterStats(state)).toContain(`${DAILY_STREAK_GLYPH}3`)
    expect(formatGlobalFooterStats(state)).not.toContain('🔥3')
  })

  it('grows bestDailyStreak when daily streak increases', () => {
    const today = getTodayDateString()
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.bestDailyStreak = 2
    state.progress.lastActiveDate = '2026-05-18'
    const next = withDailyActivity(state, '2026-05-19')
    expect(next.progress.dailyStreak).toBe(3)
    expect(next.progress.bestDailyStreak).toBe(3)
    expect(next.progress.lastActiveDate).toBe('2026-05-19')
  })

  it('keeps bestDailyStreak when daily streak resets after missed day', () => {
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-05-10'
    const next = withDailyActivity(state, '2026-05-20')
    expect(next.progress.dailyStreak).toBe(1)
    expect(next.progress.bestDailyStreak).toBe(5)
  })
})
