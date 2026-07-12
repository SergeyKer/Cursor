import { describe, expect, it, vi } from 'vitest'
import {
  appendFooterRewardSnapshot,
  applyGlobalCoinsGrantMigration,
  applyRewardsCoinMigrations,
  applyStarterCoinsBonusMigration,
  applyZeroCoinsTopUpMigration,
  awardGlobalXp,
  canSpendCoins,
  createDefaultRewardsState,
  createFooterSsrPlaceholderRewardsState,
  GLOBAL_COINS_GRANT_AMOUNT,
  replenishEmptyWalletOnLoad,
  formatGlobalFooterStats,
  getTodayDateString,
  REWARDS_MIGRATIONS_KEY,
  reconcileModeGoalSessions,
  spendCoins,
  STARTER_COINS_BONUS,
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

  it('awards streak daily bonus once on first xp of the day', () => {
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.bestDailyStreak = 2
    state.progress.lastActiveDate = '2026-05-18'
    const first = awardGlobalXp(state, 5, 'communication_goal_progress', { today: '2026-05-19' })
    expect(first.progress.dailyStreak).toBe(3)
    expect(first.progress.lastStreakDailyBonusDate).toBe('2026-05-19')
    expect(first.progress.totalXP).toBe(15)
    expect(first.ui.lastReward?.amount).toBe(15)
    expect(first.ui.lastReward?.streakBonus).toBe(10)
    expect(first.ui.lastReward?.reason).toBe('communication_goal_progress')

    const second = awardGlobalXp(first, 5, 'communication_goal_progress', { today: '2026-05-19' })
    expect(second.progress.totalXP).toBe(20)
    expect(second.ui.lastReward?.amount).toBe(5)
    expect(second.ui.lastReward?.streakBonus).toBeUndefined()
  })

  it('uses tier bonuses 10/15/20 after streak update', () => {
    const cases = [
      { streakBefore: 2, today: '2026-05-19', last: '2026-05-18', bonus: 10, nextStreak: 3 },
      { streakBefore: 4, today: '2026-05-20', last: '2026-05-19', bonus: 15, nextStreak: 5 },
      { streakBefore: 6, today: '2026-05-21', last: '2026-05-20', bonus: 20, nextStreak: 7 },
      { streakBefore: 9, today: '2026-05-22', last: '2026-05-21', bonus: 20, nextStreak: 10 },
    ] as const
    for (const item of cases) {
      let state = createDefaultRewardsState()
      state.progress.dailyStreak = item.streakBefore
      state.progress.lastActiveDate = item.last
      const next = awardGlobalXp(state, 5, 'lesson_xp_awarded', { today: item.today })
      expect(next.progress.dailyStreak).toBe(item.nextStreak)
      expect(next.ui.lastReward?.streakBonus).toBe(item.bonus)
    }
  })

  it('resets streak bonus after missed day and allows tier again', () => {
    let state = createDefaultRewardsState()
    state.progress.dailyStreak = 5
    state.progress.bestDailyStreak = 5
    state.progress.lastActiveDate = '2026-05-10'
    state.progress.lastStreakDailyBonusDate = '2026-05-10'
    state.progress.totalXP = 100
    state = withDailyActivity(state, '2026-05-20')
    expect(state.progress.dailyStreak).toBe(1)
    const first = awardGlobalXp(state, 5, 'communication_goal_progress', { today: '2026-05-20' })
    expect(first.ui.lastReward?.streakBonus).toBeUndefined()

    state = createDefaultRewardsState()
    state.progress.dailyStreak = 2
    state.progress.lastActiveDate = '2026-05-21'
    const day3 = awardGlobalXp(state, 5, 'communication_goal_progress', { today: '2026-05-22' })
    expect(day3.progress.dailyStreak).toBe(3)
    expect(day3.ui.lastReward?.streakBonus).toBe(10)
  })

  it('defaults lastStreakDailyBonusDate to null in fresh state', () => {
    expect(createDefaultRewardsState().progress.lastStreakDailyBonusDate).toBeNull()
  })

  it('ignores zero xp awards', () => {
    const state = createDefaultRewardsState()
    const next = awardGlobalXp(state, 0, 'lesson_xp_awarded')
    expect(next).toBe(state)
  })

  it('starts new users with starter coin bonus', () => {
    expect(createDefaultRewardsState().currencies.coins).toBe(STARTER_COINS_BONUS)
  })

  it('applies starter coin migration only once', () => {
    const storage = new Map<string, string>()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    }
    vi.stubGlobal('localStorage', localStorageMock)

    const state = createDefaultRewardsState()
    state.currencies.coins = 0

    const first = applyStarterCoinsBonusMigration(state)
    expect(first.currencies.coins).toBe(STARTER_COINS_BONUS)

    first.currencies.coins = 3
    const second = applyStarterCoinsBonusMigration(first)
    expect(second.currencies.coins).toBe(3)

    expect(JSON.parse(storage.get(REWARDS_MIGRATIONS_KEY) ?? '{}').starterCoinsBonusV1).toBe(true)

    vi.unstubAllGlobals()
  })

  it('applies global coins grant only once', () => {
    const storage = new Map<string, string>()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    }
    vi.stubGlobal('localStorage', localStorageMock)

    const state = createDefaultRewardsState()
    state.currencies.coins = 5

    const first = applyGlobalCoinsGrantMigration(state)
    expect(first.currencies.coins).toBe(5 + GLOBAL_COINS_GRANT_AMOUNT)

    first.currencies.coins = 12
    const second = applyGlobalCoinsGrantMigration(first)
    expect(second.currencies.coins).toBe(12)

    expect(JSON.parse(storage.get(REWARDS_MIGRATIONS_KEY) ?? '{}').globalCoinsGrantV1).toBe(true)

    vi.unstubAllGlobals()
  })

  it('tops up zero coin balance once after prior migrations', () => {
    const storage = new Map<string, string>()
    storage.set(
      REWARDS_MIGRATIONS_KEY,
      JSON.stringify({ starterCoinsBonusV1: true, globalCoinsGrantV1: true })
    )
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    })

    const state = createDefaultRewardsState()
    state.currencies.coins = 0

    const topped = applyZeroCoinsTopUpMigration(state)
    expect(topped.currencies.coins).toBe(GLOBAL_COINS_GRANT_AMOUNT)

    topped.currencies.coins = 0
    const again = applyZeroCoinsTopUpMigration(topped)
    expect(again.currencies.coins).toBe(0)

    vi.unstubAllGlobals()
  })

  it('footer ssr placeholder does not show starter coins before hydration', () => {
    expect(createFooterSsrPlaceholderRewardsState().currencies.coins).toBe(0)
    expect(createFooterSsrPlaceholderRewardsState().progress.totalXP).toBe(0)
  })

  it('does not replenish an empty wallet on normal load after migrations', () => {
    const storage = new Map<string, string>()
    storage.set(
      REWARDS_MIGRATIONS_KEY,
      JSON.stringify({
        starterCoinsBonusV1: true,
        globalCoinsGrantV1: true,
        zeroCoinsTopUpV1: true,
      })
    )
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    })

    const state = createDefaultRewardsState()
    state.currencies.coins = 0
    state.progress.totalXP = 243

    expect(replenishEmptyWalletOnLoad(state).currencies.coins).toBe(STARTER_COINS_BONUS)
    expect(applyRewardsCoinMigrations(state).currencies.coins).toBe(0)

    state.currencies.coins = 3
    expect(replenishEmptyWalletOnLoad(state).currencies.coins).toBe(3)

    vi.unstubAllGlobals()
  })

  it('spends coins when balance is sufficient', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 5
    const spent = spendCoins(state, 1)
    expect(spent.ok).toBe(true)
    expect(spent.state.currencies.coins).toBe(4)
    expect(state.currencies.coins).toBe(5)
  })

  it('refuses to spend coins when balance is insufficient', () => {
    const state = createDefaultRewardsState()
    state.currencies.coins = 0
    const spent = spendCoins(state, 1)
    expect(spent.ok).toBe(false)
    expect(canSpendCoins(state, 1)).toBe(false)
  })
})
