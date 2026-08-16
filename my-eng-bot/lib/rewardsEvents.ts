import {
  COMMUNICATION_XP_COMPLETION,
  clampCommunicationDailyXp,
  xpForCommunicationStep,
} from '@/lib/communication/communicationSessionEconomy'
import {
  DIALOGUE_XP_COMPLETION,
  clampDialogueDailyXp,
  xpForDialogueStep,
  type DialogueStepOutcome,
} from '@/lib/dialogue/dialogueSessionEconomy'
import {
  TRANSLATION_XP_COMPLETION,
  clampTranslationDailyXp,
  xpForTranslationStep,
  type TranslationStepOutcome,
} from '@/lib/translation/translationSessionEconomy'
import {
  TUTOR_XP_EXPLAIN,
  TUTOR_XP_MICRO_FINALE,
  clampTutorDailyXp,
  tutorExplainKey,
  tutorMicroKey,
} from '@/lib/tutor/tutorSessionEconomy'
import { stampDailyStarClose } from '@/lib/dailyStar/stamp'
import {
  abandonCommunicationSessionState,
  abandonDialogueSessionState,
  abandonTranslationSessionState,
  abandonTutorSessionState,
  awardGlobalXp,
  getTodayDateString,
  incrementModeGoal,
  normalizeCommunicationSession,
  normalizeDialogueSession,
  normalizeTranslationSession,
  normalizeTutorSession,
  startCommunicationSessionState,
  startDialogueSessionState,
  startTranslationSessionState,
  startTutorSessionState,
  withDailyActivity,
  type RewardsState,
} from './rewardsState'

export type RewardsEvent =
  | { type: 'lesson_xp_awarded'; amount: number }
  | { type: 'practice_completed'; amount: number; ticker?: string }
  | { type: 'accent_block_completed' }
  | { type: 'accent_session_completed' }
  /** @deprecated use communication_step_resolved */
  | { type: 'communication_turn_completed' }
  | {
      type: 'communication_step_resolved'
      assistantKey: string
      englishAttempt: boolean
    }
  | { type: 'communication_session_started' }
  | { type: 'communication_session_abandoned' }
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
  | {
      type: 'dialogue_step_resolved'
      outcome: DialogueStepOutcome
      assistantKey: string
    }
  | { type: 'dialogue_session_started' }
  | { type: 'dialogue_session_abandoned' }
  | { type: 'tutor_explain_resolved'; canonicalKey: string }
  | { type: 'tutor_micro_finale_resolved'; canonicalKey: string }
  | { type: 'tutor_session_started' }
  | { type: 'tutor_session_abandoned' }

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
      completedAt: completedNow ? today : session.completedAt,
      lastAwardedAssistantKey: key,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
    },
  }

  const reason = completedNow ? 'translation_session_completed' : 'translation_step_resolved'
  if (totalActual > 0) {
    next = awardGlobalXp(next, totalActual, reason, {
      ticker: completedNow
        ? `Цель перевода 8/8. +${totalActual}.`
        : `Перевод: +${totalActual}.`,
    })
  } else if (completedNow) {
    const rewardAt = new Date().toISOString()
    next = {
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

  if (completedNow) stampDailyStarClose('translation')
  return next
}

function applyDialogueStepResolved(
  state: RewardsState,
  outcome: DialogueStepOutcome,
  assistantKey: string
): RewardsState {
  const today = getTodayDateString()
  const key = typeof assistantKey === 'string' ? assistantKey.trim() : ''
  if (!key) return state

  let next = {
    ...state,
    dialogueSession: normalizeDialogueSession(state.dialogueSession, { today }),
  }
  let session = next.dialogueSession

  if (session.lastAwardedAssistantKey === key) return next
  if (session.status === 'completed') return next

  if (session.status !== 'in_progress') {
    next = startDialogueSessionState(next, today)
    session = next.dialogueSession
  }

  const stepWant = xpForDialogueStep(outcome)
  const stepActual = clampDialogueDailyXp(session.dailyXpAwarded, stepWant)
  const nextProgress = Math.min(session.target, session.progress + 1)
  const completedNow = nextProgress >= session.target
  const afterStepDaily = session.dailyXpAwarded + stepActual
  const completionWant = completedNow ? DIALOGUE_XP_COMPLETION : 0
  const completionActual = completedNow
    ? clampDialogueDailyXp(afterStepDaily, completionWant)
    : 0
  const totalActual = stepActual + completionActual
  const nextDaily = afterStepDaily + completionActual
  const nextSessionXp = session.sessionXpAwarded + totalActual

  next = {
    ...next,
    dialogueSession: {
      ...session,
      progress: nextProgress,
      sessionXpAwarded: nextSessionXp,
      status: completedNow ? 'completed' : 'in_progress',
      completedAt: completedNow ? today : session.completedAt,
      lastAwardedAssistantKey: key,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
    },
  }

  const reason = completedNow ? 'dialogue_session_completed' : 'dialogue_step_resolved'
  if (totalActual > 0) {
    next = awardGlobalXp(next, totalActual, reason, {
      ticker: completedNow
        ? `Цель диалога 8/8. +${totalActual}.`
        : `Диалог: +${totalActual}.`,
    })
  } else if (completedNow) {
    const rewardAt = new Date().toISOString()
    next = {
      ...next,
      ui: {
        ...next.ui,
        footerTicker: 'Цель диалога 8/8.',
        lastReward: {
          amount: 0,
          reason: 'dialogue_session_completed',
          at: rewardAt,
        },
      },
    }
  }

  if (completedNow) stampDailyStarClose('dialogue')
  return next
}

function applyCommunicationStepResolved(
  state: RewardsState,
  assistantKey: string,
  englishAttempt: boolean
): RewardsState {
  const today = getTodayDateString()
  const key = typeof assistantKey === 'string' ? assistantKey.trim() : ''
  if (!key) return state

  let next = {
    ...state,
    communicationSession: normalizeCommunicationSession(state.communicationSession, { today }),
  }
  let session = next.communicationSession

  if (session.lastAwardedAssistantKey === key) return next
  if (session.status === 'completed') return next

  if (session.status !== 'in_progress') {
    next = startCommunicationSessionState(next, today)
    session = next.communicationSession
  }

  const stepWant = englishAttempt ? xpForCommunicationStep() : 0
  const stepActual = stepWant > 0 ? clampCommunicationDailyXp(session.dailyXpAwarded, stepWant) : 0
  const nextProgress = Math.min(session.target, session.progress + 1)
  const completedNow = nextProgress >= session.target
  const nextAttemptCount = session.englishAttemptCount + (englishAttempt ? 1 : 0)
  const afterStepDaily = session.dailyXpAwarded + stepActual
  const completionWant =
    completedNow && nextAttemptCount >= 1 ? COMMUNICATION_XP_COMPLETION : 0
  const completionActual = completedNow
    ? clampCommunicationDailyXp(afterStepDaily, completionWant)
    : 0
  const totalActual = stepActual + completionActual
  const nextDaily = afterStepDaily + completionActual
  const nextSessionXp = session.sessionXpAwarded + totalActual

  next = {
    ...next,
    communicationSession: {
      ...session,
      progress: nextProgress,
      sessionXpAwarded: nextSessionXp,
      status: completedNow ? 'completed' : 'in_progress',
      completedAt: completedNow ? today : session.completedAt,
      lastAwardedAssistantKey: key,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
      englishAttemptCount: nextAttemptCount,
      lastStepAwardedXp: stepActual,
    },
  }

  // Bridge MyPlan / Progress: mirror completed flag on modeGoals.communication
  if (completedNow) {
    const goal = next.modeGoals.communication
    next = {
      ...next,
      modeGoals: {
        ...next.modeGoals,
        communication: {
          ...goal,
          goalProgress: next.communicationSession.target,
          goalTarget: next.communicationSession.target,
          completed: true,
          status: 'completed',
          sessionCompletedAt: new Date().toISOString(),
        },
      },
    }
  }

  next = withDailyActivity(next, today)

  const reason = completedNow ? 'communication_session_completed' : 'communication_step_resolved'
  if (totalActual > 0) {
    next = awardGlobalXp(next, totalActual, reason, {
      ticker: completedNow
        ? `Цель общения 8/8. +${totalActual}.`
        : `Общение: +${totalActual}.`,
    })
  } else if (completedNow) {
    const rewardAt = new Date().toISOString()
    next = {
      ...next,
      ui: {
        ...next.ui,
        footerTicker: 'Цель общения 8/8.',
        lastReward: {
          amount: 0,
          reason: 'communication_session_completed',
          at: rewardAt,
        },
      },
    }
  }

  if (completedNow) stampDailyStarClose('communication')
  return next
}

function applyTutorExplainResolved(state: RewardsState, canonicalKey: string): RewardsState {
  const today = getTodayDateString()
  const key = tutorExplainKey(canonicalKey)
  if (!key) return state

  let next = {
    ...state,
    tutorSession: normalizeTutorSession(state.tutorSession, { today }),
  }
  let session = next.tutorSession

  if (session.awardedExplainKeys.includes(key)) return next

  if (session.status !== 'in_progress') {
    next = startTutorSessionState(next, today)
    session = next.tutorSession
  }

  const stepActual = clampTutorDailyXp(session.dailyXpAwarded, TUTOR_XP_EXPLAIN)
  const nextDaily = session.dailyXpAwarded + stepActual
  const nextSessionXp = session.sessionXpAwarded + stepActual

  next = {
    ...next,
    tutorSession: {
      ...session,
      sessionXpAwarded: nextSessionXp,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
      awardedExplainKeys: [...session.awardedExplainKeys, key],
    },
  }

  if (stepActual > 0) {
    return awardGlobalXp(next, stepActual, 'tutor_explain_resolved', {
      ticker: `Репетитор: +${stepActual}.`,
    })
  }
  return next
}

function applyTutorMicroFinaleResolved(state: RewardsState, canonicalKey: string): RewardsState {
  const today = getTodayDateString()
  const key = tutorMicroKey(canonicalKey)
  if (!key) return state

  let next = {
    ...state,
    tutorSession: normalizeTutorSession(state.tutorSession, { today }),
  }
  let session = next.tutorSession

  if (session.awardedMicroKeys.includes(key)) return next

  if (session.status !== 'in_progress') {
    next = startTutorSessionState(next, today)
    session = next.tutorSession
  }

  const stepActual = clampTutorDailyXp(session.dailyXpAwarded, TUTOR_XP_MICRO_FINALE)
  const nextDaily = session.dailyXpAwarded + stepActual
  const nextSessionXp = session.sessionXpAwarded + stepActual

  next = {
    ...next,
    tutorSession: {
      ...session,
      sessionXpAwarded: nextSessionXp,
      dailyXpAwarded: nextDaily,
      dailyXpDate: today,
      awardedMicroKeys: [...session.awardedMicroKeys, key],
    },
  }

  if (stepActual > 0) {
    return awardGlobalXp(next, stepActual, 'tutor_micro_finale_resolved', {
      ticker: `Закрепление: +${stepActual}.`,
    })
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
      stampDailyStarClose('practice')
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
      // Legacy: XP moved to communication_step_resolved (+ assistantKey).
      return state
    case 'communication_step_resolved':
      return applyCommunicationStepResolved(state, event.assistantKey, event.englishAttempt)
    case 'communication_session_started':
      return startCommunicationSessionState(state)
    case 'communication_session_abandoned':
      return abandonCommunicationSessionState(state)
    case 'engvo_turn_completed': {
      const wasDone = state.modeGoals.engvo.completed
      const next = incrementModeGoal(state, 'engvo', {
        completionXp: 35,
      })
      if (!wasDone && next.modeGoals.engvo.completed) stampDailyStarClose('engvo')
      return next
    }
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
    case 'dialogue_session_started':
      return startDialogueSessionState(state)
    case 'dialogue_session_abandoned':
      return abandonDialogueSessionState(state)
    case 'dialogue_step_resolved':
      return applyDialogueStepResolved(state, event.outcome, event.assistantKey)
    case 'tutor_session_started':
      return startTutorSessionState(state)
    case 'tutor_session_abandoned':
      return abandonTutorSessionState(state)
    case 'tutor_explain_resolved':
      return applyTutorExplainResolved(state, event.canonicalKey)
    case 'tutor_micro_finale_resolved':
      return applyTutorMicroFinaleResolved(state, event.canonicalKey)
    default:
      return state
  }
}
