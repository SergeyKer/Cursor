import type { AccentBlockFeedback, AccentLessonProgress, AccentLessonStage, AccentProgressSummary } from '@/types/accent'

const STORAGE_KEY = 'myeng.accent.progress.v1'
const STORAGE_VERSION = 1
const MAX_COMPLETED_DATES = 40

const STAGE_THRESHOLDS: Array<{ stage: AccentLessonStage; successfulAttempts: number; label: string }> = [
  { stage: 'new', successfulAttempts: 0, label: 'Новый звук' },
  { stage: 'started', successfulAttempts: 1, label: 'Старт есть' },
  { stage: 'in_progress', successfulAttempts: 3, label: 'Набираем устойчивость' },
  { stage: 'first_shift', successfulAttempts: 5, label: 'Первые сдвиги' },
  { stage: 'stabilizing', successfulAttempts: 10, label: 'Стабилизация' },
  { stage: 'anchoring', successfulAttempts: 15, label: 'Закрепление' },
  { stage: 'maintenance', successfulAttempts: 20, label: 'Поддержание' },
]

type ProgressMap = Record<string, AccentLessonProgress>

function createEmptyProgress(lessonId: string): AccentLessonProgress {
  return {
    lessonId,
    version: STORAGE_VERSION,
    attempts: 0,
    successfulAttempts: 0,
    lastScore: 0,
    bestScore: 0,
    lastCompletedAt: null,
    completedDates: [],
    stage: 'new',
  }
}

function getStage(successfulAttempts: number): AccentLessonStage {
  return [...STAGE_THRESHOLDS]
    .reverse()
    .find((entry) => successfulAttempts >= entry.successfulAttempts)?.stage ?? 'new'
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
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
  } catch {
    // Local progress is helpful, not required for the lesson to work.
  }
}

export function getAccentLessonProgress(lessonId: string): AccentLessonProgress {
  const stored = readMap()[lessonId]
  if (!stored || stored.version !== STORAGE_VERSION) return createEmptyProgress(lessonId)
  return {
    ...createEmptyProgress(lessonId),
    ...stored,
    completedDates: Array.isArray(stored.completedDates) ? stored.completedDates.slice(0, MAX_COMPLETED_DATES) : [],
    stage: getStage(Math.max(0, Number(stored.successfulAttempts) || 0)),
  }
}

export function summarizeAccentProgress(lessonId: string): AccentProgressSummary {
  const progress = getAccentLessonProgress(lessonId)
  const next = STAGE_THRESHOLDS.find((entry) => entry.successfulAttempts > progress.successfulAttempts)
  const current = [...STAGE_THRESHOLDS].reverse().find((entry) => progress.successfulAttempts >= entry.successfulAttempts)

  return {
    progress,
    remainingToNextStage: next ? Math.max(0, next.successfulAttempts - progress.successfulAttempts) : 0,
    nextStage: next?.stage ?? null,
    label: current?.label ?? 'Новый звук',
  }
}

export function recordAccentBlockFeedback(feedback: AccentBlockFeedback): AccentLessonProgress {
  const map = readMap()
  const previous = getAccentLessonProgress(feedback.lessonId)
  const now = new Date().toISOString()
  const isSuccessful = feedback.score >= 80
  const next: AccentLessonProgress = {
    ...previous,
    attempts: previous.attempts + 1,
    successfulAttempts: previous.successfulAttempts + (isSuccessful ? 1 : 0),
    lastScore: feedback.score,
    bestScore: Math.max(previous.bestScore, feedback.score),
    lastCompletedAt: now,
    completedDates: [now, ...previous.completedDates].slice(0, MAX_COMPLETED_DATES),
  }
  next.stage = getStage(next.successfulAttempts)
  map[feedback.lessonId] = next
  writeMap(map)
  return next
}

export function resetAccentProgressForTests(): void {
  if (!isStorageAvailable()) return
  window.localStorage.removeItem(STORAGE_KEY)
}
