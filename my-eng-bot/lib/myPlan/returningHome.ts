import type { StartBranchIntent } from '@/lib/start/startBridge'

export type ReturningHomeMenuView = 'myPlan' | 'aiChat' | 'lessons'

export function hasAnyLearningHistory(params: {
  lastActiveDate: string | null | undefined
  lessonProgressCount: number
  signalCount: number
}): boolean {
  return (
    Boolean(params.lastActiveDate?.trim()) ||
    params.lessonProgressCount > 0 ||
    params.signalCount > 0
  )
}

/**
 * Deep-link / bridge intents only. My Plan opens from the start screen after audience.
 */
export function resolveReturningHomeMenuView(params: {
  branchIntent: StartBranchIntent | undefined | null
}): Extract<ReturningHomeMenuView, 'aiChat' | 'lessons'> | null {
  if (params.branchIntent === 'chat') return 'aiChat'
  if (params.branchIntent === 'hub') return 'lessons'
  return null
}

export function shouldOpenMyPlanHome(params: {
  myPlanHomeEnabled: boolean
  hasAnyHistory: boolean
}): boolean {
  return params.myPlanHomeEnabled && params.hasAnyHistory
}
