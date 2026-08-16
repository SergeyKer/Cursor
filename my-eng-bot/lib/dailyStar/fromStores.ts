import { collectDailyStarActivity } from '@/lib/dailyStar/activity'
import { evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import { loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
import type { DailyStarActivity, DailyStarSnapshot, DailyStarState } from '@/lib/dailyStar/types'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import { getTodayDateString, loadRewardsState } from '@/lib/rewardsState'

export function readDailyStarActivity(today: string = getTodayDateString()): DailyStarActivity {
  const rewards = loadRewardsState()
  const lessons = Object.values(loadLessonProgressMap()).map((row) => ({
    lessonCompletedAt: row.lessonCompletedAt ?? null,
  }))
  const practiceSessions = practiceStorage.listCompletedSessions().map((row) => ({
    completedAt: row.completedAt,
  }))
  return collectDailyStarActivity(
    {
      communicationCompletedAt: rewards.communicationSession.completedAt,
      translationCompletedAt: rewards.translationSession.completedAt,
      dialogueCompletedAt: rewards.dialogueSession.completedAt,
      engvoCompletedAt: rewards.modeGoals.engvo.sessionCompletedAt,
      lessons,
      practiceSessions,
    },
    today
  )
}

export function syncDailyStarFromStores(today: string = getTodayDateString()): {
  state: DailyStarState
  snapshot: DailyStarSnapshot
} {
  const result = evaluateDailyStar(loadDailyStarState(), readDailyStarActivity(today), today)
  saveDailyStarState(result.state)
  return result
}
