export type LessonListDensity = 1 | 2 | 3

export const DEFAULT_LESSON_LIST_DENSITY: LessonListDensity = 2

export const LESSON_LIST_DENSITY_STORAGE_KEY = 'myeng-lesson-list-density'

export function normalizeMenuLabelKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseLessonListDensity(raw: unknown): LessonListDensity {
  if (raw === 1 || raw === '1') return 1
  if (raw === 2 || raw === '2') return 2
  if (raw === 3 || raw === '3') return 3
  return DEFAULT_LESSON_LIST_DENSITY
}

export function readLessonListDensity(): LessonListDensity {
  if (typeof window === 'undefined') return DEFAULT_LESSON_LIST_DENSITY
  try {
    return parseLessonListDensity(window.localStorage.getItem(LESSON_LIST_DENSITY_STORAGE_KEY))
  } catch {
    return DEFAULT_LESSON_LIST_DENSITY
  }
}

export function writeLessonListDensity(value: LessonListDensity): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LESSON_LIST_DENSITY_STORAGE_KEY, String(value))
  } catch {
    // ignore quota / private mode
  }
}

export function resolveLessonRowLines({
  density,
  label,
  subtitle,
  description,
}: {
  density?: LessonListDensity
  label: string
  subtitle?: string
  description?: string
}): { showSubtitle: boolean; showDescription: boolean } {
  const baseSubtitle =
    Boolean(subtitle?.trim()) && normalizeMenuLabelKey(subtitle!) !== normalizeMenuLabelKey(label)
  const baseDescription = Boolean(description?.trim())
  const level = density ?? 3
  return {
    showSubtitle: baseSubtitle && level >= 2,
    showDescription: baseDescription && level >= 3,
  }
}
