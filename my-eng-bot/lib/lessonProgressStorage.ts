import { migrateUserLessonProgress } from '@/lib/lessonProgressMigration'
import type { PostLessonAction } from '@/types/lesson'
import type { UserLessonProgress } from '@/types/userProgress'
import { noteLocalLessonProgressWrite } from '@/lib/lessonProgress/supabaseSync'

const LESSON_PROGRESS_STORAGE_KEY = 'my-eng-bot-lesson-progress'

type StoredLessonProgressMap = Record<string, UserLessonProgress>

function normalizeProgressMap(value: unknown): StoredLessonProgressMap {
  if (!value || typeof value !== 'object') return {}
  const entries = Object.entries(value as Record<string, unknown>)
  const next: StoredLessonProgressMap = {}
  for (const [lessonId, progress] of entries) {
    if (!progress || typeof progress !== 'object') continue
    next[lessonId] = migrateUserLessonProgress(progress as Partial<UserLessonProgress>, lessonId)
  }
  return next
}

export function loadLessonProgressMap(): StoredLessonProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
    if (!raw) return {}
    return normalizeProgressMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

/**
 * Sync void write. Cloud sync (if enabled) is fire-and-forget via noteLocalLessonProgressWrite.
 * Supabase later: do not make this async — AppShell / antiFarm depend on sync API.
 */
export function saveLessonProgress(progress: UserLessonProgress): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadLessonProgressMap()
    const migrated = migrateUserLessonProgress(progress, progress.lessonId)
    current[migrated.lessonId] = migrated
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(current))
    noteLocalLessonProgressWrite(migrated)
  } catch {
    // ignore
  }
}

export function loadLessonProgress(lessonId: string): UserLessonProgress | null {
  const current = loadLessonProgressMap()
  return current[lessonId] ?? null
}

export type { PostLessonAction }
