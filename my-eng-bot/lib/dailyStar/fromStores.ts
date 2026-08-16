import { listAccentLessonProgress } from '@/lib/accent/progressStorage'
import { collectDailyStarActivity } from '@/lib/dailyStar/activity'
import { evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import { loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
import type { DailyStarActivity, DailyStarSnapshot, DailyStarState } from '@/lib/dailyStar/types'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import { getTodayDateString } from '@/lib/rewardsState'
import { listShownFaqEntries } from '@/lib/tutor/localFaq'
import { loadVocabularyProgress } from '@/lib/vocabulary/storage'

export function readDailyStarActivity(today: string = getTodayDateString()): DailyStarActivity {
  const lessons = Object.values(loadLessonProgressMap()).map((row) => ({ lastCompleted: row.lastCompleted }))
  const practiceSessions = practiceStorage.listCompletedSessions().map((row) => ({ completedAt: row.completedAt }))
  const vocabHistory = loadVocabularyProgress().history.map((row) => ({ completedAt: row.completedAt }))
  const accent = listAccentLessonProgress().map((row) => ({ completedDates: row.completedDates }))
  const tutorFaqShown = listShownFaqEntries().map((row) => ({ at: row.at }))
  return collectDailyStarActivity({ lessons, practiceSessions, vocabHistory, accent, tutorFaqShown }, today)
}

export function syncDailyStarFromStores(today: string = getTodayDateString()): {
  state: DailyStarState
  snapshot: DailyStarSnapshot
} {
  const result = evaluateDailyStar(loadDailyStarState(), readDailyStarActivity(today), today)
  saveDailyStarState(result.state)
  return result
}
