import type { PostLessonAction } from '@/types/lesson'
import type { UserLessonProgress } from '@/types/userProgress'

const LESSON_PROGRESS_STORAGE_KEY = 'my-eng-bot-lesson-progress'

type StoredLessonProgressMap = Record<string, UserLessonProgress>

function normalizeProgressMap(value: unknown): StoredLessonProgressMap {
  if (!value || typeof value !== 'object') return {}
  const entries = Object.entries(value as Record<string, unknown>)
  const next: StoredLessonProgressMap = {}
  for (const [lessonId, progress] of entries) {
    if (!progress || typeof progress !== 'object') continue
    const row = progress as Partial<UserLessonProgress>
    next[lessonId] = {
      lessonId,
      topic: typeof row.topic === 'string' ? row.topic : '',
      level: typeof row.level === 'string' ? row.level : '',
      completedSteps: Array.isArray(row.completedSteps) ? row.completedSteps.filter((v) => typeof v === 'number') : [],
      completedVariants: Array.isArray(row.completedVariants)
        ? row.completedVariants.filter((v) => typeof v === 'number')
        : [],
      xp: typeof row.xp === 'number' ? row.xp : 0,
      combo: typeof row.combo === 'number' ? row.combo : 0,
      mistakes: Array.isArray(row.mistakes)
        ? row.mistakes.filter(
            (item): item is UserLessonProgress['mistakes'][number] =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof (item as { step?: unknown }).step === 'number' &&
              typeof (item as { userAnswer?: unknown }).userAnswer === 'string' &&
              typeof (item as { correctAnswer?: unknown }).correctAnswer === 'string'
          )
        : [],
      lastCompleted: typeof row.lastCompleted === 'string' ? row.lastCompleted : '',
      ...(typeof row.postLessonChoice === 'string'
        ? { postLessonChoice: row.postLessonChoice as PostLessonAction }
        : {}),
    }
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

export function saveLessonProgress(progress: UserLessonProgress): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadLessonProgressMap()
    current[progress.lessonId] = progress
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
}

export function loadLessonProgress(lessonId: string): UserLessonProgress | null {
  const current = loadLessonProgressMap()
  return current[lessonId] ?? null
}
