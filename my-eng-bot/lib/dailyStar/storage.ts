import { createEmptyDailyStarState, type DailyStarState } from '@/lib/dailyStar/types'

export const DAILY_STAR_STORAGE_KEY = 'engvo.dailyStar.v1'

function canUseStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined'
}

function normalizeState(raw: unknown): DailyStarState {
  const empty = createEmptyDailyStarState()
  if (!raw || typeof raw !== 'object') return empty
  const src = raw as Partial<DailyStarState>
  const lastClosedDate =
    typeof src.lastClosedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.lastClosedDate)
      ? src.lastClosedDate
      : null
  const seriesToward7 =
    typeof src.seriesToward7 === 'number' && Number.isFinite(src.seriesToward7)
      ? Math.max(0, Math.min(7, Math.floor(src.seriesToward7)))
      : 0
  return {
    lastClosedDate,
    seriesToward7,
    seriesCollected: Boolean(src.seriesCollected),
  }
}

export function loadDailyStarState(): DailyStarState {
  if (!canUseStorage()) return createEmptyDailyStarState()
  try {
    const raw = globalThis.localStorage.getItem(DAILY_STAR_STORAGE_KEY)
    if (!raw) return createEmptyDailyStarState()
    return normalizeState(JSON.parse(raw) as unknown)
  } catch {
    return createEmptyDailyStarState()
  }
}

export function saveDailyStarState(state: DailyStarState): void {
  if (!canUseStorage()) return
  try {
    globalThis.localStorage.setItem(DAILY_STAR_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // local-first; storage failure must not block lesson UX
  }
}
