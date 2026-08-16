import { evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import { loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
import type { DailyStarClosedBy, DailyStarSnapshot } from '@/lib/dailyStar/types'
import { getTodayDateString } from '@/lib/rewardsState'

/** Persist the star at close time, before the live session meter is wiped. */
export function stampDailyStarClose(
  closedBy: DailyStarClosedBy,
  today: string = getTodayDateString()
): DailyStarSnapshot {
  const result = evaluateDailyStar(loadDailyStarState(), { closedByToday: closedBy }, today)
  saveDailyStarState(result.state)
  return result.snapshot
}
