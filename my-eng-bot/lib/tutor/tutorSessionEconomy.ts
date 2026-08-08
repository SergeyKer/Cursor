/** Канон экономики Репетитора: +1 Explain / +6 micro / daily cap. Без K-цели сессии. */

export const TUTOR_XP_EXPLAIN = 1
export const TUTOR_XP_MICRO_FINALE = 6
export const TUTOR_DAILY_GLOBAL_XP_CAP = 14
export const TUTOR_SESSION_TTL_MS = 45 * 60 * 1000

export type TutorSessionStatus = 'not_started' | 'in_progress' | 'abandoned'

export type TutorSessionState = {
  sessionXpAwarded: number
  status: TutorSessionStatus
  sessionStartedAt: string | null
  dailyXpAwarded: number
  dailyXpDate: string | null
  /** Explain keys awarded today: `r:e:{canonicalKey}` */
  awardedExplainKeys: string[]
  /** Micro finale keys awarded today: `r:m:{canonicalKey}` */
  awardedMicroKeys: string[]
}

export function createDefaultTutorSession(): TutorSessionState {
  return {
    sessionXpAwarded: 0,
    status: 'not_started',
    sessionStartedAt: null,
    dailyXpAwarded: 0,
    dailyXpDate: null,
    awardedExplainKeys: [],
    awardedMicroKeys: [],
  }
}

export function tutorExplainKey(canonicalKey: string): string {
  const key = typeof canonicalKey === 'string' ? canonicalKey.trim() : ''
  return key ? `r:e:${key}` : ''
}

export function tutorMicroKey(canonicalKey: string): string {
  const key = typeof canonicalKey === 'string' ? canonicalKey.trim() : ''
  return key ? `r:m:${key}` : ''
}

export function clampTutorDailyXp(awardedToday: number, delta: number): number {
  const awarded = Math.max(0, Math.floor(awardedToday))
  const want = Math.max(0, Math.floor(delta))
  const remaining = Math.max(0, TUTOR_DAILY_GLOBAL_XP_CAP - awarded)
  return Math.min(want, remaining)
}

export function rollTutorDailyXp(
  session: TutorSessionState,
  today: string
): TutorSessionState {
  if (session.dailyXpDate === today) return session
  return {
    ...session,
    dailyXpAwarded: 0,
    dailyXpDate: today,
    awardedExplainKeys: [],
    awardedMicroKeys: [],
  }
}

export function abandonTutorSessionSlice(session: TutorSessionState): TutorSessionState {
  return {
    ...session,
    sessionXpAwarded: 0,
    status: 'abandoned',
    sessionStartedAt: null,
  }
}

export function normalizeTutorKeyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const key = item.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}
