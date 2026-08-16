export { DAILY_STAR_SERIES_TARGET, DAILY_STAR_TUTOR_FAQ_MIN } from '@/lib/dailyStar/types'
export {
  createEmptyDailyStarState,
  emptyDailyStarActivity,
  type DailyStarActivity,
  type DailyStarSnapshot,
  type DailyStarState,
  type DailyStarStoreSlices,
} from '@/lib/dailyStar/types'
export { collectDailyStarActivity, dayQualifiesForDailyStar } from '@/lib/dailyStar/activity'
export { closeDailyStarDay, evaluateDailyStar } from '@/lib/dailyStar/evaluate'
export { DAILY_STAR_STORAGE_KEY, loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
export { readDailyStarActivity, syncDailyStarFromStores } from '@/lib/dailyStar/fromStores'
