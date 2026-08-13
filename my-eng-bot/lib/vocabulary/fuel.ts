import { customPackToNecessaryWords } from '@/lib/vocabulary/customPackAdapter'
import { loadCustomWordPacks } from '@/lib/adaptiveRetention/customWordPackStorage'
import { vocabMistakeLemmaKeys } from '@/lib/vocabulary/mistakesList'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type {
  NecessaryWord,
  VocabularyFocusLemma,
  VocabularyWordProgress,
} from '@/types/vocabulary'

export type FuelVitrineSource = 'catalog_world' | 'custom_pack' | 'phrasebook'


export type VocabNowKind =
  | 'errors-sprint'
  | 'errors-bridge'
  | 'fresh-sprint'
  | 'bank-bridge'
  | 'pause'
  | 'empty'

type ProgressMap = Record<string, VocabularyWordProgress>

function toLemma(word: NecessaryWord, progress?: VocabularyWordProgress): VocabularyFocusLemma {
  return {
    en: word.en,
    ru: word.ru,
    wordId: word.id,
    lemmaKey: progress?.lemmaKey ?? lemmaKeyFromEn(word.en),
  }
}

function isKnow(progress: VocabularyWordProgress | undefined): boolean {
  return progress?.userMark === 'know'
}

function isMastered(progress: VocabularyWordProgress | undefined): boolean {
  return progress?.feedStatus === 'mastered'
}

function isInFeed(progress: VocabularyWordProgress | undefined): boolean {
  return progress?.feedStatus === 'in_feed'
}

function isError(progress: VocabularyWordProgress | undefined, key: string, mistakeKeys: Set<string>): boolean {
  if (progress?.feedStatus === 'returned') return true
  return mistakeKeys.has(key)
}

/**
 * Дрова дня: ошибки → новые Мои → Учу.
 * Не берёт остаток 740. in_feed не в списке (это CTA моста).
 */
export function pickVocabFuel(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  n?: number
  packWords?: NecessaryWord[]
  mistakeLemmaKeys?: Set<string>
  pushLemmas?: VocabularyFocusLemma[]
}): VocabularyFocusLemma[] {
  const n = params.n ?? 3
  const mistakeKeys = params.mistakeLemmaKeys ?? new Set<string>()
  const packWords = params.packWords ?? []
  const result: VocabularyFocusLemma[] = []
  const usedKeys = new Set<string>()
  const usedIds = new Set<number>()

  const take = (lemma: VocabularyFocusLemma) => {
    if (result.length >= n) return
    const key = lemma.lemmaKey ?? lemmaKeyFromEn(lemma.en)
    if (usedKeys.has(key)) return
    if (typeof lemma.wordId === 'number' && usedIds.has(lemma.wordId)) return
    usedKeys.add(key)
    if (typeof lemma.wordId === 'number') usedIds.add(lemma.wordId)
    result.push({ ...lemma, lemmaKey: key })
  }

  for (const lemma of params.pushLemmas ?? []) take(lemma)

  const byId = new Map<number, NecessaryWord>()
  for (const word of params.words) byId.set(word.id, word)
  for (const word of packWords) byId.set(word.id, word)

  const errors: NecessaryWord[] = []
  const packs: NecessaryWord[] = []
  const study: NecessaryWord[] = []

  const consider = (word: NecessaryWord) => {
    if (word.status !== 'active') return
    const progress = params.progressMap[String(word.id)]
    if (isKnow(progress) || isMastered(progress)) return
    const key = progress?.lemmaKey ?? lemmaKeyFromEn(word.en)
    if (isError(progress, key, mistakeKeys)) {
      errors.push(word)
      return
    }
    if (isInFeed(progress)) return
    const fromPack = packWords.some((item) => item.id === word.id) || progress?.source === 'pack'
    if (fromPack) {
      packs.push(word)
      return
    }
    if (progress?.userMark === 'study') study.push(word)
  }

  for (const word of byId.values()) consider(word)

  errors.sort((a, b) => {
    const pa = params.progressMap[String(a.id)]?.lastFocusUsedAt ?? 0
    const pb = params.progressMap[String(b.id)]?.lastFocusUsedAt ?? 0
    return pb - pa
  })

  for (const word of errors) take(toLemma(word, params.progressMap[String(word.id)]))
  for (const word of packs) take(toLemma(word, params.progressMap[String(word.id)]))
  for (const word of study) take(toLemma(word, params.progressMap[String(word.id)]))

  return result.slice(0, n)
}

export function loadPackWords(): NecessaryWord[] {
  try {
    return loadCustomWordPacks().flatMap(customPackToNecessaryWords)
  } catch {
    return []
  }
}

export function pickVocabFuelDefault(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  n?: number
  pushLemmas?: VocabularyFocusLemma[]
}): VocabularyFocusLemma[] {
  return pickVocabFuel({
    ...params,
    packWords: loadPackWords(),
    mistakeLemmaKeys: vocabMistakeLemmaKeys(),
  })
}

function countErrors(
  words: NecessaryWord[],
  progressMap: ProgressMap,
  mistakeKeys: Set<string>
): { total: number; neverBanked: number; banked: number } {
  let total = 0
  let neverBanked = 0
  let banked = 0
  const seen = new Set<string>()
  for (const word of words) {
    const progress = progressMap[String(word.id)] ?? createEmptyWordProgress(word.id)
    const key = progress.lemmaKey ?? lemmaKeyFromEn(word.en)
    if (seen.has(key)) continue
    if (!isError(progress, key, mistakeKeys)) continue
    seen.add(key)
    total += 1
    if (progress.feedStatus === 'in_feed' || progress.feedStatus === 'mastered') banked += 1
    else neverBanked += 1
  }
  for (const key of mistakeKeys) {
    if (seen.has(key)) continue
    seen.add(key)
    total += 1
    neverBanked += 1
  }
  return { total, neverBanked, banked }
}

function hasFreshFuel(
  words: NecessaryWord[],
  progressMap: ProgressMap,
  packWords: NecessaryWord[],
  mistakeKeys: Set<string>
): boolean {
  return pickVocabFuel({ words, progressMap, packWords, mistakeLemmaKeys: mistakeKeys, n: 1 }).length > 0
}

function countInFeed(progressMap: ProgressMap): number {
  return Object.values(progressMap).filter((row) => row.feedStatus === 'in_feed').length
}

export function rankVocabNowCta(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  packWords?: NecessaryWord[]
  mistakeLemmaKeys?: Set<string>
  now?: number
  lastVocabAt?: number | null
}): VocabNowKind {
  const packWords = params.packWords ?? loadPackWords()
  const mistakeKeys = params.mistakeLemmaKeys ?? vocabMistakeLemmaKeys()
  const pool = [...params.words]
  for (const word of packWords) {
    if (!pool.some((item) => item.id === word.id)) pool.push(word)
  }
  const errors = countErrors(pool, params.progressMap, mistakeKeys)
  if (errors.total > 0) {
    return errors.neverBanked > 0 ? 'errors-sprint' : 'errors-bridge'
  }
  if (hasFreshFuel(pool, params.progressMap, packWords, mistakeKeys)) return 'fresh-sprint'
  if (countInFeed(params.progressMap) > 0) return 'bank-bridge'
  const now = params.now ?? Date.now()
  const last = params.lastVocabAt
  if (typeof last === 'number' && now - last >= 3 * 24 * 60 * 60 * 1000) return 'pause'
  return 'empty'
}

export function pauseSessionWords(params: {
  words: NecessaryWord[]
  progressMap: ProgressMap
  n?: number
}): NecessaryWord[] {
  const n = params.n ?? 2
  const home = params.words.filter((word) => word.status === 'active' && word.primaryWorld === 'home')
  const pool = home.length > 0 ? home : params.words.filter((word) => word.status === 'active')
  const fresh = pool.filter((word) => {
    const progress = params.progressMap[String(word.id)]
    if (!progress) return true
    if (progress.userMark === 'know' || progress.userMark === 'study') return false
    if (progress.feedStatus === 'mastered' || progress.feedStatus === 'in_feed' || progress.feedStatus === 'returned') {
      return false
    }
    return (progress.attempts ?? 0) === 0
  })
  return fresh.slice(0, n)
}
