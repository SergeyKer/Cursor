export type LessonsCatalogIntent = 'lesson' | 'reference'

/** Entry panel when opening Уроки from root or openMenuAt('lessons'). */
export function resolveLessonsRootEntryPanel(): 'summary' {
  return 'summary'
}

/** Entry panel when opening Справочник from root (same menuView, different catalog). */
export function resolveReferenceRootEntryPanel(): 'theory' {
  return 'theory'
}

/** Root → lessons restore must not clobber Справочник with the Уроки hub. */
export function resolveRootLessonsRestorePanel(
  intent: LessonsCatalogIntent,
  explicitEntry?: 'summary' | 'theory'
): 'summary' | 'theory' {
  if (explicitEntry) return explicitEntry
  return intent === 'reference' ? resolveReferenceRootEntryPanel() : resolveLessonsRootEntryPanel()
}

/** Back from CEFR levels: lesson hub is summary; reference returns to theory hub. */
export function resolveTheoryCefrLevelsBackTarget(
  intent: LessonsCatalogIntent
): 'summary' | 'theory' {
  return intent === 'reference' ? 'theory' : 'summary'
}

/** Back from theory hub: lesson returns to Уроки hub, not CEFR. */
export function resolveTheoryHubBackTarget(intent: LessonsCatalogIntent): 'root' | 'summary' {
  return intent === 'reference' ? 'root' : 'summary'
}

/** Do not force summary when restoring a deep lessons panel. */
export function shouldForceLessonsSummaryOnRequest(): boolean {
  return false
}

/** Rows on the Уроки hub (CEFR catalog is one click deeper). */
export const LESSONS_HUB_ROW_IDS = [
  'cefrLevels',
  'words',
  'pronunciation',
  'tutor',
  'theoryByTag',
] as const
