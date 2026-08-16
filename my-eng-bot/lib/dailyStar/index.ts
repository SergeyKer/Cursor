export { DAILY_STAR_SERIES_TARGET } from '@/lib/dailyStar/types'
export {
  createEmptyDailyStarState,
  emptyDailyStarActivity,
  type DailyStarActivity,
  type DailyStarClosedBy,
  type DailyStarHistoryRow,
  type DailyStarSnapshot,
  type DailyStarState,
  type DailyStarStoreSlices,
} from '@/lib/dailyStar/types'
export { collectDailyStarActivity, dayKeyFromUnknown, dayQualifiesForDailyStar } from '@/lib/dailyStar/activity'
export { closeDailyStarDay, evaluateDailyStar } from '@/lib/dailyStar/evaluate'
export { stampDailyStarClose } from '@/lib/dailyStar/stamp'
export { DAILY_STAR_STORAGE_KEY, loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
export {
  communicationCloseStamp,
  dialogueCloseStamp,
  engvoCloseStamp,
  readDailyStarActivity,
  syncDailyStarFromStores,
  translationCloseStamp,
} from '@/lib/dailyStar/fromStores'
