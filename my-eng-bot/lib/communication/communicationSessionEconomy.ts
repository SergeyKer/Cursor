/** Канон экономики сессии общения: длина, XP, daily cap. */

export const COMMUNICATION_SESSION_LENGTH = 8
export const COMMUNICATION_XP_STEP = 2
export const COMMUNICATION_XP_COMPLETION = 8
export const COMMUNICATION_DAILY_GLOBAL_XP_CAP = 24
export const COMMUNICATION_SESSION_TTL_MS = 45 * 60 * 1000

export type CommunicationSessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export type CommunicationSessionState = {
  target: number
  progress: number
  sessionXpAwarded: number
  status: CommunicationSessionStatus
  sessionStartedAt: string | null
  lastAwardedAssistantKey: string | null
  dailyXpAwarded: number
  dailyXpDate: string | null
}

export function createDefaultCommunicationSession(): CommunicationSessionState {
  return {
    target: COMMUNICATION_SESSION_LENGTH,
    progress: 0,
    sessionXpAwarded: 0,
    status: 'not_started',
    sessionStartedAt: null,
    lastAwardedAssistantKey: null,
    dailyXpAwarded: 0,
    dailyXpDate: null,
  }
}

export function xpForCommunicationStep(): number {
  return COMMUNICATION_XP_STEP
}

export function clampCommunicationDailyXp(awardedToday: number, delta: number): number {
  const awarded = Math.max(0, Math.floor(awardedToday))
  const want = Math.max(0, Math.floor(delta))
  const remaining = Math.max(0, COMMUNICATION_DAILY_GLOBAL_XP_CAP - awarded)
  return Math.min(want, remaining)
}

export function communicationFillPercent(
  progress: number,
  target: number = COMMUNICATION_SESSION_LENGTH
): number {
  const safeTarget = Math.max(1, Math.floor(target))
  const safeProgress = Math.max(0, Math.min(safeTarget, Math.floor(progress)))
  return Math.round((safeProgress / safeTarget) * 100)
}

export function hashCommunicationAssistantKey(content: string): string {
  let hash = 0
  const text = typeof content === 'string' ? content : ''
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return `c:${hash}:${text.length}`
}
