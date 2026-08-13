import type { NecessaryWord, VocabularyTempo, VocabularyWordProgress } from '@/types/vocabulary'
import { isWordMastered } from '@/lib/vocabulary/learned'

export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const

export const VOCAB_TEMPO_STORAGE_KEY = 'engvo_vocab_tempo'

export function createEmptyWordProgress(wordId: number): VocabularyWordProgress {
  return {
    wordId,
    stage: 0,
    attempts: 0,
    successes: 0,
    failures: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    spokenEnCount: 0,
    lastSpokenEnAt: null,
    phraseSpokenCount: 0,
    lastPhraseAt: null,
    feedStatus: 'none',
    useStreak: 0,
    checkPassedOnce: false,
    passedAt: null,
    source: 'catalog',
    lemmaKey: undefined,
    lastFocusUsedAt: null,
    userMark: null,
    firstAddedAt: null,
    masteredAt: null,
  }
}

/** Soft fail: stage −1 (not hard reset to 0). */
export function applyVocabularyReview(
  progress: VocabularyWordProgress,
  wasCorrect: boolean,
  now: number = Date.now()
): VocabularyWordProgress {
  const nextStage = wasCorrect
    ? Math.min(progress.stage + 1, SRS_INTERVAL_DAYS.length - 1)
    : Math.max(0, progress.stage - 1)
  const nextIntervalDays = SRS_INTERVAL_DAYS[nextStage]

  return {
    ...progress,
    stage: nextStage,
    attempts: progress.attempts + 1,
    successes: progress.successes + (wasCorrect ? 1 : 0),
    failures: progress.failures + (wasCorrect ? 0 : 1),
    lastReviewedAt: now,
    nextReviewAt: now + nextIntervalDays * 24 * 60 * 60 * 1000,
    checkPassedOnce: progress.checkPassedOnce || wasCorrect,
  }
}

export function isWordDue(progress: VocabularyWordProgress | null | undefined, now: number = Date.now()): boolean {
  if (!progress?.nextReviewAt) return true
  return progress.nextReviewAt <= now
}

export function resolveVocabularyTempo(preferred?: VocabularyTempo | null): VocabularyTempo {
  if (preferred === 'full' || preferred === 'sprint') return preferred
  if (typeof window === 'undefined') return 'sprint'
  try {
    const raw = window.localStorage.getItem(VOCAB_TEMPO_STORAGE_KEY)
    if (raw === 'full' || raw === 'sprint') return raw
  } catch {
    // ignore
  }
  return 'sprint'
}

export function saveVocabularyTempo(tempo: VocabularyTempo): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VOCAB_TEMPO_STORAGE_KEY, tempo)
  } catch {
    // ignore
  }
}

export function sessionSizeForTempo(tempo: VocabularyTempo, returnFlow = false): number {
  if (returnFlow) return 2
  return tempo === 'sprint' ? 3 : 5
}

export function pickNextSessionWords(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  size?: number
  maxFresh?: number
  now?: number
  /** Include returned even if not due by clock. */
  preferReturned?: boolean
}): NecessaryWord[] {
  const size = params.size ?? 5
  const now = params.now ?? Date.now()
  const maxFresh = params.maxFresh ?? 3

  const eligible = params.words.filter((word) => {
    const progress = params.progressMap[String(word.id)]
    if (isWordMastered(progress) && !isWordDue(progress, now)) return false
    if (progress?.feedStatus === 'in_feed') return false
    return word.status === 'active'
  })

  const returned = eligible.filter((word) => params.progressMap[String(word.id)]?.feedStatus === 'returned')
  const dueReview = eligible.filter((word) => {
    const progress = params.progressMap[String(word.id)]
    if (!progress?.attempts) return false
    if (progress.feedStatus === 'returned') return false
    return isWordDue(progress, now)
  })
  const fresh = eligible.filter((word) => !params.progressMap[String(word.id)]?.attempts)

  const result: NecessaryWord[] = []
  const pushUnique = (word: NecessaryWord) => {
    if (result.length >= size) return
    if (result.some((item) => item.id === word.id)) return
    result.push(word)
  }

  for (const word of returned) pushUnique(word)
  for (const word of dueReview) pushUnique(word)

  const hasReview = result.length > 0
  const freshCap = hasReview ? Math.min(maxFresh, size - result.length) : size - result.length
  let freshAdded = 0
  for (const word of fresh) {
    if (freshAdded >= freshCap) break
    const before = result.length
    pushUnique(word)
    if (result.length > before) freshAdded += 1
  }

  // Fill remainder without exceeding freshCap for never-attempted words
  for (const word of eligible) {
    if (result.length >= size) break
    const progress = params.progressMap[String(word.id)]
    const isFresh = !progress?.attempts
    if (isFresh && freshAdded >= freshCap) continue
    const before = result.length
    pushUnique(word)
    if (result.length > before && isFresh) freshAdded += 1
  }

  return result.slice(0, size)
}

export function buildSessionWords(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  size?: number
  now?: number
}): NecessaryWord[] {
  return pickNextSessionWords(params)
}

/** @deprecated используйте buildSessionWords / pickNextSessionWords */
export function buildWorldSessionWords(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  size?: number
  now?: number
}): NecessaryWord[] {
  return buildSessionWords(params)
}
