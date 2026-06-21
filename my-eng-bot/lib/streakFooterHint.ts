import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'
import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'
import { isStreakDailyBonusClaimed, streakDailyBonusXp } from '@/lib/streakDailyBonus'

export function formatStreakFooterPreview(
  state: RewardsState,
  audience: FooterCopyAudience,
  today: string = getTodayDateString()
): string | null {
  if (isStreakDailyBonusClaimed(state, today)) return null
  const streak = state.progress.dailyStreak
  const bonus = streakDailyBonusXp(streak)
  if (bonus <= 0) return null
  if (audience === 'child') {
    return `${DAILY_STREAK_GLYPH}${streak}! Первый шаг сегодня +${bonus} XP!`
  }
  return `${DAILY_STREAK_GLYPH}${streak}: +${bonus} XP к первому шагу сегодня`
}

export function formatStreakFooterApplied(
  state: RewardsState,
  audience: FooterCopyAudience,
  nowMs: number = Date.now()
): string | null {
  const lastReward = state.ui.lastReward
  if (!lastReward?.streakBonus || lastReward.streakBonus <= 0) return null
  const streak = lastReward.dailyStreakAtAward ?? state.progress.dailyStreak
  const bonus = lastReward.streakBonus
  const timestamp = new Date(lastReward.at).getTime()
  if (Number.isNaN(timestamp) || nowMs - timestamp > 35_000) return null
  if (audience === 'child') {
    return `${DAILY_STREAK_GLYPH}${streak}! +${bonus} XP за первый шаг!`
  }
  return `Серия ${streak}: +${bonus} XP за первый шаг сегодня`
}

export type StreakFooterPriority = 'reward' | 'applied' | 'sessionHint' | 'preview' | 'none'

export function resolveStreakFooterPriorityLine(params: {
  rewardTicker: string | null
  appliedTicker: string | null
  sessionHint: string | null
  preview: string | null
}): { line: string | null; source: StreakFooterPriority } {
  if (params.rewardTicker?.trim()) {
    return { line: params.rewardTicker.trim(), source: 'reward' }
  }
  if (params.appliedTicker?.trim()) {
    return { line: params.appliedTicker.trim(), source: 'applied' }
  }
  if (params.sessionHint?.trim()) {
    return { line: params.sessionHint.trim(), source: 'sessionHint' }
  }
  if (params.preview?.trim()) {
    return { line: params.preview.trim(), source: 'preview' }
  }
  return { line: null, source: 'none' }
}

export function resolveStreakFooterOverlayLine(params: {
  modeFallback: string | null
  rewardTicker?: string | null
  appliedTicker?: string | null
  sessionHint?: string | null
  preview?: string | null
  sessionMode?: StreakFooterSessionMode
}): string | null {
  const { line } = resolveStreakFooterPriorityLine({
    rewardTicker: params.rewardTicker ?? null,
    appliedTicker: params.appliedTicker ?? null,
    sessionHint: params.sessionHint ?? null,
    preview: shouldIncludeStreakFooterPreview(params.sessionMode ?? null)
      ? (params.preview ?? null)
      : null,
  })
  return line ?? params.modeFallback
}

export function shouldShowStreakFooterPreview(state: RewardsState, today: string = getTodayDateString()): boolean {
  if (isStreakDailyBonusClaimed(state, today)) return false
  return streakDailyBonusXp(state.progress.dailyStreak) > 0
}

export type StreakFooterSessionMode =
  | 'lesson'
  | 'lesson-intro'
  | 'lesson-learning'
  | 'practice'
  | 'communication'
  | 'engvo'
  | 'accent'
  | null

/** XP preview belongs in idle/intro - not while a lesson or task is in progress. */
export function shouldIncludeStreakFooterPreview(sessionMode: StreakFooterSessionMode): boolean {
  if (sessionMode === null) return true
  return sessionMode === 'lesson-intro'
}
