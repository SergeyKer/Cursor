import { applyVocabularyReview, createEmptyWordProgress } from '@/lib/vocabulary/srs'
import type {
  VocabularyProgressState,
  VocabularySessionHistoryItem,
  VocabularyWordProgress,
  VocabularyWorldId,
} from '@/types/vocabulary'

const STORAGE_KEY = 'my-eng-bot-vocabulary-progress'
const STORAGE_VERSION = 1
const MAX_HISTORY = 40

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function createEmptyVocabularyProgress(): VocabularyProgressState {
  return {
    schemaVersion: STORAGE_VERSION,
    stats: {
      coins: 0,
      streak: 0,
      level: 1,
      unlockedWorldIds: ['home'],
      completedSessions: 0,
    },
    words: {},
    history: [],
  }
}

function normalizeWordProgress(raw: unknown): VocabularyWordProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<VocabularyWordProgress>
  if (typeof row.wordId !== 'number') return null

  return {
    wordId: row.wordId,
    stage: typeof row.stage === 'number' ? Math.max(0, Math.floor(row.stage)) : 0,
    attempts: typeof row.attempts === 'number' ? Math.max(0, Math.floor(row.attempts)) : 0,
    successes: typeof row.successes === 'number' ? Math.max(0, Math.floor(row.successes)) : 0,
    failures: typeof row.failures === 'number' ? Math.max(0, Math.floor(row.failures)) : 0,
    lastReviewedAt: typeof row.lastReviewedAt === 'number' ? row.lastReviewedAt : null,
    nextReviewAt: typeof row.nextReviewAt === 'number' ? row.nextReviewAt : null,
  }
}

function normalizeProgress(raw: unknown): VocabularyProgressState {
  const fallback = createEmptyVocabularyProgress()
  if (!raw || typeof raw !== 'object') return fallback

  const source = raw as Partial<VocabularyProgressState>
  const words = Object.fromEntries(
    Object.entries(source.words ?? {})
      .map(([key, value]) => [key, normalizeWordProgress(value)])
      .filter((entry): entry is [string, VocabularyWordProgress] => Boolean(entry[1]))
  )

  const history = Array.isArray(source.history)
    ? source.history.filter(
        (item): item is VocabularySessionHistoryItem =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as VocabularySessionHistoryItem).id === 'string' &&
          typeof (item as VocabularySessionHistoryItem).worldId === 'string'
      ).slice(0, MAX_HISTORY)
    : []

  return {
    schemaVersion: STORAGE_VERSION,
    stats: {
      coins: typeof source.stats?.coins === 'number' ? source.stats.coins : 0,
      streak: typeof source.stats?.streak === 'number' ? source.stats.streak : 0,
      level: typeof source.stats?.level === 'number' ? source.stats.level : 1,
      unlockedWorldIds: Array.isArray(source.stats?.unlockedWorldIds) && source.stats?.unlockedWorldIds.length > 0
        ? (source.stats.unlockedWorldIds as VocabularyWorldId[])
        : ['home'],
      completedSessions: typeof source.stats?.completedSessions === 'number' ? source.stats.completedSessions : 0,
    },
    words,
    history,
  }
}

export function loadVocabularyProgress(): VocabularyProgressState {
  if (!canUseStorage()) return createEmptyVocabularyProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyVocabularyProgress()
    return normalizeProgress(JSON.parse(raw))
  } catch {
    return createEmptyVocabularyProgress()
  }
}

export function saveVocabularyProgress(state: VocabularyProgressState): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Local progress is best-effort only.
  }
}

export function recordWordReview(params: {
  state: VocabularyProgressState
  wordId: number
  wasCorrect: boolean
  now?: number
}): VocabularyProgressState {
  const now = params.now ?? Date.now()
  const current = params.state.words[String(params.wordId)] ?? createEmptyWordProgress(params.wordId)
  const nextProgress = applyVocabularyReview(current, params.wasCorrect, now)

  return {
    ...params.state,
    words: {
      ...params.state.words,
      [String(params.wordId)]: nextProgress,
    },
  }
}

export function unlockWorld(state: VocabularyProgressState, worldId: VocabularyWorldId): VocabularyProgressState {
  if (state.stats.unlockedWorldIds.includes(worldId)) return state
  return {
    ...state,
    stats: {
      ...state.stats,
      unlockedWorldIds: [...state.stats.unlockedWorldIds, worldId],
    },
  }
}

export function finalizeVocabularySession(params: {
  state: VocabularyProgressState
  historyItem: VocabularySessionHistoryItem
  coinsEarned: number
}): VocabularyProgressState {
  const nextCoins = params.state.stats.coins + params.coinsEarned
  const nextCompletedSessions = params.state.stats.completedSessions + 1
  const nextLevel = Math.max(1, Math.floor(nextCoins / 120) + 1)

  return {
    ...params.state,
    stats: {
      ...params.state.stats,
      coins: nextCoins,
      level: nextLevel,
      streak: params.state.stats.streak + 1,
      completedSessions: nextCompletedSessions,
    },
    history: [params.historyItem, ...params.state.history].slice(0, MAX_HISTORY),
  }
}

export function resetVocabularyProgressForTests(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(STORAGE_KEY)
}
