import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import { isStreakDailyBonusClaimed, streakDailyBonusXp } from '@/lib/streakDailyBonus'

export type StreakSessionMode = 'lesson' | 'practice' | 'communication' | 'engvo' | 'accent'

export function formatStreakSessionHint(
  state: RewardsState,
  audience: FooterCopyAudience,
  today: string = getTodayDateString()
): string | null {
  if (isStreakDailyBonusClaimed(state, today)) return null
  const streak = state.progress.dailyStreak
  const bonus = streakDailyBonusXp(streak)
  if (bonus <= 0) return null
  if (audience === 'child') {
    return `Первый XP сегодня: +${bonus} XP за серию ${DAILY_STREAK_GLYPH}${streak}!`
  }
  return `Первый XP сегодня: +${bonus} XP за серию ${DAILY_STREAK_GLYPH}${streak}`
}

export function shouldShowStreakSessionHint(state: RewardsState, today: string = getTodayDateString()): boolean {
  return formatStreakSessionHint(state, 'adult', today) !== null
}
