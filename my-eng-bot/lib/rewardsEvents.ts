import {
  TRANSLATION_XP_COMPLETION,
  clampTranslationDailyXp,
  xpForTranslationStep,
  type TranslationStepOutcome,
} from '@/lib/translation/translationSessionEconomy'
import {
  abandonTranslationSessionState,
  awardGlobalXp,
  getTodayDateString,
  incrementModeGoal,
  normalizeTranslationSession,
  startTranslationSessionState,
  type RewardsState,
} from './rewardsState'

export type RewardsEvent =
  | { type: 'lesson_xp_awarded'; amount: number }
  | { type: 'practice_completed'; amount: number; ticker?: string }
  | { type: 'accent_block_completed' }
  | { type: 'accent_session_completed' }
  | { type: 'communication_turn_completed' }
  | { type: 'engvo_turn_completed' }
  | { type: 'coins_spent'; amount: number; reason: string; ticker?: string }
  | { type: 'coins_earned'; amount: number; reason: string; ticker?: string }
  | {
      type: 'translation_step_resolved'
      outcome: TranslationStepOutcome
      assistantKey: string
    }
  | { type: 'translation_session_started' }
  | { type: 'translation_session_abandoned' }

function applyTranslationStepResolved(
  state: RewardsState,
  outcome: TranslationStepOutcome,
  assistantKey: string
): RewardsState {
  const today = getTodayDateString()
  const key = typeof assistantKey === 'string' ? assistantKey.trim() : ''
  if (!key) return state

  let next = {
    ...state,
    translationSession: normalizeTranslationSession(state.translationSession, { today }),
  }
  let session = next.translationSession

  if (session.lastAwardedAssistantKey === key) return next
  if (session.status === 'completed') return next

  if (session.status !== 'in_progress') {
    next = startTranslationSessionState(next, today)
    session = next.translationSession
  }

  const stepWant = xpForTranslationStep(outcome)
  const stepActual = clampTranslationDailyXp(session.dailyXpAwarded, stepWant)
  const nextProgress = Math.min(session.target, session.progress + 1)
  const completedNow = nextProgress >= session.target
  const afterStepDaily = session.dailyXpAwarded + stepActual
  const completionWant = completedNow ? TRANSLATION_XP_COMPLETION : 0
  const completionActual = completedNow
    ? clampTranslationDailyXp(afterStepDaily, completionWant)
    : 0
  const totalActual = stepActual + completionActual
  const nextDaily = afterStepDaily + completionActual
  const nextSessionXp = session.sessionXpAwarded + totalActual

  next = {
    ...next,
    translationSession: {
      ...session,
      progress: nextProgress,
      sessionXpAwarded: nextSessionXp,
      status: completedNow ? 'completed' : 'in_progress',
      lastAwardedAssistantKey: key,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
    },
  }

  const reason = completedNow ? 'translation_session_completed' : 'translation_step_resolved'
  if (totalActual > 0) {
    return awardGlobalXp(next, totalActual, reason, {
      ticker: completedNow
        ? `Цель перевода 8/8. +${totalActual}.`
        : `Перевод: +${totalActual}.`,
    })
  }

  if (completedNow) {
    const rewardAt = new Date().toISOString()
    return {
      ...next,
      ui: {
        ...next.ui,
        footerTicker: 'Цель перевода 8/8.',
        lastReward: {
          amount: 0,
          reason: 'translation_session_completed',
          at: rewardAt,
        },
      },
    }
  }

  return next
}

export function applyRewardsEvent(state: RewardsState, event: RewardsEvent): RewardsState {
  switch (event.type) {
    case 'lesson_xp_awarded': {
      const amount = Math.max(0, Math.floor(event.amount))
      if (amount <= 0) return state
      return awardGlobalXp(state, amount, event.type, {
        ticker: `+${amount} к уровню.`,
      })
    }
    case 'practice_completed': {
      const amount = Math.max(0, Math.floor(event.amount))
      if (amount <= 0) return state
      return awardGlobalXp(state, amount, event.type, {
        ticker: event.ticker ?? `Практика завершена. +${amount}.`,
      })
    }
    case 'accent_block_completed':
      return awardGlobalXp(state, 15, event.type, {
        ticker: 'Блок произношения закрыт. +15.',
      })
    case 'accent_session_completed':
      return awardGlobalXp(state, 30, event.type, {
        ticker: 'Сессия произношения завершена. +30.',
      })
    case 'communication_turn_completed':
      return incrementModeGoal(state, 'communication', {
        completionXp: 35,
      })
    case 'engvo_turn_completed':
      return incrementModeGoal(state, 'engvo', {
        completionXp: 35,
      })
    case 'coins_spent': {
      const amount = Math.max(0, Math.floor(event.amount))
      if (amount <= 0) return state
      const rewardAt = new Date().toISOString()
      return {
        ...state,
        ui: {
          ...state.ui,
          ...(event.ticker ? { footerTicker: event.ticker } : {}),
          lastReward: {
            amount: 0,
            reason: event.reason,
            at: rewardAt,
          },
        },
      }
    }
    case 'coins_earned': {
      const amount = Math.max(0, Math.floor(event.amount))
      if (amount <= 0) return state
      const rewardAt = new Date().toISOString()
      return {
        ...state,
        ui: {
          ...state.ui,
          footerTicker: event.ticker ?? `+${amount} 🪙.`,
          lastReward: {
            amount,
            reason: event.reason,
            at: rewardAt,
          },
        },
      }
    }
    case 'translation_session_started':
      return startTranslationSessionState(state)
    case 'translation_session_abandoned':
      return abandonTranslationSessionState(state)
    case 'translation_step_resolved':
      return applyTranslationStepResolved(state, event.outcome, event.assistantKey)
    default:
      return state
  }
}
