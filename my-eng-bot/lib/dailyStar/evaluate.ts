import { daysBetweenCalendarDates } from '@/lib/streakStatus'
import { DAILY_STAR_SERIES_TARGET, type DailyStarActivity, type DailyStarSnapshot, type DailyStarState } from '@/lib/dailyStar/types'
import { dayQualifiesForDailyStar } from '@/lib/dailyStar/activity'

function toSnapshot(state: DailyStarState, today: string): DailyStarSnapshot {
  const dailyClosedToday = state.lastClosedDate === today
  const gap =
    state.lastClosedDate == null ? Number.POSITIVE_INFINITY : daysBetweenCalendarDates(state.lastClosedDate, today)
  const weekAlive = dailyClosedToday || gap === 1
  return {
    dailyClosedToday,
    dayXOf7: weekAlive ? state.seriesToward7 : 0,
    seriesToward7: state.seriesToward7,
    lastClosedDate: state.lastClosedDate,
    seriesCollected: state.seriesCollected,
    rubyAwarded: false,
  }
}

export function closeDailyStarDay(state: DailyStarState, today: string): DailyStarState {
  if (state.lastClosedDate === today) return state

  const consecutive =
    state.lastClosedDate != null && daysBetweenCalendarDates(state.lastClosedDate, today) === 1
  let series = consecutive ? state.seriesToward7 + 1 : 1
  if (series > DAILY_STAR_SERIES_TARGET) series = 1

  return {
    lastClosedDate: today,
    seriesToward7: series,
    seriesCollected: state.seriesCollected || series === DAILY_STAR_SERIES_TARGET,
  }
}

export function evaluateDailyStar(
  state: DailyStarState,
  activity: DailyStarActivity,
  today: string
): { state: DailyStarState; snapshot: DailyStarSnapshot } {
  const next = dayQualifiesForDailyStar(activity) ? closeDailyStarDay(state, today) : state
  return { state: next, snapshot: toSnapshot(next, today) }
}
