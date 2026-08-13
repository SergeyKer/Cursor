import { describe, expect, it } from 'vitest'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import { lemmaWordId } from '@/lib/vocabulary/customPackAdapter'
import { resolveImportRows, isPackDrained } from '@/lib/vocabulary/resolveImportRows'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'
import type { NecessaryWord } from '@/types/vocabulary'

const word = (id: number, en: string, ru: string): NecessaryWord => ({
  id,
  en,
  ru,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'core',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
})

describe('resolveImportRows', () => {
  it('fills a unique catalog hit and keeps EN+RU pairs', () => {
    const catalog = [word(42, 'apple', 'яблоко')]
    const result = resolveImportRows({
      rows: [{ en: 'apple', ru: '' }, { en: 'ticket', ru: 'билет' }],
      catalog,
      progressMap: {},
    })
    expect(result.ready).toHaveLength(2)
    expect(result.ready[0]).toMatchObject({ en: 'apple', ru: 'яблоко', wordId: 42 })
    expect(result.ready[1]?.en).toBe('ticket')
    expect(result.needsTranslation).toEqual([])
  })

  it('leaves ambiguous or missing catalog EN for translation', () => {
    const catalog = [word(1, 'medium', 'средний'), word(2, 'medium', 'носитель')]
    const result = resolveImportRows({
      rows: [{ en: 'medium' }, { en: 'window' }],
      catalog,
      progressMap: {},
    })
    expect(result.ready).toHaveLength(0)
    expect(result.needsTranslation).toEqual(['medium', 'window'])
  })

  it('reuses progress wordId for the same lemma instead of a new hash', () => {
    const key = lemmaKeyFromEn('window')
    const existingId = 9001
    const result = resolveImportRows({
      rows: [{ en: 'window', ru: 'окно' }],
      catalog: [],
      progressMap: {
        '9001': { ...createEmptyWordProgress(existingId), lemmaKey: key, userMark: 'study' },
      },
    })
    expect(result.ready[0]?.wordId).toBe(existingId)
    expect(result.ready[0]?.already).toBe('study')
  })

  it('does not invent a second id when lemma is new', () => {
    const result = resolveImportRows({
      rows: [{ en: 'window', ru: 'окно' }],
      catalog: [],
      progressMap: {},
    })
    expect(result.ready[0]?.wordId).toBe(lemmaWordId(lemmaKeyFromEn('window')))
  })

  it('treats a pack as drained when every lemma is in_feed or mastered', () => {
    const catalog = [word(42, 'apple', 'яблоко')]
    expect(
      isPackDrained(
        [{ en: 'apple' }],
        { '42': { ...createEmptyWordProgress(42), feedStatus: 'mastered', lemmaKey: 'apple' } },
        catalog
      )
    ).toBe(true)
    expect(isPackDrained([{ en: 'apple' }], {}, catalog)).toBe(false)
  })
})
