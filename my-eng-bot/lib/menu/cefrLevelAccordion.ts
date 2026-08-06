import {
  classifyLessonPlanState,
  type LessonPlanState,
} from '@/lib/myPlan/lessonPlanState'
import type { MyPlanLessonProgressSlice } from '@/lib/myPlan/types'

/** CEFR bands shown in menu level accordions (A1–B2). */
export type CefrMenuLevel = 'A1' | 'A2' | 'B1' | 'B2'

export const CEFR_MENU_LEVELS: readonly CefrMenuLevel[] = ['A1', 'A2', 'B1', 'B2'] as const

export type TheoryLessonSource = 'cef_levels' | 'tag_browse'

export type LevelProgressSummary = {
  done: number
  total: number
  inProgress: number
  /** Compact label for level header, e.g. `12/30 · 5 в процессе`. */
  label: string
}

export type AccordionRestoreResult = {
  lessonsPanel: 'theoryCefrLevels' | 'theoryTagLevels'
  expand: CefrMenuLevel | null
  selectedLessonId: string | null
}

function asCefrMenuLevel(raw: string | null | undefined): CefrMenuLevel | null {
  if (raw === 'A1' || raw === 'A2' || raw === 'B1' || raw === 'B2') return raw
  return null
}

/** Map settings.level (and aliases) to accordion CEFR band. */
export function settingsLevelToCefr(level: string | null | undefined): CefrMenuLevel {
  const n = (level ?? '').trim().toLowerCase()
  if (n === 'a1' || n === 'starter') return 'A1'
  if (n === 'a2') return 'A2'
  if (n === 'b1') return 'B1'
  if (n === 'b2') return 'B2'
  return 'A1'
}

export function toggleExpandedLevel(
  expanded: ReadonlySet<CefrMenuLevel>,
  level: CefrMenuLevel
): Set<CefrMenuLevel> {
  const next = new Set(expanded)
  if (next.has(level)) next.delete(level)
  else next.add(level)
  return next
}

export function initialExpandedForProfile(level: string | null | undefined): Set<CefrMenuLevel> {
  return new Set([settingsLevelToCefr(level)])
}

/** Prefer profile level when present in available; else first available. */
export function pickDefaultExpandLevel(
  preferred: CefrMenuLevel,
  available: readonly CefrMenuLevel[]
): CefrMenuLevel | null {
  if (available.length === 0) return null
  if (available.includes(preferred)) return preferred
  return available[0] ?? null
}

function toPlanSlice(
  progress: Partial<MyPlanLessonProgressSlice> | null | undefined
): MyPlanLessonProgressSlice {
  return {
    lessonId: progress?.lessonId ?? '',
    topic: progress?.topic ?? '',
    completedSteps: progress?.completedSteps ?? [],
    lastCompleted: progress?.lastCompleted ?? '',
    mistakesCount: progress?.mistakesCount ?? 0,
    medal: progress?.medal ?? null,
    lessonCompleted: progress?.lessonCompleted,
  }
}

function isDoneState(state: LessonPlanState): boolean {
  return state === 'done_path' || state === 'improve_medal'
}

/** Progress counts for a CEFR level header (lessons branch only). */
export function buildLevelProgressSummary(
  lessonIds: readonly string[],
  progressMap: Record<string, Partial<MyPlanLessonProgressSlice> | null | undefined>
): LevelProgressSummary {
  const total = lessonIds.length
  let done = 0
  let inProgress = 0
  for (const id of lessonIds) {
    const state = classifyLessonPlanState(toPlanSlice(progressMap[id]))
    if (isDoneState(state)) done += 1
    else if (state === 'in_progress') inProgress += 1
  }
  const label =
    inProgress > 0 ? `${done}/${total} · ${inProgress} в процессе` : `${done}/${total}`
  return { done, total, inProgress, label }
}

export type CefrAccordionRestoreInput = {
  lessonsPanel: string
  theoryLessonSource?: TheoryLessonSource | null
  theoryTagBrowseLevel?: string | null
  selectedLessonId?: string | null
}

/**
 * Remap legacy CEFR / syllabus leaf panels onto `theoryCefrLevels`.
 * Returns null when this restore path must not change the panel (e.g. tag_browse).
 */
export function resolveCefrAccordionRestore(
  input: CefrAccordionRestoreInput
): AccordionRestoreResult | null {
  const source = input.theoryLessonSource ?? null
  const selected = input.selectedLessonId ?? null

  if (source === 'tag_browse') return null

  if (input.lessonsPanel === 'a1' || input.lessonsPanel === 'a2') {
    // source === 'tag_browse' already returned null above.
    const expand: CefrMenuLevel = input.lessonsPanel === 'a1' ? 'A1' : 'A2'
    return { lessonsPanel: 'theoryCefrLevels', expand, selectedLessonId: selected }
  }

  if (
    input.lessonsPanel === 'referenceSyllabusThemes' ||
    input.lessonsPanel === 'referenceSyllabusLessons'
  ) {
    return {
      lessonsPanel: 'theoryCefrLevels',
      expand: asCefrMenuLevel(input.theoryTagBrowseLevel),
      selectedLessonId: selected,
    }
  }

  return null
}

export type TagAccordionRestoreInput = {
  lessonsPanel: string
  theoryLessonSource?: TheoryLessonSource | null
  theoryTagBrowseLevel?: string | null
  selectedLessonId?: string | null
}

/**
 * Remap tag-browse leaf panels onto `theoryTagLevels`.
 * Returns null when the panel is not a tag accordion restore candidate.
 */
export function resolveTagAccordionRestore(
  input: TagAccordionRestoreInput
): AccordionRestoreResult | null {
  const selected = input.selectedLessonId ?? null
  const source = input.theoryLessonSource ?? null

  if (input.lessonsPanel === 'theoryTagLessons') {
    return {
      lessonsPanel: 'theoryTagLevels',
      expand: asCefrMenuLevel(input.theoryTagBrowseLevel),
      selectedLessonId: selected,
    }
  }

  if (
    source === 'tag_browse' &&
    (input.lessonsPanel === 'a1' || input.lessonsPanel === 'a2')
  ) {
    const expand: CefrMenuLevel = input.lessonsPanel === 'a1' ? 'A1' : 'A2'
    return {
      lessonsPanel: 'theoryTagLevels',
      expand,
      selectedLessonId: selected,
    }
  }

  return null
}
