import { getTodayDateString, type RewardsState } from '@/lib/rewardsState'

export function daysBetweenCalendarDates(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T12:00:00`)
  const to = new Date(`${toDate}T12:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      msPerDay
  )
}

export function isStreakExpired(
  state: RewardsState | undefined,
  today: string = getTodayDateString()
): boolean {
  const n = Math.max(0, Math.floor(state?.progress.dailyStreak ?? 0))
  if (n <= 0) return false
  const last = state?.progress.lastActiveDate ?? null
  if (last === today) return false
  if (!last) return true
  return daysBetweenCalendarDates(last, today) >= 2
}

export function displayDailyStreak(
  state: RewardsState | undefined,
  today: string = getTodayDateString()
): number {
  if (isStreakExpired(state, today)) return 0
  return Math.max(0, Math.floor(state?.progress.dailyStreak ?? 0))
}
