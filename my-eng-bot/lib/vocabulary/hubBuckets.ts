import { lemmaKeyFromEn, listByFeedStatus } from '@/lib/vocabulary/wordFeed'
import type { Audience } from '@/lib/types'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'
import type { VocabMistakeItem } from '@/lib/vocabulary/mistakesList'

export type HubTileId = 'mastered' | 'in_feed' | 'errors' | 'study'

export type VocabShelfId = 'returned' | 'errors' | 'mastered' | 'in_feed' | 'know' | 'study'

export type HubTile = {
  id: HubTileId
  count: number
}

export function uniqueWords(words: NecessaryWord[]): NecessaryWord[] {
  const seen = new Set<number>()
  const result: NecessaryWord[] = []
  for (const word of words) {
    if (seen.has(word.id)) continue
    seen.add(word.id)
    result.push(word)
  }
  return result
}

export function listStudyWords(
  words: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>
): NecessaryWord[] {
  return words.filter((word) => progressMap[String(word.id)]?.userMark === 'study')
}

export function listKnowWords(
  words: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>
): NecessaryWord[] {
  return words.filter((word) => {
    const row = progressMap[String(word.id)]
    return row?.userMark === 'know' && row.feedStatus !== 'mastered'
  })
}

export function resolveMistakeWords(
  catalog: NecessaryWord[],
  packWords: NecessaryWord[],
  progressMap: Record<string, VocabularyWordProgress>,
  mistakes: VocabMistakeItem[]
): NecessaryWord[] {
  const pool = uniqueWords([...catalog, ...packWords])
  const result: NecessaryWord[] = []
  for (const item of mistakes) {
    const found = pool.find((word) => lemmaKeyFromEn(word.en) === item.lemmaKey)
    if (found && !result.some((row) => row.id === found.id)) result.push(found)
  }
  for (const word of pool) {
    if (progressMap[String(word.id)]?.feedStatus === 'returned' && !result.some((row) => row.id === word.id)) {
      result.push(word)
    }
  }
  return result
}

export function shelfOf(
  word: NecessaryWord,
  progress: VocabularyWordProgress | undefined,
  mistakeKeys: Set<string>
): VocabShelfId | null {
  if (word.status !== 'active') return null
  const key = progress?.lemmaKey ?? lemmaKeyFromEn(word.en)
  if (progress?.feedStatus === 'returned') return 'returned'
  if (mistakeKeys.has(key)) return 'errors'
  if (progress?.feedStatus === 'mastered') return 'mastered'
  if (progress?.feedStatus === 'in_feed') return 'in_feed'
  if (progress?.userMark === 'know') return 'know'
  if (progress?.userMark === 'study') return 'study'
  return null
}

export function shelfIdsForAudience(audience: Audience): VocabShelfId[] {
  if (audience === 'child') return ['returned', 'errors', 'mastered', 'in_feed', 'study']
  return ['returned', 'errors', 'mastered', 'in_feed', 'know', 'study']
}

export function listShelvedWords(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  mistakes: VocabMistakeItem[]
  audience: Audience
  shelf?: VocabShelfId | null
}): Array<{ word: NecessaryWord; shelf: VocabShelfId }> {
  const mistakeKeys = new Set(params.mistakes.map((item) => item.lemmaKey))
  const allowed = new Set(shelfIdsForAudience(params.audience))
  const result: Array<{ word: NecessaryWord; shelf: VocabShelfId }> = []
  for (const word of uniqueWords(params.words)) {
    const shelf = shelfOf(word, params.progressMap[String(word.id)], mistakeKeys)
    if (!shelf || !allowed.has(shelf)) continue
    if (params.shelf && shelf !== params.shelf) continue
    result.push({ word, shelf })
  }
  return result
}

export function hubTiles(params: {
  audience: Audience
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  mistakes: VocabMistakeItem[]
}): HubTile[] {
  const mastered = listByFeedStatus(params.words, params.progressMap, 'mastered')
  const inFeed = listByFeedStatus(params.words, params.progressMap, 'in_feed')
  const errors = resolveMistakeWords(params.words, [], params.progressMap, params.mistakes)
  const study = listStudyWords(params.words, params.progressMap)
  if (params.audience === 'child') {
    return [
      { id: 'mastered', count: mastered.length },
      { id: 'study', count: study.length },
      { id: 'errors', count: errors.length },
    ]
  }
  return [
    { id: 'mastered', count: mastered.length },
    { id: 'in_feed', count: inFeed.length },
    { id: 'errors', count: errors.length },
  ]
}
