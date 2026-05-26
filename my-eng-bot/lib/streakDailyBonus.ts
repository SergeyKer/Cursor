import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'

export function streakDailyBonusXp(dailyStreak: number): number {
  const streak = Math.max(0, Math.floor(dailyStreak))
  if (streak >= 7) return 20
  if (streak >= 5) return 15
  if (streak >= 3) return 10
  return 0
}

export function isStreakDailyBonusClaimed(state: RewardsState, today: string = getTodayDateString()): boolean {
  return state.progress.lastStreakDailyBonusDate === today
}

export function resolveStreakDailyBonus(
  state: RewardsState,
  today: string = getTodayDateString()
): { bonus: number; nextLastStreakDailyBonusDate: string | null } {
  if (isStreakDailyBonusClaimed(state, today)) {
    return { bonus: 0, nextLastStreakDailyBonusDate: state.progress.lastStreakDailyBonusDate }
  }
  const bonus = streakDailyBonusXp(state.progress.dailyStreak)
  if (bonus <= 0) {
    return { bonus: 0, nextLastStreakDailyBonusDate: state.progress.lastStreakDailyBonusDate }
  }
  return { bonus, nextLastStreakDailyBonusDate: today }
}
