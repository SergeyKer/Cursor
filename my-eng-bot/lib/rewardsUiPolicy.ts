/**
 * Единая политика UI для наград: какие reason «тихие» (не перекрывают верхнюю строку футера),
 * какие события достойны всплывашки, и тексты попапа без изменения вёрстки плашки.
 */

import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'
import { DAILY_STREAK_GLYPH } from '@/lib/gamificationGlyphs'

const QUIET_PROGRESS_REASONS = new Set(['communication_goal_progress', 'engvo_goal_progress'])

export function rewardReasonAllowsDynamicTickerOverride(reason: string): boolean {
  return !QUIET_PROGRESS_REASONS.has(reason)
}

export function rewardReasonShowsToast(
  reason: string,
  leveledUpOnSameReward: boolean,
  streakBonus?: number
): boolean {
  if (leveledUpOnSameReward) return true
  if (typeof streakBonus === 'number' && streakBonus > 0) return true
  switch (reason) {
    case 'practice_completed':
    case 'accent_session_completed':
    case 'communication_goal_completed':
    case 'engvo_goal_completed':
      return true
    default:
      return false
  }
}

function buildStreakBonusPopupVariants(params: {
  streak: number
  bonus: number
  totalXp: number
  audience: FooterCopyAudience
  tierTransition: boolean
}): string[] {
  const { streak, bonus, totalXp, audience, tierTransition } = params
  if (audience === 'child') {
    if (tierTransition) {
      return [
        `${DAILY_STREAK_GLYPH}${streak}! Первый шаг сегодня +${bonus} XP!`,
        `${streak} дней подряд! +${totalXp} XP!`,
      ]
    }
    return [`${DAILY_STREAK_GLYPH}${streak}! +${bonus} XP за первый шаг!`, `+${totalXp} XP!`]
  }
  if (tierTransition) {
    return [
      `${streak} дней подряд! К первому шагу сегодня +${bonus} XP`,
      `Серия ${streak}: +${totalXp} XP за первый шаг`,
    ]
  }
  return [
    `Серия ${streak}: +${bonus} XP за первый шаг сегодня`,
    `+${totalXp} XP (в т.ч. +${bonus} за серию)`,
  ]
}

export function buildRewardPopupText(params: {
  reason: string
  amount: number
  levelUp: { from: number; to: number } | null
  audience?: FooterCopyAudience
  avoidText?: string | null
  streakBonus?: number
  dailyStreakAtAward?: number
}): string {
  const { reason, amount, levelUp, audience = 'adult', avoidText, streakBonus, dailyStreakAtAward } = params
  const xp = Math.max(0, Math.floor(amount))
  const bonus = Math.max(0, Math.floor(streakBonus ?? 0))
  const streak = Math.max(0, Math.floor(dailyStreakAtAward ?? 0))
  const alternatives = (main: string, secondary?: string): string[] =>
    secondary ? [main, secondary] : [main]

  let variants: string[]
  if (levelUp) {
    variants =
      audience === 'child'
        ? alternatives(`Новый уровень! +${xp} XP!`, `Новый уровень ${levelUp.to}! +${xp} XP!`)
        : alternatives(`Новый уровень ${levelUp.to}. +${xp} XP`, `Новый уровень ${levelUp.to}! +${xp} XP`)
  } else if (bonus > 0 && streak > 0) {
    const tierTransition = streak === 3 || streak === 5 || streak === 7
    variants = buildStreakBonusPopupVariants({
      streak,
      bonus,
      totalXp: xp,
      audience,
      tierTransition,
    })
  } else if (reason === 'communication_goal_completed') {
    variants =
      audience === 'child'
        ? alternatives(`Цель чата 7/7! +${xp} XP!`, `Чат закрыт на 7/7! +${xp} XP!`)
        : alternatives(`Цель общения 7/7 закрыта. +${xp} XP`, `Цель чата 7/7! +${xp} XP`)
  } else if (reason === 'engvo_goal_completed') {
    variants =
      audience === 'child'
        ? alternatives(`Цель звонка 7/7! +${xp} XP!`, `Звонок 7/7! +${xp} XP!`)
        : alternatives(`Цель звонка 7/7 закрыта. +${xp} XP`, `Цель звонка 7/7! +${xp} XP`)
  } else if (reason === 'practice_completed') {
    variants =
      audience === 'child'
        ? alternatives(`Практика завершена! +${xp} XP!`, `Практика готова! +${xp} XP!`)
        : alternatives(`Практика завершена. +${xp} XP`, `Практика закрыта. +${xp} XP`)
  } else if (reason === 'accent_session_completed') {
    variants =
      audience === 'child'
        ? alternatives(`Произношение готово! +${xp} XP!`, `Сессия произношения закрыта! +${xp} XP!`)
        : alternatives(`Произношение: сессия готова. +${xp} XP`, `Сессия произношения завершена. +${xp} XP`)
  } else {
    variants = audience === 'child' ? alternatives(`Отлично! +${xp} XP!`) : alternatives(`+${xp} XP`)
  }

  const avoid = (avoidText ?? '').trim().toLowerCase()
  if (!avoid) return variants[0] ?? `+${xp} XP`
  const deduped = variants.find((variant) => variant.trim().toLowerCase() !== avoid)
  return deduped ?? variants[0] ?? `+${xp} XP`
}
