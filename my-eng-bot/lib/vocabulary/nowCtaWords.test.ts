import { describe, expect, it } from 'vitest'
import { wordsForNowCta } from '@/lib/vocabulary/nowCtaWords'
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

const fuel = [word(1, 'fuel-a'), word(2, 'fuel-b')]
const inFeed = [word(10, 'bank-a'), word(11, 'bank-b'), word(12, 'bank-c')]
const pause = [word(20, 'pause-a')]
const sources = { fuel, inFeed, pause }

describe('wordsForNowCta', () => {
  it('empty has no lemmas', () => {
    expect(wordsForNowCta('empty', sources)).toEqual([])
  })

  it('bank-bridge uses in_feed, not fuel', () => {
    expect(wordsForNowCta('bank-bridge', sources).map((row) => row.en)).toEqual(['bank-a', 'bank-b', 'bank-c'])
  })

  it('errors-bridge uses fuel even when in_feed exists', () => {
    expect(wordsForNowCta('errors-bridge', sources).map((row) => row.en)).toEqual(['fuel-a', 'fuel-b'])
  })

  it('bank-bridge falls back to fuel when in_feed is empty', () => {
    expect(wordsForNowCta('bank-bridge', { ...sources, inFeed: [] }).map((row) => row.en)).toEqual(['fuel-a', 'fuel-b'])
  })

  it('pause uses pause words', () => {
    expect(wordsForNowCta('pause', sources).map((row) => row.en)).toEqual(['pause-a'])
  })

  it('sprint kinds use fuel', () => {
    expect(wordsForNowCta('fresh-sprint', sources).map((row) => row.en)).toEqual(['fuel-a', 'fuel-b'])
    expect(wordsForNowCta('errors-sprint', sources).map((row) => row.en)).toEqual(['fuel-a', 'fuel-b'])
  })
})
