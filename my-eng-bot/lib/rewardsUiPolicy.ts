/**
 * Единая политика UI для наград: какие reason «тихие» (не перекрывают верхнюю строку футера),
 * какие события достойны всплывашки, и тексты попапа без изменения вёрстки плашки.
 */

import type { FooterCopyAudience } from '@/lib/footerTopLinePhrases'

const QUIET_PROGRESS_REASONS = new Set(['communication_goal_progress', 'engvo_goal_progress'])

export function rewardReasonAllowsDynamicTickerOverride(reason: string): boolean {
  return !QUIET_PROGRESS_REASONS.has(reason)
}

export function rewardReasonShowsToast(reason: string, leveledUpOnSameReward: boolean): boolean {
  if (leveledUpOnSameReward) return true
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

export function buildRewardPopupText(params: {
  reason: string
  amount: number
  levelUp: { from: number; to: number } | null
  audience?: FooterCopyAudience
  avoidText?: string | null
}): string {
  const { reason, amount, levelUp, audience = 'adult', avoidText } = params
  const xp = Math.max(0, Math.floor(amount))
  const alternatives = (main: string, secondary?: string): string[] =>
    secondary ? [main, secondary] : [main]

  let variants: string[]
  if (levelUp) {
    variants =
      audience === 'child'
        ? alternatives(`Новый уровень! +${xp} XP!`, `Новый уровень ${levelUp.to}! +${xp} XP!`)
        : alternatives(`Новый уровень ${levelUp.to}. +${xp} XP`, `Новый уровень ${levelUp.to}! +${xp} XP`)
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
