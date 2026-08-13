import { describe, expect, it } from 'vitest'
import { pickVocabFuel, rankVocabNowCta } from '@/lib/vocabulary/fuel'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string, extra?: Partial<NecessaryWord>): NecessaryWord => ({
  id,
  en,
  ru: en,
  transcription: '',
  source: extra?.source ?? '',
  tags: extra?.tags ?? [],
  status: 'active',
  primaryWorld: extra?.primaryWorld ?? 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

describe('pickVocabFuel', () => {
  it('never picks leftover catalog', () => {
    const words = [word(1, 'apple'), word(2, 'table'), word(3, 'window')]
    const picked = pickVocabFuel({
      words,
      progressMap: {},
      n: 3,
      packWords: [],
      mistakeLemmaKeys: new Set(),
    })
    expect(picked).toEqual([])
  })

  it('orders errors then packs then study', () => {
    const catalog = [word(1, 'err'), word(2, 'pack'), word(3, 'study'), word(4, 'fresh')]
    const pack = [word(2, 'pack', { source: 'pack:u', tags: ['custom-pack'] })]
    const picked = pickVocabFuel({
      words: catalog,
      packWords: pack,
      n: 3,
      mistakeLemmaKeys: new Set(['err']),
      progressMap: {
        '2': { ...createEmptyWordProgress(2), source: 'pack', lemmaKey: 'pack' },
        '3': { ...createEmptyWordProgress(3), userMark: 'study', lemmaKey: 'study' },
      },
    })
    expect(picked.map((row) => row.en)).toEqual(['err', 'pack', 'study'])
  })

  it('skips know, mastered and in_feed', () => {
    const words = [word(1, 'a'), word(2, 'b'), word(3, 'c')]
    const picked = pickVocabFuel({
      words,
      packWords: words,
      n: 3,
      progressMap: {
        '1': { ...createEmptyWordProgress(1), userMark: 'know', source: 'pack' },
        '2': { ...createEmptyWordProgress(2), feedStatus: 'mastered', source: 'pack' },
        '3': { ...createEmptyWordProgress(3), feedStatus: 'in_feed', source: 'pack' },
      },
    })
    expect(picked).toEqual([])
  })
})

describe('rankVocabNowCta', () => {
  it('mixed errors prefer sprint when some were never banked', () => {
    const words = [word(1, 'newerr'), word(2, 'olderr')]
    const kind = rankVocabNowCta({
      words,
      packWords: [],
      mistakeLemmaKeys: new Set(['newerr']),
      progressMap: {
        '2': { ...createEmptyWordProgress(2), feedStatus: 'returned', lemmaKey: 'olderr' },
      },
    })
    expect(kind).toBe('errors-sprint')
  })

  it('banked-only errors prefer bridge', () => {
    const words = [word(1, 'go')]
    const kind = rankVocabNowCta({
      words,
      packWords: [],
      mistakeLemmaKeys: new Set(['go']),
      progressMap: {
        '1': { ...createEmptyWordProgress(1), feedStatus: 'in_feed', lemmaKey: 'go' },
      },
    })
    expect(kind).toBe('errors-bridge')
  })
})
