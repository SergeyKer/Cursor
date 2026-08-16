import { getTodayDateString } from '@/lib/rewardsState'
import { DAILY_STAR_TUTOR_FAQ_MIN, emptyDailyStarActivity, type DailyStarActivity, type DailyStarStoreSlices } from '@/lib/dailyStar/types'

export { DAILY_STAR_TUTOR_FAQ_MIN }

function dayKeyFromUnknown(value: number | string, toDayKey: (instant: Date) => string): string | null {
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

export function collectDailyStarActivity(
  slices: DailyStarStoreSlices,
  today: string,
  toDayKey: (instant: Date) => string = getTodayDateString
): DailyStarActivity {
  const activity = emptyDailyStarActivity()

  for (const lesson of slices.lessons) {
    if (dayKeyFromUnknown(lesson.lastCompleted, toDayKey) === today) activity.lessonCount += 1
  }
  for (const session of slices.practiceSessions) {
    if (session.completedAt == null) continue
    if (dayKeyFromUnknown(session.completedAt, toDayKey) === today) activity.practiceCount += 1
  }
  for (const row of slices.vocabHistory) {
    if (dayKeyFromUnknown(row.completedAt, toDayKey) === today) activity.vocabCount += 1
  }
  for (const row of slices.accent) {
    const hit = row.completedDates.some((stamp) => dayKeyFromUnknown(stamp, toDayKey) === today)
    if (hit) activity.pronunciationCount += 1
  }
  for (const row of slices.tutorFaqShown) {
    if (dayKeyFromUnknown(row.at, toDayKey) === today) activity.tutorFaqCount += 1
  }

  return activity
}

export function dayQualifiesForDailyStar(activity: DailyStarActivity): boolean {
  return (
    activity.lessonCount >= 1 ||
    activity.practiceCount >= 1 ||
    activity.vocabCount >= 1 ||
    activity.pronunciationCount >= 1 ||
    activity.tutorFaqCount >= DAILY_STAR_TUTOR_FAQ_MIN
  )
}
