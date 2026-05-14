/**
 * Единая политика UI для наград: какие reason «тихие» (не перекрывают верхнюю строку футера),
 * какие события достойны всплывашки, и тексты попапа без изменения вёрстки плашки.
 */

const QUIET_PROGRESS_REASONS = new Set(['communication_goal_progress', 'engvo_goal_progress'])

export function rewardReasonAllowsDynamicTickerOverride(reason: string): boolean {
  return !QUIET_PROGRESS_REASONS.has(reason)
}

export function rewardReasonShowsToast(reason: string, leveledUpOnSameReward: boolean): boolean {
  if (leveledUpOnSameReward) return true
  switch (reason) {
    case 'lesson_completed':
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
}): string {
  const { reason, amount, levelUp } = params
  if (levelUp) {
    return `Новый уровень ${levelUp.to}! +${amount} XP`
  }
  if (reason === 'communication_goal_completed') {
    return `Цель чата 7/7! +${amount} XP`
  }
  if (reason === 'engvo_goal_completed') {
    return `Цель звонка 7/7! +${amount} XP`
  }
  if (reason === 'lesson_completed') {
    return `Урок закрыт. +${amount} XP`
  }
  if (reason === 'practice_completed') {
    return `Практика закрыта. +${amount} XP`
  }
  if (reason === 'accent_session_completed') {
    return `Произношение: сессия готова. +${amount} XP`
  }
  return `+${amount} XP`
}
