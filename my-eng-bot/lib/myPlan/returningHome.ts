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
 * Returning home after hydrate. Explicit bridge intents win over myPlan.
 * Returns null when caller should keep default view.
 */
export function resolveReturningHomeMenuView(params: {
  myPlanHomeEnabled: boolean
  hasAnyHistory: boolean
  branchIntent: StartBranchIntent | undefined | null
}): ReturningHomeMenuView | null {
  if (params.branchIntent === 'chat') return 'aiChat'
  if (params.branchIntent === 'hub') return 'lessons'
  if (params.myPlanHomeEnabled && params.hasAnyHistory) return 'myPlan'
  return null
}
