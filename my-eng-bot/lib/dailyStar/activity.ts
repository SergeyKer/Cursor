import { getTodayDateString } from '@/lib/rewardsState'
import {
  emptyDailyStarActivity,
  type DailyStarActivity,
  type DailyStarClosedBy,
  type DailyStarStoreSlices,
} from '@/lib/dailyStar/types'

const CLOSE_ORDER: DailyStarClosedBy[] = [
  'communication',
  'translation',
  'dialogue',
  'engvo',
  'practice',
  'lesson',
]

export function dayKeyFromUnknown(
  value: number | string | null | undefined,
  toDayKey: (instant: Date) => string = getTodayDateString
): string | null {
  if (value == null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    return toDayKey(new Date(value))
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return null
  return toDayKey(new Date(parsed))
}

function hitsToday(
  value: number | string | null | undefined,
  today: string,
  toDayKey: (instant: Date) => string
): boolean {
  return dayKeyFromUnknown(value, toDayKey) === today
}

export function collectDailyStarActivity(
  slices: DailyStarStoreSlices,
  today: string,
  toDayKey: (instant: Date) => string = getTodayDateString
): DailyStarActivity {
  const hits: Record<DailyStarClosedBy, boolean> = {
    communication: hitsToday(slices.communicationCompletedAt, today, toDayKey),
    translation: hitsToday(slices.translationCompletedAt, today, toDayKey),
    dialogue: hitsToday(slices.dialogueCompletedAt, today, toDayKey),
    engvo: hitsToday(slices.engvoCompletedAt, today, toDayKey),
    practice: slices.practiceSessions.some((session) => hitsToday(session.completedAt, today, toDayKey)),
    lesson: slices.lessons.some((lesson) => hitsToday(lesson.lessonCompletedAt, today, toDayKey)),
    legacy: false,
  }

  for (const closedBy of CLOSE_ORDER) {
    if (hits[closedBy]) return { closedByToday: closedBy }
  }
  return emptyDailyStarActivity()
}

export function dayQualifiesForDailyStar(activity: DailyStarActivity): boolean {
  return activity.closedByToday != null && activity.closedByToday !== 'legacy'
}
