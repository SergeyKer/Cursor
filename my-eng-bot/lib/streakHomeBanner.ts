import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import { isStreakDailyBonusClaimed, streakDailyBonusXp } from '@/lib/streakDailyBonus'

export function shouldShowStreakHomeBanner(
  state: RewardsState,
  footerPreviewVisible: boolean,
  today: string = getTodayDateString()
): boolean {
  if (footerPreviewVisible) return false
  if (isStreakDailyBonusClaimed(state, today)) return false
  return streakDailyBonusXp(state.progress.dailyStreak) > 0
}

export function formatStreakHomeBannerText(
  state: RewardsState,
  audience: FooterCopyAudience,
  today: string = getTodayDateString()
): string | null {
  if (!shouldShowStreakHomeBanner(state, false, today)) return null
  const streak = state.progress.dailyStreak
  const bonus = streakDailyBonusXp(streak)
  if (bonus <= 0) return null
  if (audience === 'child') {
    return `${DAILY_STREAK_GLYPH} Серия ${streak} дней! Первый шаг сегодня +${bonus} XP!`
  }
  return `${DAILY_STREAK_GLYPH} Серия ${streak} дн. Первый шаг сегодня даст +${bonus} XP.`
}
