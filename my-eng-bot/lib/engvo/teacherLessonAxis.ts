import type { EngvoCefrLevel } from '@/lib/engvo/constants'
import type { EngvoTeacherDrillKind, EngvoTeacherLessonAxisPrompt } from '@/lib/engvo/sessionKind'
import {
  ENGVO_DEFAULT_TEACHER_DRILL_KIND,
  normalizeEngvoTeacherDrillKind,
  normalizeEngvoTeacherLessonId,
} from '@/lib/engvo/sessionKind'
import {
  LESSON_AXIS_MENU_LEVEL_IDS,
  clampLevelForLessonAxis,
  getLessonRuSeeds,
  lessonExistsAndEnabled,
  listEnabledTranslationLessonsForLevel,
  menuLevelIdForConcreteTranslationLesson,
  normalizeLessonForLevel,
  resolveEffectiveTranslationLessonId,
  resolveLessonTranslationMeta,
} from '@/lib/lessonTranslationBridge'
import type { Audience, LevelId } from '@/lib/types'

export type TeacherLessonAxisResolveInput = {
  sessionKind: 'teacher' | 'free_call' | string
  drillKind: EngvoTeacherDrillKind | string | null | undefined
  lessonId: string | null | undefined
  level: EngvoCefrLevel | LevelId
  sessionSeed: string
  /** Pin for `'all'` within one call — do not re-roll. */
  pinnedEffectiveLessonId?: string | null
}

export type TeacherLessonAxisInactive = { active: false }

export type TeacherLessonAxisActive = {
  active: true
  effectiveLessonId: string
  title: string
  grammarFocusLines: string[]
  ruSeeds: string[]
  inferredTense: ReturnType<typeof resolveLessonTranslationMeta>['gradingTense']
}

export type TeacherLessonAxisResolveResult = TeacherLessonAxisInactive | TeacherLessonAxisActive

export function isEngvoTeacherLessonTopicKind(
  kind: EngvoTeacherDrillKind | string | null | undefined
): boolean {
  return normalizeEngvoTeacherDrillKind(kind) === 'lesson_topic'
}

/** Menu incomplete: block CTA when lesson axis cannot start safely. */
export function isEngvoTeacherLessonAxisIncomplete(params: {
  sessionKind: string
  drillKind: EngvoTeacherDrillKind | string | null | undefined
  lessonId: string | null | undefined
  level: EngvoCefrLevel | LevelId
}): boolean {
  if (params.sessionKind !== 'teacher') return false
  if (!isEngvoTeacherLessonTopicKind(params.drillKind)) return false
  const lessonId = normalizeEngvoTeacherLessonId(params.lessonId)
  if (lessonId == null) return true
  const level = clampLevelForLessonAxis(params.level as LevelId)
  if (lessonId === 'all') {
    return listEnabledTranslationLessonsForLevel(level).length === 0
  }
  return !lessonExistsAndEnabled(lessonId)
}

/** Concrete lesson on teacher lesson axis → hide level row / lock CEFR from catalog. */
export function isEngvoTeacherLevelLocked(params: {
  sessionKind: string
  drillKind: EngvoTeacherDrillKind | string | null | undefined
  lessonId: string | null | undefined
}): boolean {
  if (params.sessionKind !== 'teacher') return false
  if (!isEngvoTeacherLessonTopicKind(params.drillKind)) return false
  const id = normalizeEngvoTeacherLessonId(params.lessonId)
  return typeof id === 'string' && id !== '' && id !== 'all'
}

export function syncEngvoCefrFromConcreteLesson(
  lessonId: string | null | undefined
): EngvoCefrLevel | null {
  const level = menuLevelIdForConcreteTranslationLesson(lessonId)
  if (!level || level === 'all' || level === 'starter') return null
  if (level === 'a1' || level === 'a2' || level === 'b1' || level === 'b2' || level === 'c1' || level === 'c2') {
    return level
  }
  return null
}

/** Engvo level options allowed on lesson axis (no C1/C2; child → A1/A2). */
export function filterEngvoLevelsForLessonAxis(
  levels: readonly { id: EngvoCefrLevel; label: string }[],
  audience: Audience
): { id: EngvoCefrLevel; label: string }[] {
  const allowed = new Set(
    audience === 'child'
      ? (['a1', 'a2'] as EngvoCefrLevel[])
      : (LESSON_AXIS_MENU_LEVEL_IDS.filter((id) => id !== 'all') as EngvoCefrLevel[])
  )
  return levels.filter((l) => allowed.has(l.id))
}

export function clampEngvoCefrForLessonAxis(
  level: EngvoCefrLevel,
  audience: Audience
): EngvoCefrLevel {
  const clamped = clampLevelForLessonAxis(level) as EngvoCefrLevel
  if (audience === 'child' && (clamped === 'b1' || clamped === 'b2' || clamped === 'c1' || clamped === 'c2')) {
    return 'a2'
  }
  if (clamped === 'c1' || clamped === 'c2') return 'a2'
  return clamped
}

export function normalizeEngvoTeacherLessonForLevel(
  lessonId: string | null | undefined,
  level: EngvoCefrLevel | LevelId
): string | null {
  return normalizeLessonForLevel(lessonId, clampLevelForLessonAxis(level as LevelId))
}

/**
 * Fail-soft resolve of teacher lesson axis for prompts.
 * Call once in AppShell before bootstrap; pass pinned id on reconnect.
 */
export function resolveTeacherLessonAxis(
  input: TeacherLessonAxisResolveInput
): TeacherLessonAxisResolveResult {
  if (input.sessionKind !== 'teacher') return { active: false }
  if (!isEngvoTeacherLessonTopicKind(input.drillKind)) return { active: false }

  const selected = normalizeEngvoTeacherLessonId(input.lessonId)
  if (selected == null) return { active: false }

  const level = clampLevelForLessonAxis(input.level as LevelId)
  const effectiveLessonId = resolveEffectiveTranslationLessonId({
    translationLessonId: selected,
    level,
    dialogSeed: input.sessionSeed || 'engvo-teacher',
    drillIndex: 0,
    pinnedLessonId: input.pinnedEffectiveLessonId,
  })
  if (!effectiveLessonId) return { active: false }

  const meta = resolveLessonTranslationMeta(effectiveLessonId)
  const grammarFocusLines =
    meta.grammarFocusLines.length > 0 ? meta.grammarFocusLines : [meta.title]
  if (grammarFocusLines.length === 0 || !grammarFocusLines[0]?.trim()) {
    return { active: false }
  }

  const ruSeeds = getLessonRuSeeds(effectiveLessonId).filter((s) => s.trim())
  return {
    active: true,
    effectiveLessonId,
    title: meta.title,
    grammarFocusLines,
    ruSeeds: ruSeeds.length > 0 ? ruSeeds : ['Я учу английский.'],
    inferredTense: meta.gradingTense,
  }
}

export function toTeacherLessonAxisPrompt(
  axis: TeacherLessonAxisActive
): EngvoTeacherLessonAxisPrompt {
  return {
    effectiveLessonId: axis.effectiveLessonId,
    title: axis.title,
    grammarFocusLines: axis.grammarFocusLines,
    ruSeedOrientations: axis.ruSeeds.slice(0, 6),
  }
}

export function defaultTeacherDrillKind(): EngvoTeacherDrillKind {
  return ENGVO_DEFAULT_TEACHER_DRILL_KIND
}
