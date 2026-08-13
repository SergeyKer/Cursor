import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import { resolvePackWordId } from '@/lib/vocabulary/customPackAdapter'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import { patchWordProgress } from '@/lib/vocabulary/storage'
import type { CustomWordItem } from '@/types/adaptiveRetention'
import type { NecessaryWord, VocabularyProgressState, VocabularyWordProgress } from '@/types/vocabulary'

export type ImportAlready = 'new' | 'study' | 'in_feed' | 'mastered' | 'returned'

export type ResolvedImportPair = {
  en: string
  ru: string
  lemmaKey: string
  wordId: number
  already: ImportAlready
}

export type ResolveImportResult = {
  ready: ResolvedImportPair[]
  needsTranslation: string[]
  duplicateInBatch: number
}

function uniqueCatalogByLemma(catalog: NecessaryWord[], lemmaKey: string): NecessaryWord[] {
  return catalog.filter((word) => lemmaKeyFromEn(word.en) === lemmaKey)
}

export function fillPairFromCatalog(
  en: string,
  ru: string,
  catalog: NecessaryWord[]
): { en: string; ru: string } | null {
  const enTrim = en.trim()
  const ruTrim = ru.trim()
  const hasEn = /[A-Za-z]/.test(enTrim)
  const hasRu = /[А-Яа-яЁё]/.test(ruTrim) || /[А-Яа-яЁё]/.test(enTrim)
  if (hasEn && ruTrim) return { en: enTrim, ru: ruTrim }
  if (hasEn && !ruTrim) {
    const key = lemmaKeyFromEn(enTrim)
    const hits = uniqueCatalogByLemma(catalog, key)
    if (hits.length === 1 && hits[0]) return { en: hits[0].en, ru: hits[0].ru }
    return null
  }
  if (!hasEn && hasRu) {
    const needle = (ruTrim || enTrim).toLowerCase()
    const hits = catalog.filter((word) => word.ru.trim().toLowerCase() === needle)
    if (hits.length === 1 && hits[0]) return { en: hits[0].en, ru: hits[0].ru }
    return null
  }
  return enTrim && ruTrim ? { en: enTrim, ru: ruTrim } : null
}

function alreadyOf(progress: VocabularyWordProgress | undefined): ImportAlready {
  if (!progress) return 'new'
  if (progress.feedStatus === 'mastered') return 'mastered'
  if (progress.feedStatus === 'in_feed') return 'in_feed'
  if (progress.feedStatus === 'returned') return 'returned'
  if (progress.userMark === 'study') return 'study'
  return 'new'
}

export function resolveImportRows(params: {
  rows: Array<{ en?: string; ru?: string }>
  catalog: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
}): ResolveImportResult {
  const ready: ResolvedImportPair[] = []
  const needsTranslation: string[] = []
  const seen = new Set<string>()
  let duplicateInBatch = 0

  for (const row of params.rows) {
    const filled = fillPairFromCatalog(row.en ?? '', row.ru ?? '', params.catalog)
    if (!filled) {
      const enOnly = (row.en ?? '').trim()
      if (/[A-Za-z]/.test(enOnly)) needsTranslation.push(enOnly)
      continue
    }
    const lemmaKey = lemmaKeyFromEn(filled.en)
    if (seen.has(lemmaKey)) {
      duplicateInBatch += 1
      continue
    }
    seen.add(lemmaKey)
    const wordId = resolvePackWordId(filled.en, {
      catalog: params.catalog,
      progressMap: params.progressMap,
    })
    ready.push({
      en: filled.en,
      ru: filled.ru,
      lemmaKey,
      wordId,
      already: alreadyOf(params.progressMap[String(wordId)]),
    })
  }

  return { ready, needsTranslation, duplicateInBatch }
}

export function pairsForPack(ready: ResolvedImportPair[]): ResolvedImportPair[] {
  return ready.filter((row) => row.already !== 'mastered' && row.already !== 'in_feed')
}

export function toCustomWordItems(pairs: ResolvedImportPair[]): CustomWordItem[] {
  return pairs.map((row, index) => ({
    id: `imp-${index}-${row.lemmaKey}`,
    en: row.en,
    ru: row.ru,
  }))
}

export function applyImportedStudyMarks(
  state: VocabularyProgressState,
  pairs: ResolvedImportPair[],
  packId: string,
  now: number = Date.now()
): VocabularyProgressState {
  let next = state
  for (const pair of pairs) {
    const current = next.words[String(pair.wordId)] ?? createEmptyWordProgress(pair.wordId)
    next = patchWordProgress(next, pair.wordId, {
      ...current,
      lemmaKey: current.lemmaKey ?? pair.lemmaKey,
      source: 'pack',
      packId,
      userMark: current.userMark === 'know' ? current.userMark : 'study',
      firstAddedAt: current.firstAddedAt ?? now,
    })
  }
  return next
}

export function isPackDrained(
  items: Array<{ en: string }>,
  progressMap: Record<string, VocabularyWordProgress>,
  catalog: NecessaryWord[]
): boolean {
  if (items.length === 0) return true
  return items.every((item) => {
    const wordId = resolvePackWordId(item.en, { catalog, progressMap })
    const status = progressMap[String(wordId)]?.feedStatus
    return status === 'in_feed' || status === 'mastered'
  })
}
