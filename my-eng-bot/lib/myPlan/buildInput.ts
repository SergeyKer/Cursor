import { buildLearnerSnapshot } from '@/lib/adaptiveRetention/learnerSnapshot'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { getLessonTopicCatalog } from '@/lib/lessonCatalog'
import type { RewardsState } from '@/lib/rewardsState'
import { getTodayDateString, loadRewardsState } from '@/lib/rewardsState'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import type { Settings } from '@/lib/types'
import type { MyPlanInput, MyPlanLessonProgressSlice, MyPlanPracticeSessionSlice } from '@/lib/myPlan/types'

function mapLessonProgress(): Record<string, MyPlanLessonProgressSlice> {
  const raw = loadLessonProgressMap()
  const out: Record<string, MyPlanLessonProgressSlice> = {}
  for (const [id, p] of Object.entries(raw)) {
    out[id] = {
      lessonId: p.lessonId,
      topic: p.topic,
      completedSteps: p.completedSteps,
      lastCompleted: p.lastCompleted,
      mistakesCount: Array.isArray(p.mistakes) ? p.mistakes.length : 0,
    }
  }
  return out
}

function mapRewards(state: RewardsState): MyPlanInput['rewards'] {
  return {
    lastActiveDate: state.progress.lastActiveDate,
    dailyStreak: state.progress.dailyStreak,
    modeGoals: {
      communication: { completed: state.modeGoals.communication.completed },
      engvo: { completed: state.modeGoals.engvo.completed },
    },
  }
}

function mapPracticeSessions(): MyPlanPracticeSessionSlice[] {
  return practiceStorage.listCompletedSessions().map((s) => ({
    lessonId: s.lessonId,
    completedAt: s.completedAt ?? null,
    status: s.status,
  }))
}

/** Сбор входа на клиенте из существующих сторов (без дублирования «бог-состояния»). */
export function buildMyPlanLiveInput(settings: Settings, rewardsProp?: RewardsState | null): MyPlanInput {
  const rewards = rewardsProp ?? loadRewardsState()
  const snapshot = buildLearnerSnapshot(settings)
  const weakSpots = snapshot.weakSpots.map((w) => ({ id: w.id, label: w.label }))

  return {
    todayDate: getTodayDateString(),
    catalog: getLessonTopicCatalog().map((t) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      enabled: t.enabled,
      hasTheory: t.hasTheory,
      hasPractice: t.hasPractice,
    })),
    lessons: mapLessonProgress(),
    rewards: mapRewards(rewards),
    practiceCompleted: mapPracticeSessions(),
    daysSinceLastActive: snapshot.daysSinceLastActive,
    weakSpots,
  }
}
