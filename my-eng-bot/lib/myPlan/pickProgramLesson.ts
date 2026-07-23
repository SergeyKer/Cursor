import type { LessonCatalogLevel } from '@/lib/lessonCatalog'
import type {
  MyPlanCatalogTopic,
  MyPlanLessonProgressSlice,
  ProgramStatus,
} from '@/lib/myPlan/types'
import type { LevelId } from '@/lib/types'

export function normalizeAnchorLevel(settingsLevel: LevelId | string | null | undefined): LessonCatalogLevel {
  const raw = (settingsLevel || 'a2').toLowerCase().trim()
  if (raw === 'starter') return 'A1'
  if (raw === 'all') return 'A2'
  if (raw === 'a1') return 'A1'
  if (raw === 'a2') return 'A2'
  if (raw === 'b1') return 'B1'
  if (raw === 'b2') return 'B2'
  if (raw === 'c1') return 'C1'
  if (raw === 'c2') return 'C2'
  return 'A2'
}

function isTheoryDone(p: MyPlanLessonProgressSlice | undefined): boolean {
  return Boolean(p?.lastCompleted?.trim())
}

function isIncomplete(p: MyPlanLessonProgressSlice | undefined): boolean {
  return Boolean(p) && !isTheoryDone(p) && (p!.completedSteps?.length ?? 0) > 0
}

function isUnstarted(p: MyPlanLessonProgressSlice | undefined): boolean {
  return !p || (!isTheoryDone(p) && (p.completedSteps?.length ?? 0) === 0)
}

export function pickProgramLesson(params: {
  catalog: MyPlanCatalogTopic[]
  lessons: Record<string, MyPlanLessonProgressSlice>
  anchorLevel: LessonCatalogLevel
}): {
  status: ProgramStatus
  lesson: MyPlanCatalogTopic | null
  unstartedCount: number
} {
  const pool = params.catalog
    .filter((t) => t.enabled && t.hasTheory && t.level === params.anchorLevel)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  const unstartedList = pool.filter((t) => isUnstarted(params.lessons[t.id]))
  const unstartedCount = unstartedList.length

  if (pool.length === 0) {
    return { status: 'no_catalog', lesson: null, unstartedCount: 0 }
  }

  if (pool.some((t) => isIncomplete(params.lessons[t.id]))) {
    return { status: 'blocked_by_incomplete', lesson: null, unstartedCount }
  }

  const firstUnstarted = unstartedList[0] ?? null
  if (firstUnstarted) {
    return { status: 'active', lesson: firstUnstarted, unstartedCount }
  }

  if (pool.every((t) => isTheoryDone(params.lessons[t.id]))) {
    return { status: 'level_complete', lesson: null, unstartedCount: 0 }
  }

  return { status: 'no_unstarted', lesson: null, unstartedCount: 0 }
}
