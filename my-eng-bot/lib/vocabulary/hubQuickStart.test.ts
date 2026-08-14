import { describe, expect, it } from 'vitest'
import {
  formatVocabFocusPairs,
  HUB_QUICK_START_DEFAULT_ROUTE,
  poolForHubQuickStart,
  resolveHubQuickStartRoute,
  wordsForHubQuickStart,
} from '@/lib/vocabulary/hubQuickStart'
import type { NecessaryWord, VocabularyWordProgress } from '@/types/vocabulary'

const word = (id: number, en: string, extra?: Partial<NecessaryWord>): NecessaryWord => ({
  id,
  en,
  ru: `${en}-ru`,
  transcription: '',
  source: '',
  tags: [],
  status: 'active',
  primaryWorld: 'home',
  primaryLevel: 'a2',
  primaryVocabularyTopic: 'core',
  ...extra,
})

describe('hubQuickStart', () => {
  it('falls back to home when there is no last route', () => {
    expect(resolveHubQuickStartRoute(null)).toEqual(HUB_QUICK_START_DEFAULT_ROUTE)
  })

  it('pools world words from catalog', () => {
    const catalog = [
      word(1, 'home-a', { primaryWorld: 'home' }),
      word(2, 'school-a', { primaryWorld: 'school' }),
    ]
    const pool = poolForHubQuickStart(
      { kind: 'world', worldId: 'home' },
      {
        catalog,
        packWordsForId: () => [],
        phrasebookWordsForId: () => [],
      }
    )
    expect(pool.map((row) => row.en)).toEqual(['home-a'])
  })

  it('pools pack words by id', () => {
    const packWord = word(9, 'pack-a')
    const pool = poolForHubQuickStart(
      { kind: 'pack', packId: 'p1' },
      {
        catalog: [word(1, 'home-a')],
        packWordsForId: (packId) => (packId === 'p1' ? [packWord] : []),
        phrasebookWordsForId: () => [],
      }
    )
    expect(pool).toEqual([packWord])
  })

  it('picks up to 3 from the given pool, not the whole catalog', () => {
    const home = [word(1, 'a'), word(2, 'b'), word(3, 'c'), word(4, 'd')]
    const progressMap: Record<string, VocabularyWordProgress> = {}
    const picked = wordsForHubQuickStart({ pool: home, progressMap })
    expect(picked).toHaveLength(3)
    expect(picked.every((row) => home.some((item) => item.id === row.id))).toBe(true)
  })

  it('formats en — ru pairs', () => {
    expect(formatVocabFocusPairs([word(1, 'from'), word(2, 'my'), word(3, 'name')])).toEqual([
      { id: 1, en: 'from', ru: 'from-ru' },
      { id: 2, en: 'my', ru: 'my-ru' },
      { id: 3, en: 'name', ru: 'name-ru' },
    ])
  })

  it('drops empty english lemmas', () => {
    expect(formatVocabFocusPairs([word(1, '  '), word(2, 'door')])).toEqual([
      { id: 2, en: 'door', ru: 'door-ru' },
    ])
  })
})
