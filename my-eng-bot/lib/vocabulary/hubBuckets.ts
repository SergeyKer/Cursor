import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { Audience } from '@/lib/types'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'
import type { VocabMistakeItem } from '@/lib/vocabulary/mistakesList'

export type VocabShelfId = 'returned' | 'errors' | 'mastered' | 'in_feed' | 'know' | 'study'

export type VocabDisplayTileId = 'study' | 'in_feed' | 'mastered' | 'know' | 'fix'

export type VocabDisplayFilterId = VocabDisplayTileId | null

export type HubTileId = VocabDisplayTileId

export const VOCAB_SHELF_IDS: VocabShelfId[] = [
  'study',
  'know',
  'in_feed',
  'mastered',
  'returned',
  'errors',
]

export const VOCAB_DISPLAY_TILE_IDS: VocabDisplayTileId[] = [
  'study',
  'in_feed',
  'mastered',
  'know',
  'fix',
]

export type HubTile = {
  id: HubTileId
  count: number
}

export function displayTileIdOf(shelf: VocabShelfId): VocabDisplayTileId {
  if (shelf === 'returned' || shelf === 'errors') return 'fix'
  return shelf
}

export function matchesDisplayFilter(shelf: VocabShelfId, filter: VocabDisplayFilterId): boolean {
  if (!filter) return true
  if (filter === 'fix') return shelf === 'returned' || shelf === 'errors'
  return shelf === filter
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

export function shelfIdsForAudience(_audience: Audience): VocabShelfId[] {
  return VOCAB_SHELF_IDS
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

export function listByDisplayFilter(params: {
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  mistakes: VocabMistakeItem[]
  audience: Audience
  filter?: VocabDisplayFilterId
}): Array<{ word: NecessaryWord; shelf: VocabShelfId }> {
  return listShelvedWords({
    words: params.words,
    progressMap: params.progressMap,
    mistakes: params.mistakes,
    audience: params.audience,
  }).filter((row) => matchesDisplayFilter(row.shelf, params.filter ?? null))
}

export function hubDisplayTiles(params: {
  audience: Audience
  words: NecessaryWord[]
  progressMap: Record<string, VocabularyWordProgress>
  mistakes: VocabMistakeItem[]
}): HubTile[] {
  const counts: Record<VocabDisplayTileId, number> = {
    study: 0,
    in_feed: 0,
    mastered: 0,
    know: 0,
    fix: 0,
  }
  for (const row of listShelvedWords({ ...params })) {
    counts[displayTileIdOf(row.shelf)] += 1
  }
  return VOCAB_DISPLAY_TILE_IDS.map((id) => ({ id, count: counts[id] }))
}

export const VOCAB_FUNNEL_TILE_IDS: VocabDisplayTileId[] = ['study', 'in_feed', 'mastered']

export const VOCAB_EXCEPTION_TILE_IDS: VocabDisplayTileId[] = ['know', 'fix']

export function splitHubFunnel(tiles: HubTile[]): { funnel: HubTile[]; exceptions: HubTile[] } {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]))
  return {
    funnel: VOCAB_FUNNEL_TILE_IDS.map((id) => byId.get(id) ?? { id, count: 0 }),
    exceptions: VOCAB_EXCEPTION_TILE_IDS.map((id) => byId.get(id) ?? { id, count: 0 }).filter(
      (tile) => tile.count > 0
    ),
  }
}

