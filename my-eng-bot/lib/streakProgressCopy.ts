import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import { isStreakDailyBonusClaimed, streakDailyBonusXp } from '@/lib/streakDailyBonus'

export interface StreakProgressCopy {
  bonusTodayLabel: string | null
  statusLine: string
  nextThresholdLine: string | null
  introLine: string | null
}

export function formatStreakProgressCopy(
  state: RewardsState,
  today: string = getTodayDateString()
): StreakProgressCopy {
  const streak = state.progress.dailyStreak
  const bonus = streakDailyBonusXp(streak)
  const claimed = isStreakDailyBonusClaimed(state, today)

  if (streak < 3) {
    return {
      bonusTodayLabel: null,
      statusLine: claimed ? 'Бонус серии получен сегодня' : 'Сделайте первый шаг с XP сегодня',
      nextThresholdLine: 'С 3 дней подряд — +10 XP к первому шагу каждый день',
      introLine: 'С 3 дней подряд — +10 XP к первому шагу каждый день',
    }
  }

  const bonusTodayLabel = bonus > 0 ? `+${bonus} XP` : null
  const statusLine = claimed
    ? 'Бонус получен'
    : 'Сделайте первый шаг сегодня'

  let nextThresholdLine: string | null = null
  if (streak < 5) {
    nextThresholdLine = `До +15 XP: ещё ${5 - streak} дн. (с 5 дней)`
  } else if (streak < 7) {
    nextThresholdLine = `До +20 XP: ещё ${7 - streak} дн. (с 7 дней)`
  } else {
    nextThresholdLine = `Максимум +20 XP (с 7 дней)`
  }

  return {
    bonusTodayLabel,
    statusLine,
    nextThresholdLine,
    introLine: null,
  }
}

export function formatStreakProgressHeadline(streak: number): string {
  return `${DAILY_STREAK_GLYPH} ${Math.max(0, Math.floor(streak))}`
}
