import type { MyPlanLessonProgressSlice } from '@/lib/myPlan/types'

export type LessonPlanState = 'not_started' | 'in_progress' | 'improve_medal' | 'done_path'

/** Canonical lesson state for My Plan ranking (continue vs improve vs done). */
export function classifyLessonPlanState(p: MyPlanLessonProgressSlice): LessonPlanState {
  const done = isLessonTheoryDone(p)
  if (done) {
    return p.medal === 'gold' ? 'done_path' : 'improve_medal'
  }
  if ((p.completedSteps?.length ?? 0) > 0) return 'in_progress'
  return 'not_started'
}

export function isLessonTheoryDone(p: Pick<MyPlanLessonProgressSlice, 'lastCompleted' | 'lessonCompleted'>): boolean {
  return p.lessonCompleted === true || Boolean(p.lastCompleted?.trim())
}

export function isLessonInProgress(p: MyPlanLessonProgressSlice): boolean {
  return classifyLessonPlanState(p) === 'in_progress'
}
