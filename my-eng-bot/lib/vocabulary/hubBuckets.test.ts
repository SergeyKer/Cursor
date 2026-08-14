import { describe, expect, it } from 'vitest'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import {
  hubDisplayTiles,
  listByDisplayFilter,
  listShelvedWords,
  listStudyWords,
  resolveMistakeWords,
  shelfOf,
} from '@/lib/vocabulary/hubBuckets'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string): NecessaryWord => ({
  id,
  en,
  ru: en,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

describe('hubBuckets', () => {
  it('does not put know or study into mastered tile', () => {
    const words = [word(1, 'know'), word(2, 'study'), word(3, 'said')]
    const progressMap = {
      '1': { ...createEmptyWordProgress(1), userMark: 'know' as const, lemmaKey: 'know' },
      '2': { ...createEmptyWordProgress(2), userMark: 'study' as const, lemmaKey: 'study' },
      '3': { ...createEmptyWordProgress(3), feedStatus: 'mastered' as const, lemmaKey: 'said' },
    }
    const tiles = hubDisplayTiles({ audience: 'adult', words, progressMap, mistakes: [] })
    expect(tiles.find((tile) => tile.id === 'mastered')?.count).toBe(1)
    expect(tiles.find((tile) => tile.id === 'know')?.count).toBe(1)
    expect(listStudyWords(words, progressMap).map((row) => row.en)).toEqual(['study'])
  })

  it('keeps know out of mastered even if both marks exist', () => {
    const words = [word(1, 'mix')]
    const progressMap = {
      '1': {
        ...createEmptyWordProgress(1),
        userMark: 'know' as const,
        feedStatus: 'mastered' as const,
        lemmaKey: 'mix',
      },
    }
    expect(hubDisplayTiles({ audience: 'adult', words, progressMap, mistakes: [] }).find((tile) => tile.id === 'know')?.count).toBe(0)
    expect(hubDisplayTiles({ audience: 'adult', words, progressMap, mistakes: [] }).find((tile) => tile.id === 'mastered')?.count).toBe(1)
  })

  it('same five display tiles for child and adult, returned counts as fix', () => {
    const words = [word(1, 'a'), word(2, 'b'), word(3, 'c'), word(4, 'd')]
    const progressMap = {
      '1': { ...createEmptyWordProgress(1), feedStatus: 'mastered' as const },
      '2': { ...createEmptyWordProgress(2), userMark: 'study' as const },
      '3': { ...createEmptyWordProgress(3), feedStatus: 'returned' as const },
      '4': { ...createEmptyWordProgress(4), userMark: 'know' as const, lemmaKey: 'd' },
    }
    const child = hubDisplayTiles({ audience: 'child', words, progressMap, mistakes: [] })
    const adult = hubDisplayTiles({ audience: 'adult', words, progressMap, mistakes: [] })
    expect(child.map((tile) => tile.id)).toEqual(['study', 'in_feed', 'mastered', 'know', 'fix'])
    expect(adult.map((tile) => tile.id)).toEqual(child.map((tile) => tile.id))
    expect(child.map((tile) => tile.count)).toEqual([1, 0, 1, 1, 1])
    expect(adult.map((tile) => tile.count)).toEqual(child.map((tile) => tile.count))
  })

  it('sums returned and inbox into fix without double-counting a lemma', () => {
    const words = [word(1, 'back'), word(2, 'cat')]
    const progressMap = {
      '1': { ...createEmptyWordProgress(1), feedStatus: 'returned' as const, lemmaKey: 'back' },
    }
    const mistakes = [
      { lemmaKey: 'back', en: 'back', at: 1, source: 'translation' as const },
      { lemmaKey: 'cat', en: 'cat', at: 1, source: 'translation' as const },
    ]
    const tiles = hubDisplayTiles({ audience: 'adult', words, progressMap, mistakes })
    expect(tiles.find((tile) => tile.id === 'fix')?.count).toBe(2)
    const fixRows = listByDisplayFilter({
      audience: 'adult',
      words,
      progressMap,
      mistakes,
      filter: 'fix',
    })
    expect(fixRows.map((row) => row.word.en)).toEqual(['back', 'cat'])
    expect(fixRows.map((row) => row.shelf)).toEqual(['returned', 'errors'])
  })

  it('merges inbox mistakes with returned status', () => {
    const words = [word(1, 'cat'), word(2, 'dog')]
    const found = resolveMistakeWords(
      words,
      [],
      { '2': { ...createEmptyWordProgress(2), feedStatus: 'returned' } },
      [{ lemmaKey: 'cat', en: 'cat', at: 1, source: 'translation' }]
    )
    expect(found.map((row) => row.en)).toEqual(['cat', 'dog'])
  })
})

describe('shelfOf', () => {
  const mistakeKeys = (keys: string[]) => new Set(keys)

  it('assigns exactly one shelf when axes overlap', () => {
    const returned = word(1, 'back')
    const mixed = word(2, 'mix')
    const banked = word(3, 'bank')
    expect(
      shelfOf(returned, { ...createEmptyWordProgress(1), feedStatus: 'returned', userMark: 'study' }, mistakeKeys(['back']))
    ).toBe('returned')
    expect(
      shelfOf(mixed, { ...createEmptyWordProgress(2), feedStatus: 'mastered', userMark: 'know' }, mistakeKeys([]))
    ).toBe('mastered')
    expect(
      shelfOf(banked, { ...createEmptyWordProgress(3), feedStatus: 'in_feed', userMark: 'study' }, mistakeKeys([]))
    ).toBe('in_feed')
  })

  it('puts inbox without returned on errors', () => {
    expect(shelfOf(word(1, 'cat'), createEmptyWordProgress(1), mistakeKeys(['cat']))).toBe('errors')
  })

  it('listShelvedWords drops unmarked catalog and keeps know for child', () => {
    const words = [word(1, 'plain'), word(2, 'know'), word(3, 'study')]
    const progressMap = {
      '2': { ...createEmptyWordProgress(2), userMark: 'know' as const, lemmaKey: 'know' },
      '3': { ...createEmptyWordProgress(3), userMark: 'study' as const, lemmaKey: 'study' },
    }
    const adult = listShelvedWords({ words, progressMap, mistakes: [], audience: 'adult' })
    const child = listShelvedWords({ words, progressMap, mistakes: [], audience: 'child' })
    expect(adult.map((row) => row.word.en)).toEqual(['know', 'study'])
    expect(child.map((row) => row.word.en)).toEqual(['know', 'study'])
  })
})
