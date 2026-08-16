import {
  createEmptyDailyStarState,
  DAILY_STAR_HISTORY_CAP,
  type DailyStarClosedBy,
  type DailyStarHistoryRow,
  type DailyStarState,
} from '@/lib/dailyStar/types'

export const DAILY_STAR_STORAGE_KEY = 'engvo.dailyStar.v1'

const CLOSED_BY: DailyStarClosedBy[] = [
  'communication',
  'translation',
  'dialogue',
  'engvo',
  'practice',
  'lesson',
  'legacy',
]

function canUseStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined'
}

function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeClosedBy(value: unknown): DailyStarClosedBy | null {
  return typeof value === 'string' && CLOSED_BY.includes(value as DailyStarClosedBy)
    ? (value as DailyStarClosedBy)
    : null
}

function normalizeHistory(raw: unknown, lastClosedDate: string | null): DailyStarHistoryRow[] {
  const rows: DailyStarHistoryRow[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const src = item as { date?: unknown; closedBy?: unknown }
      if (!isDayKey(src.date)) continue
      const closedBy = normalizeClosedBy(src.closedBy) ?? 'legacy'
      rows.push({ date: src.date, closedBy })
    }
  }
  if (rows.length === 0 && lastClosedDate) {
    return [{ date: lastClosedDate, closedBy: 'legacy' }]
  }
  return rows.slice(-DAILY_STAR_HISTORY_CAP)
}

function normalizeState(raw: unknown): DailyStarState {
  const empty = createEmptyDailyStarState()
  if (!raw || typeof raw !== 'object') return empty
  const src = raw as Partial<DailyStarState>
  const lastClosedDate = isDayKey(src.lastClosedDate) ? src.lastClosedDate : null
  const seriesToward7 =
    typeof src.seriesToward7 === 'number' && Number.isFinite(src.seriesToward7)
      ? Math.max(0, Math.min(7, Math.floor(src.seriesToward7)))
      : 0
  const history = normalizeHistory(src.history, lastClosedDate)
  return {
    lastClosedDate,
    seriesToward7,
    seriesCollected: Boolean(src.seriesCollected),
    history,
    lifetimeStars: history.length,
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
