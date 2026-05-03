import type { AccentBlockFeedback, AccentBlockType, AccentLessonProgress, AccentProgressSummary } from '@/types/accent'

const STORAGE_KEY = 'myeng.accent.progress.v1'
const STORAGE_VERSION = 2
const MAX_COMPLETED_DATES = 40
const SEGMENT_TARGET = 20
const PROGRESS_UPDATED_EVENT = 'myeng:accent-progress-updated'

const BLOCK_TYPES: AccentBlockType[] = ['words', 'pairs', 'progressive']

type ProgressMap = Record<string, AccentLessonProgress>

function createEmptySegmentMap(): Record<AccentBlockType, number> {
  return {
    words: 0,
    pairs: 0,
    progressive: 0,
  }
}

function createEmptyProgress(lessonId: string): AccentLessonProgress {
  return {
    lessonId,
    version: STORAGE_VERSION,
    attempts: 0,
    lastScore: 0,
    bestScore: 0,
    lastCompletedAt: null,
    completedDates: [],
    segmentAttempts: createEmptySegmentMap(),
    segmentSuccessfulAttempts: createEmptySegmentMap(),
  }
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeSegmentMap(value: unknown): Record<AccentBlockType, number> {
  const initial = createEmptySegmentMap()
  if (!value || typeof value !== 'object') return initial
  for (const blockType of BLOCK_TYPES) {
    const raw = (value as Record<string, unknown>)[blockType]
    const numeric = Number(raw)
    initial[blockType] = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0
  }
  return initial
}

function migrateLegacyProgress(raw: unknown, lessonId: string): AccentLessonProgress {
  const initial = createEmptyProgress(lessonId)
  if (!raw || typeof raw !== 'object') return initial
  const source = raw as Record<string, unknown>
  const successfulAttempts = Math.max(0, Math.floor(Number(source.successfulAttempts) || 0))
  const attempts = Math.max(0, Math.floor(Number(source.attempts) || 0))
  return {
    ...initial,
    attempts,
    lastScore: Number(source.lastScore) || 0,
    bestScore: Number(source.bestScore) || 0,
    lastCompletedAt: typeof source.lastCompletedAt === 'string' ? source.lastCompletedAt : null,
    completedDates: Array.isArray(source.completedDates) ? source.completedDates.filter((date): date is string => typeof date === 'string').slice(0, MAX_COMPLETED_DATES) : [],
    segmentAttempts: {
      words: attempts,
      pairs: attempts,
      progressive: attempts,
    },
    segmentSuccessfulAttempts: {
      words: Math.min(SEGMENT_TARGET, successfulAttempts),
      pairs: Math.min(SEGMENT_TARGET, successfulAttempts),
      progressive: Math.min(SEGMENT_TARGET, successfulAttempts),
    },
  }
}

function readMap(): ProgressMap {
  if (!isStorageAvailable()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ProgressMap
  } catch {
    return {}
  }
}

function writeMap(map: ProgressMap): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT))
  } catch {
    // Local progress is helpful, not required for the lesson to work.
  }
}

export function getAccentLessonProgress(lessonId: string): AccentLessonProgress {
  const stored = readMap()[lessonId]
  if (!stored) return createEmptyProgress(lessonId)
  if (stored.version !== STORAGE_VERSION) return migrateLegacyProgress(stored, lessonId)
  return {
    ...createEmptyProgress(lessonId),
    ...stored,
    completedDates: Array.isArray(stored.completedDates) ? stored.completedDates.slice(0, MAX_COMPLETED_DATES) : [],
    segmentAttempts: normalizeSegmentMap(stored.segmentAttempts),
    segmentSuccessfulAttempts: normalizeSegmentMap(stored.segmentSuccessfulAttempts),
  }
}

export function summarizeAccentProgress(lessonId: string): AccentProgressSummary {
  return {
    progress: getAccentLessonProgress(lessonId),
  }
}

export function recordAccentBlockFeedback(feedback: AccentBlockFeedback): AccentLessonProgress {
  const map = readMap()
  const previous = getAccentLessonProgress(feedback.lessonId)
  const now = new Date().toISOString()
  const isSuccessful = feedback.score >= 80
  const previousBlockAttempts = previous.segmentAttempts[feedback.blockType] ?? 0
  const previousBlockSuccessfulAttempts = previous.segmentSuccessfulAttempts[feedback.blockType] ?? 0
  const next: AccentLessonProgress = {
    ...previous,
    attempts: previous.attempts + 1,
    lastScore: feedback.score,
    bestScore: Math.max(previous.bestScore, feedback.score),
    lastCompletedAt: now,
    completedDates: [now, ...previous.completedDates].slice(0, MAX_COMPLETED_DATES),
    segmentAttempts: {
      ...previous.segmentAttempts,
      [feedback.blockType]: previousBlockAttempts + 1,
    },
    segmentSuccessfulAttempts: {
      ...previous.segmentSuccessfulAttempts,
      [feedback.blockType]: isSuccessful
        ? Math.min(SEGMENT_TARGET, previousBlockSuccessfulAttempts + 1)
        : previousBlockSuccessfulAttempts,
    },
  }
  map[feedback.lessonId] = next
  writeMap(map)
  return next
}

export function subscribeAccentProgress(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(PROGRESS_UPDATED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(PROGRESS_UPDATED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function resetAccentProgressForTests(): void {
  if (!isStorageAvailable()) return
  window.localStorage.removeItem(STORAGE_KEY)
}
