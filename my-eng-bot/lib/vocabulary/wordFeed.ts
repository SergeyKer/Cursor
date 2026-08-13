import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import type {
  NecessaryWord,
  VocabularyFeedStatus,
  VocabularyFocusLemma,
  VocabularyUserMark,
  VocabularyWordProgress,
  VocabularyWordSource,
} from '@/types/vocabulary'

const FOCUS_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const MASTERED_USE_STREAK = 2

export function lemmaKeyFromEn(en: string): string {
  return en.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type MarkWordPassedInput = {
  progress: VocabularyWordProgress
  checkPassed: boolean
  speakPassed: boolean
  phrasePassed: boolean
  phraseRequired: boolean
  now?: number
  source?: VocabularyWordSource
  packId?: string
  lemmaKey?: string
}

export function canMarkWordPassed(input: MarkWordPassedInput): boolean {
  if (!input.checkPassed) return false
  if (!input.speakPassed) return false
  if (input.phraseRequired && !input.phrasePassed) return false
  return true
}

export function markWordPassed(input: MarkWordPassedInput): VocabularyWordProgress | null {
  if (!canMarkWordPassed(input)) return null
  const now = input.now ?? Date.now()
  return {
    ...input.progress,
    feedStatus: 'in_feed',
    passedAt: now,
    checkPassedOnce: true,
    spokenEnCount: Math.max(1, input.progress.spokenEnCount ?? 0),
    lastSpokenEnAt: now,
    phraseSpokenCount: input.phrasePassed
      ? Math.max(1, (input.progress.phraseSpokenCount ?? 0) + 1)
      : input.progress.phraseSpokenCount ?? 0,
    lastPhraseAt: input.phrasePassed ? now : input.progress.lastPhraseAt ?? null,
    source: input.source ?? input.progress.source ?? 'catalog',
    packId: input.packId ?? input.progress.packId,
    lemmaKey: input.lemmaKey ?? input.progress.lemmaKey,
    useStreak: input.progress.useStreak ?? 0,
  }
}

export function recordFeedUse(
  progress: VocabularyWordProgress,
  now: number = Date.now()
): VocabularyWordProgress {
  return recordTranslationLemmaUse(progress, now)
}

/** Перевод: крепит «в деле», никогда не ставит Умею. */
export function recordTranslationLemmaUse(
  progress: VocabularyWordProgress,
  now: number = Date.now()
): VocabularyWordProgress {
  if (progress.feedStatus === 'mastered') {
    return { ...progress, lastFocusUsedAt: now }
  }
  return {
    ...progress,
    lastFocusUsedAt: now,
    feedStatus: progress.feedStatus === 'returned' ? 'in_feed' : progress.feedStatus ?? 'in_feed',
  }
}

export function utteranceHasLemma(userText: string, lemmaEn: string): boolean {
  const key = lemmaKeyFromEn(lemmaEn)
  if (!key || !userText.trim()) return false
  const normalized = lemmaKeyFromEn(userText)
  if (normalized === key) return true
  if (key.includes(' ') && normalized.includes(key)) return true
  const tokens = normalized.split(/[^a-z0-9']+/).filter(Boolean)
  return tokens.includes(key)
}

/** Общение/звонок: Умею только если лемма есть в реплике. */
export function recordLiveLemmaUse(
  progress: VocabularyWordProgress,
  userText: string,
  lemmaEn: string,
  now: number = Date.now()
): VocabularyWordProgress {
  if (!utteranceHasLemma(userText, lemmaEn)) return progress
  return {
    ...progress,
    feedStatus: 'mastered',
    lastFocusUsedAt: now,
    useStreak: (progress.useStreak ?? 0) + 1,
  }
}

export function setUserMark(
  progress: VocabularyWordProgress,
  mark: VocabularyUserMark | null
): VocabularyWordProgress {
  return { ...progress, userMark: mark }
}

export function recordFeedFail(
  progress: VocabularyWordProgress,
  now: number = Date.now()
): VocabularyWordProgress {
  return {
    ...progress,
    useStreak: 0,
    feedStatus: 'returned',
    lastFocusUsedAt: now,
    nextReviewAt: now,
    userMark: progress.userMark === 'know' ? null : progress.userMark,
  }
}

export function isInFeed(progress: VocabularyWordProgress | undefined): boolean {
  return progress?.feedStatus === 'in_feed'
}

type ProgressMap = Record<string, VocabularyWordProgress>

function toFocusLemma(word: NecessaryWord, progress?: VocabularyWordProgress): VocabularyFocusLemma {
  return {
    en: word.en,
    ru: word.ru,
    wordId: word.id,
    lemmaKey: progress?.lemmaKey ?? lemmaKeyFromEn(word.en),
  }
}

export function pickFocusLemmasForMode(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  n?: number
  now?: number
  /** Push handoff lemmas always included first (bypass cooldown). */
  pushLemmas?: VocabularyFocusLemma[]
  mistakeLemmaKeys?: Set<string>
}): VocabularyFocusLemma[] {
  const n = params.n ?? 3
  const now = params.now ?? Date.now()
  const push = params.pushLemmas ?? []
  const result: VocabularyFocusLemma[] = []
  const usedIds = new Set<number>()
  const usedKeys = new Set<string>()

  const take = (lemma: VocabularyFocusLemma) => {
    if (result.length >= n) return
    const key = lemma.lemmaKey ?? lemmaKeyFromEn(lemma.en)
    if (usedKeys.has(key)) return
    if (typeof lemma.wordId === 'number' && usedIds.has(lemma.wordId)) return
    usedKeys.add(key)
    if (typeof lemma.wordId === 'number') usedIds.add(lemma.wordId)
    result.push({ ...lemma, lemmaKey: key })
  }

  for (const lemma of push) take(lemma)

  const active = params.words.filter((w) => w.status === 'active')

  const inCooldown = (progress: VocabularyWordProgress | undefined) => {
    if (!progress?.lastFocusUsedAt) return false
    return now - progress.lastFocusUsedAt < FOCUS_COOLDOWN_MS
  }

  const errors: NecessaryWord[] = []
  const learning: NecessaryWord[] = []
  const fresh: NecessaryWord[] = []
  const bank: NecessaryWord[] = []

  for (const word of active) {
    const progress = params.progressMap[String(word.id)] ?? createEmptyWordProgress(word.id)
    if (progress.feedStatus === 'mastered') continue
    if (inCooldown(progress) && !push.some((p) => p.wordId === word.id)) continue

    const key = progress.lemmaKey ?? lemmaKeyFromEn(word.en)
    const isMistake =
      progress.feedStatus === 'returned' || Boolean(params.mistakeLemmaKeys?.has(key))

    if (isMistake) {
      errors.push(word)
      continue
    }
    if (progress.feedStatus === 'in_feed') {
      bank.push(word)
      continue
    }
    if ((progress.attempts ?? 0) > 0) {
      learning.push(word)
      continue
    }
    fresh.push(word)
  }

  errors.sort((a, b) => {
    const pa = params.progressMap[String(a.id)]?.lastFocusUsedAt ?? params.progressMap[String(a.id)]?.lastReviewedAt ?? 0
    const pb = params.progressMap[String(b.id)]?.lastFocusUsedAt ?? params.progressMap[String(b.id)]?.lastReviewedAt ?? 0
    return pb - pa
  })
  learning.sort((a, b) => {
    const pa = params.progressMap[String(a.id)]?.nextReviewAt ?? 0
    const pb = params.progressMap[String(b.id)]?.nextReviewAt ?? 0
    return pa - pb
  })
  bank.sort((a, b) => {
    const pa = params.progressMap[String(a.id)]?.passedAt ?? 0
    const pb = params.progressMap[String(b.id)]?.passedAt ?? 0
    return pa - pb
  })

  const pickFrom = (bucket: NecessaryWord[]) => {
    for (const word of bucket) {
      if (result.length >= n) return
      take(toFocusLemma(word, params.progressMap[String(word.id)]))
    }
  }

  // Slot pattern + caps: max 1 error, max 1 fresh
  let errorsUsed = 0
  let freshUsed = 0

  const takeCapped = (bucket: NecessaryWord[], kind: 'errors' | 'learning' | 'fresh' | 'bank') => {
    for (const word of bucket) {
      if (result.length >= n) return
      if (kind === 'errors' && errorsUsed >= 1) return
      if (kind === 'fresh' && freshUsed >= 1) return
      const before = result.length
      take(toFocusLemma(word, params.progressMap[String(word.id)]))
      if (result.length > before) {
        if (kind === 'errors') errorsUsed += 1
        if (kind === 'fresh') freshUsed += 1
      }
    }
  }

  // slot1 errors → learning → fresh
  takeCapped(errors, 'errors')
  if (result.length < Math.min(1, n)) takeCapped(learning, 'learning')
  if (result.length < Math.min(1, n)) takeCapped(fresh, 'fresh')

  // slot2 learning → fresh → errors
  takeCapped(learning, 'learning')
  if (result.length < Math.min(2, n)) takeCapped(fresh, 'fresh')
  if (result.length < Math.min(2, n)) takeCapped(errors, 'errors')

  // slot3 fresh → learning → bank
  takeCapped(fresh, 'fresh')
  if (result.length < n) pickFrom(learning)
  if (result.length < n) pickFrom(bank)
  if (result.length < n) pickFrom(errors)

  return result.slice(0, n)
}

export function pickFeedForInjection(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  wordIds?: number[]
  n?: number
}): VocabularyFocusLemma[] {
  const n = params.n ?? 3
  if (params.wordIds?.length) {
    const lemmas: VocabularyFocusLemma[] = []
    for (const id of params.wordIds) {
      const word = params.words.find((w) => w.id === id)
      if (!word) continue
      const progress = params.progressMap[String(id)]
      if (progress?.feedStatus !== 'in_feed' && progress?.feedStatus !== 'returned') continue
      lemmas.push(toFocusLemma(word, progress))
      if (lemmas.length >= n) break
    }
    return lemmas
  }

  const bank = params.words
    .filter((w) => params.progressMap[String(w.id)]?.feedStatus === 'in_feed')
    .sort((a, b) => {
      const pa = params.progressMap[String(a.id)]?.passedAt ?? 0
      const pb = params.progressMap[String(b.id)]?.passedAt ?? 0
      return pa - pb
    })

  return bank.slice(0, n).map((w) => toFocusLemma(w, params.progressMap[String(w.id)]))
}

export function listByFeedStatus(
  words: NecessaryWord[],
  progressMap: ProgressMap,
  status: VocabularyFeedStatus | 'queue'
): NecessaryWord[] {
  return words.filter((word) => {
    if (word.status !== 'active') return false
    const progress = progressMap[String(word.id)]
    if (status === 'queue') {
      return !progress?.feedStatus || progress.feedStatus === 'none' || progress.feedStatus === 'returned'
    }
    return progress?.feedStatus === status
  })
}
