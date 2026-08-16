/** Канон экономики сессии диалога: длина, XP, daily cap. */

export const DIALOGUE_SESSION_LENGTH = 8
export const DIALOGUE_XP_SUCCESS = 3
export const DIALOGUE_XP_RECOVERED = 1
export const DIALOGUE_XP_COMPLETION = 10
export const DIALOGUE_DAILY_GLOBAL_XP_CAP = 28
export const DIALOGUE_SESSION_TTL_MS = 45 * 60 * 1000

export type DialogueStepOutcome = 'success' | 'recovered'
export type DialogueSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export type DialogueSessionState = {
  target: number
  progress: number
  sessionXpAwarded: number
  status: DialogueSessionStatus
  sessionStartedAt: string | null
  /** YYYY-MM-DD of 8/8 close; leftover completed without this date does not count. */
  completedAt: string | null
  lastAwardedAssistantKey: string | null
  dailyXpAwarded: number
  dailyXpDate: string | null
}

export function createDefaultDialogueSession(): DialogueSessionState {
  return {
    target: DIALOGUE_SESSION_LENGTH,
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

export function xpForDialogueStep(outcome: DialogueStepOutcome): number {
  return outcome === 'success' ? DIALOGUE_XP_SUCCESS : DIALOGUE_XP_RECOVERED
}

export function clampDialogueDailyXp(awardedToday: number, delta: number): number {
  const awarded = Math.max(0, Math.floor(awardedToday))
  const want = Math.max(0, Math.floor(delta))
  const remaining = Math.max(0, DIALOGUE_DAILY_GLOBAL_XP_CAP - awarded)
  return Math.min(want, remaining)
}

export function dialogueFillPercent(progress: number, target: number = DIALOGUE_SESSION_LENGTH): number {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeProgress = Math.max(0, Math.min(safeTarget, Math.floor(progress)))
  return Math.round((safeProgress / safeTarget) * 100)
}

export function hashDialogueAssistantKey(content: string): string {
  let hash = 0
  const text = typeof content === 'string' ? content : ''
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return `d:${hash}:${text.length}`
}
