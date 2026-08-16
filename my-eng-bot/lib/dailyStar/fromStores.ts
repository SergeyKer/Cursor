import { collectDailyStarActivity } from '@/lib/dailyStar/activity'
import { evaluateDailyStar } from '@/lib/dailyStar/evaluate'
import { loadDailyStarState, saveDailyStarState } from '@/lib/dailyStar/storage'
import type { DailyStarActivity, DailyStarSnapshot, DailyStarState } from '@/lib/dailyStar/types'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import { getTodayDateString, loadRewardsState, type RewardsState } from '@/lib/rewardsState'

function sessionCloseStamp(completedAt: string | null | undefined): string | null {
  return completedAt ?? null
}

/** Live session meter can be wiped on leave; modeGoals stamp survives. */
export function communicationCloseStamp(rewards: RewardsState): string | null {
  return (
    sessionCloseStamp(rewards.communicationSession.completedAt) ??
    rewards.modeGoals.communication.sessionCompletedAt ??
    null
  )
}

export function translationCloseStamp(rewards: RewardsState): string | null {
  return sessionCloseStamp(rewards.translationSession.completedAt)
}

export function dialogueCloseStamp(rewards: RewardsState): string | null {
  return sessionCloseStamp(rewards.dialogueSession.completedAt)
}

export function engvoCloseStamp(rewards: RewardsState): string | null {
  return rewards.modeGoals.engvo.sessionCompletedAt ?? null
}

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
      communicationCompletedAt: communicationCloseStamp(rewards),
      translationCompletedAt: translationCloseStamp(rewards),
      dialogueCompletedAt: dialogueCloseStamp(rewards),
      engvoCompletedAt: engvoCloseStamp(rewards),
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
