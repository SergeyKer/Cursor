/** Канон экономики сессии перевода: длина, XP, daily cap. */

export const TRANSLATION_SESSION_LENGTH = 8
export const TRANSLATION_XP_SUCCESS = 4
export const TRANSLATION_XP_SOFT_FAIL = 1
export const TRANSLATION_XP_COMPLETION = 12
export const TRANSLATION_DAILY_GLOBAL_XP_CAP = 40
export const TRANSLATION_SESSION_TTL_MS = 45 * 60 * 1000

export type TranslationStepOutcome = 'success' | 'soft_fail'
export type TranslationSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export type TranslationSessionState = {
  target: number
  progress: number
  sessionXpAwarded: number
  status: TranslationSessionStatus
  sessionStartedAt: string | null
  /** YYYY-MM-DD of 8/8 close; leftover completed without this date does not count. */
  completedAt: string | null
  lastAwardedAssistantKey: string | null
  dailyXpAwarded: number
  dailyXpDate: string | null
}

export function createDefaultTranslationSession(): TranslationSessionState {
  return {
    target: TRANSLATION_SESSION_LENGTH,
    progress: 0,
    sessionXpAwarded: 0,
    status: 'not_started',
    sessionStartedAt: null,
    completedAt: null,
    lastAwardedAssistantKey: null,
    dailyXpAwarded: 0,
    dailyXpDate: null,
  }
}

export function xpForTranslationStep(outcome: TranslationStepOutcome): number {
  return outcome === 'success' ? TRANSLATION_XP_SUCCESS : TRANSLATION_XP_SOFT_FAIL
}

export function clampTranslationDailyXp(awardedToday: number, delta: number): number {
  const awarded = Math.max(0, Math.floor(awardedToday))
  const want = Math.max(0, Math.floor(delta))
  const remaining = Math.max(0, TRANSLATION_DAILY_GLOBAL_XP_CAP - awarded)
  return Math.min(want, remaining)
}

export function translationFillPercent(progress: number, target: number = TRANSLATION_SESSION_LENGTH): number {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeProgress = Math.max(0, Math.min(safeTarget, Math.floor(progress)))
  return Math.round((safeProgress / safeTarget) * 100)
}

export function hashTranslationAssistantKey(content: string): string {
  let hash = 0
  const text = typeof content === 'string' ? content : ''
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return `t:${hash}:${text.length}`
}
