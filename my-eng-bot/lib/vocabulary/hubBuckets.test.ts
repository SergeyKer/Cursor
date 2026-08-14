import { describe, expect, it } from 'vitest'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import {
  hubTiles,
  listKnowWords,
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
    const tiles = hubTiles({ audience: 'adult', words, progressMap, mistakes: [] })
    expect(tiles.find((tile) => tile.id === 'mastered')?.count).toBe(1)
    expect(listKnowWords(words, progressMap).map((row) => row.en)).toEqual(['know'])
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
    expect(listKnowWords(words, progressMap)).toEqual([])
    expect(hubTiles({ audience: 'adult', words, progressMap, mistakes: [] }).find((tile) => tile.id === 'mastered')?.count).toBe(1)
  })

  it('same six tiles for child and adult, returned not in errors', () => {
    const words = [word(1, 'a'), word(2, 'b'), word(3, 'c'), word(4, 'd')]
    const progressMap = {
      '1': { ...createEmptyWordProgress(1), feedStatus: 'mastered' as const },
      '2': { ...createEmptyWordProgress(2), userMark: 'study' as const },
      '3': { ...createEmptyWordProgress(3), feedStatus: 'returned' as const },
      '4': { ...createEmptyWordProgress(4), userMark: 'know' as const, lemmaKey: 'd' },
    }
    const child = hubTiles({ audience: 'child', words, progressMap, mistakes: [] })
    const adult = hubTiles({ audience: 'adult', words, progressMap, mistakes: [] })
    expect(child.map((tile) => tile.id)).toEqual(['study', 'know', 'in_feed', 'mastered', 'returned', 'errors'])
    expect(adult.map((tile) => tile.id)).toEqual(child.map((tile) => tile.id))
    expect(child.map((tile) => tile.count)).toEqual([1, 1, 0, 1, 1, 0])
    expect(adult.map((tile) => tile.count)).toEqual(child.map((tile) => tile.count))
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
