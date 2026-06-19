import type { LessonData } from '@/types/lesson'

const JSON_PILOT_IDS = new Set(['1'])

const tsLessonLoaders: Record<string, () => Promise<LessonData>> = {
  '1': async () => (await import('@/lib/lessons/its-time-to')).itsTimeToLesson,
  '2': async () => (await import('@/lib/lessons/who-likes')).whoLikesLesson,
  '3': async () => (await import('@/lib/lessons/embedded-questions')).embeddedQuestionsLesson,
  '4': async () => (await import('@/lib/lessons/introducing-yourself')).introducingYourselfLesson,
}

const lessonCache = new Map<string, LessonData>()
const inflight = new Map<string, Promise<LessonData | null>>()

async function fetchLessonJson(lessonId: string): Promise<LessonData | null> {
  if (typeof fetch !== 'function') return null
  try {
    const response = await fetch(`/data/lessons/${lessonId}.json`)
    if (!response.ok) return null
    const data = (await response.json()) as LessonData
    if (!data || data.id !== lessonId) return null
    return data
  } catch {
    return null
  }
}

async function loadFromTs(lessonId: string): Promise<LessonData | null> {
  const loader = tsLessonLoaders[lessonId]
  if (!loader) return null
  return loader()
}

export async function loadLessonById(lessonId: string): Promise<LessonData | null> {
  const id = lessonId.trim()
  if (!id) return null

  const cached = lessonCache.get(id)
  if (cached) return cached

  const pending = inflight.get(id)
  if (pending) return pending

  const task = (async () => {
    if (JSON_PILOT_IDS.has(id)) {
      const fromJson = await fetchLessonJson(id)
      if (fromJson) {
        lessonCache.set(id, fromJson)
        return fromJson
      }
    }

    const fromTs = await loadFromTs(id)
    if (fromTs) lessonCache.set(id, fromTs)
    return fromTs
  })()

  inflight.set(id, task)
  try {
    return await task
  } finally {
    inflight.delete(id)
  }
}

export function getCachedLessonById(lessonId: string): LessonData | null {
  return lessonCache.get(lessonId) ?? null
}

export function primeLessonCache(lessonId: string, lesson: LessonData): void {
  lessonCache.set(lessonId, lesson)
}

export function clearLessonCache(): void {
  lessonCache.clear()
  inflight.clear()
}

export function isJsonPilotLessonId(lessonId: string): boolean {
  return JSON_PILOT_IDS.has(lessonId)
}
