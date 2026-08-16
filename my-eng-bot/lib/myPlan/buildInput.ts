import { buildLearnerSnapshot } from '@/lib/adaptiveRetention/learnerSnapshot'
import { syncDailyStarFromStores } from '@/lib/dailyStar'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { getLessonTopicCatalog } from '@/lib/lessonCatalog'
import type { RewardsState } from '@/lib/rewardsState'
import { getTodayDateString, loadRewardsState } from '@/lib/rewardsState'
import { featureFlags } from '@/lib/featureFlags'
import { practiceStorage } from '@/lib/practice/storage/practiceStorage'
import type { Settings } from '@/lib/types'
import { normalizeAnchorLevel } from '@/lib/myPlan/pickProgramLesson'
import type { MyPlanInput, MyPlanLessonProgressSlice, MyPlanPracticeSessionSlice } from '@/lib/myPlan/types'

function parseTouchIso(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  if (!Number.isFinite(Date.parse(t))) return null
  return t
}

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
      medal: p.medal ?? null,
      lessonCompleted: p.lessonCompleted === true,
      incompleteTouchedAtIso: parseTouchIso(p.lastCompleted),
    }
  }
  return out
}

function hadChatFromRewards(state: RewardsState): boolean {
  const s = state.communicationSession
  if (!s) return false
  if (s.status && s.status !== 'not_started') return true
  if ((s.progress ?? 0) > 0) return true
  if ((s.englishAttemptCount ?? 0) > 0) return true
  return Boolean(s.sessionStartedAt)
}

function hadCallFromRewards(state: RewardsState): boolean {
  const g = state.modeGoals?.engvo
  if (!g) return false
  if (g.status && g.status !== 'not_started') return true
  if ((g.goalProgress ?? 0) > 0) return true
  return Boolean(g.sessionStartedAt)
}

function mapRewards(state: RewardsState): MyPlanInput['rewards'] {
  return {
    lastActiveDate: state.progress.lastActiveDate,
    dailyStreak: state.progress.dailyStreak,
    level: state.progress.level,
    totalXP: state.progress.totalXP,
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

function meterFromSession(session: {
  status: string
  progress: number
  target: number
  completedAt?: string | null
}) {
  return {
    status: session.status,
    progress: session.progress,
    target: session.target,
    completedAt: session.completedAt ?? null,
  }
}

function mapDailyStar(state: RewardsState): MyPlanInput['dailyStar'] {
  const engvo = state.modeGoals.engvo
  const active = practiceStorage.loadActiveSession()
  return {
    todayDate: getTodayDateString(),
    communication: meterFromSession(state.communicationSession),
    translation: meterFromSession(state.translationSession),
    dialogue: meterFromSession(state.dialogueSession),
    engvo: {
      status: engvo.status,
      progress: engvo.goalProgress,
      target: engvo.goalTarget,
      completedAt: engvo.sessionCompletedAt,
    },
    practiceInProgress: active != null && active.status === 'active',
    engvoVoiceEnabled: featureFlags.engvoVoiceV1,
  }
}

/** Сбор входа на клиенте из существующих сторов (без дублирования «бог-состояния»). */
export function buildMyPlanLiveInput(
  settings: Settings,
  rewardsProp?: RewardsState | null,
  extras?: {
    attentionZones?: MyPlanInput['attentionZones']
    canUseAiReinforce?: boolean
    recentSoftKeys?: string[]
  }
): MyPlanInput {
  const rewards = rewardsProp ?? loadRewardsState()
  const snapshot = buildLearnerSnapshot(settings)
  const weakSpots = snapshot.weakSpots.map((w) => ({ id: w.id, label: w.label }))
  const daily = syncDailyStarFromStores().snapshot

  return {
    todayDate: getTodayDateString(),
    dailyClosedToday: daily.dailyClosedToday,
    dayXOf7: daily.dayXOf7,
    dailyStar: mapDailyStar(rewards),
    catalog: getLessonTopicCatalog().map((t) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      enabled: t.enabled,
      hasTheory: t.hasTheory,
      hasPractice: t.hasPractice,
      level: t.level,
    })),
    lessons: mapLessonProgress(),
    rewards: mapRewards(rewards),
    practiceCompleted: mapPracticeSessions(),
    daysSinceLastActive: snapshot.daysSinceLastActive,
    weakSpots,
    anchorLevel: normalizeAnchorLevel(settings.level),
    audience: settings.audience === 'child' ? 'child' : 'adult',
    attentionZones: extras?.attentionZones,
    canUseAiReinforce: extras?.canUseAiReinforce,
    recentSoftKeys: extras?.recentSoftKeys,
    hadChat: hadChatFromRewards(rewards),
    hadCall: hadCallFromRewards(rewards),
  }
}
