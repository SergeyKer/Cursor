import { normalizeVocabularySessionRoute } from '@/lib/vocabulary/sessionRoute'
import { isWordStrictlyLearned } from '@/lib/vocabulary/learned'
import { applyVocabularyReview, createEmptyWordProgress } from '@/lib/vocabulary/srs'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type {
  VocabularyFeedStatus,
  VocabularyProgressState,
  VocabularySessionHistoryItem,
  VocabularyWordProgress,
  VocabularyWordSource,
  VocabularyWorldId,
} from '@/types/vocabulary'

const STORAGE_KEY = 'my-eng-bot-vocabulary-progress'
const STORAGE_VERSION = 2
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

function normalizeFeedStatus(raw: unknown, row: Partial<VocabularyWordProgress>): VocabularyFeedStatus {
  if (raw === 'in_feed' || raw === 'mastered' || raw === 'returned' || raw === 'none') return raw
  // Legacy strict archive → mastered (browse continuity)
  if (isWordStrictlyLearned(row as VocabularyWordProgress)) return 'mastered'
  return 'none'
}

function normalizeWordProgress(raw: unknown): VocabularyWordProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<VocabularyWordProgress>
  if (typeof row.wordId !== 'number') return null

  const base: VocabularyWordProgress = {
    wordId: row.wordId,
    stage: typeof row.stage === 'number' ? Math.max(0, Math.floor(row.stage)) : 0,
    attempts: typeof row.attempts === 'number' ? Math.max(0, Math.floor(row.attempts)) : 0,
    successes: typeof row.successes === 'number' ? Math.max(0, Math.floor(row.successes)) : 0,
    failures: typeof row.failures === 'number' ? Math.max(0, Math.floor(row.failures)) : 0,
    lastReviewedAt: typeof row.lastReviewedAt === 'number' ? row.lastReviewedAt : null,
    nextReviewAt: typeof row.nextReviewAt === 'number' ? row.nextReviewAt : null,
    spokenEnCount: typeof row.spokenEnCount === 'number' ? Math.max(0, row.spokenEnCount) : 0,
    lastSpokenEnAt: typeof row.lastSpokenEnAt === 'number' ? row.lastSpokenEnAt : null,
    phraseSpokenCount: typeof row.phraseSpokenCount === 'number' ? Math.max(0, row.phraseSpokenCount) : 0,
    lastPhraseAt: typeof row.lastPhraseAt === 'number' ? row.lastPhraseAt : null,
    useStreak: typeof row.useStreak === 'number' ? Math.max(0, row.useStreak) : 0,
    checkPassedOnce: Boolean(row.checkPassedOnce),
    passedAt: typeof row.passedAt === 'number' ? row.passedAt : null,
    source: (['catalog', 'mistake', 'pack'] as VocabularyWordSource[]).includes(row.source as VocabularyWordSource)
      ? (row.source as VocabularyWordSource)
      : 'catalog',
    packId: typeof row.packId === 'string' ? row.packId : undefined,
    lemmaKey: typeof row.lemmaKey === 'string' ? row.lemmaKey : undefined,
    lastFocusUsedAt: typeof row.lastFocusUsedAt === 'number' ? row.lastFocusUsedAt : null,
  }

  return {
    ...base,
    feedStatus: normalizeFeedStatus(row.feedStatus, base),
    lemmaKey: base.lemmaKey,
  }
}

function normalizeHistoryItem(raw: unknown): VocabularySessionHistoryItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string') return null
  const route = normalizeVocabularySessionRoute(raw)
  if (!route) return null

  const reviewedWordIds = Array.isArray(row.reviewedWordIds)
    ? row.reviewedWordIds.filter((value): value is number => typeof value === 'number')
    : []
  const learnedWordIds = Array.isArray(row.learnedWordIds)
    ? row.learnedWordIds.filter((value): value is number => typeof value === 'number')
    : []
  const bankedWordIds = Array.isArray(row.bankedWordIds)
    ? row.bankedWordIds.filter((value): value is number => typeof value === 'number')
    : []

  return {
    id: row.id,
    route,
    startedAt: typeof row.startedAt === 'number' ? row.startedAt : 0,
    completedAt: typeof row.completedAt === 'number' ? row.completedAt : 0,
    reviewedWordIds,
    learnedWordIds,
    bankedWordIds,
    coinsEarned: typeof row.coinsEarned === 'number' ? row.coinsEarned : 0,
    promptPreview: typeof row.promptPreview === 'string' ? row.promptPreview : '',
    tempo: row.tempo === 'full' || row.tempo === 'sprint' ? row.tempo : undefined,
  }
}

function normalizeProgress(raw: unknown): VocabularyProgressState {
  const fallback = createEmptyVocabularyProgress()
  if (!raw || typeof raw !== 'object') return fallback

  const source = raw as Partial<VocabularyProgressState>
  const words = Object.fromEntries(
    Object.entries(source.words ?? {})
      .map(([key, value]) => {
        const normalized = normalizeWordProgress(value)
        if (!normalized) return [key, null] as const
        if (!normalized.lemmaKey && typeof normalized.wordId === 'number') {
          // lemmaKey filled later when word catalog known; keep as-is
        }
        return [key, normalized] as const
      })
      .filter((entry): entry is [string, VocabularyWordProgress] => Boolean(entry[1]))
  )

  const history = Array.isArray(source.history)
    ? source.history
        .map((item) => normalizeHistoryItem(item))
        .filter((item): item is VocabularySessionHistoryItem => Boolean(item))
        .slice(0, MAX_HISTORY)
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

export function patchWordProgress(
  state: VocabularyProgressState,
  wordId: number,
  patch: Partial<VocabularyWordProgress>
): VocabularyProgressState {
  const current = state.words[String(wordId)] ?? createEmptyWordProgress(wordId)
  const next = {
    ...current,
    ...patch,
    wordId,
    lemmaKey: patch.lemmaKey ?? current.lemmaKey ?? (typeof patch.lemmaKey === 'string' ? patch.lemmaKey : current.lemmaKey),
  }
  if (!next.lemmaKey && typeof (patch as { en?: string }).en === 'string') {
    next.lemmaKey = lemmaKeyFromEn((patch as { en: string }).en)
  }
  return {
    ...state,
    words: {
      ...state.words,
      [String(wordId)]: next,
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
  coinsEarned?: number
}): VocabularyProgressState {
  const coinsEarned = params.coinsEarned ?? 0
  const nextCoins = params.state.stats.coins + coinsEarned
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
