import { describe, expect, it } from 'vitest'
import { buildNecessaryWordsCatalog, filterActiveNecessaryWords } from '@/lib/vocabulary/catalog'
import type { ParsedNecessaryWord } from '@/types/vocabulary'

const sourceWords: ParsedNecessaryWord[] = [
  { id: 42, en: 'To be', ru: 'быть', transcription: '[biː]', source: '42. To be [biː] — быть' },
  { id: 223, en: 'Home', ru: 'дом', transcription: '[həʊm]', source: '223. Home [həʊm] — дом' },
  { id: 324, en: 'Airport', ru: 'аэропорт', transcription: '[ˈeəpɔːt]', source: '324. Airport [ˈeəpɔːt] — аэропорт' },
  { id: 881, en: 'App', ru: 'приложение', transcription: '[æp]', source: '881. App [æp] — приложение' },
  { id: 582, en: 'Sexy', ru: 'сексуальный', transcription: '[ˈseksi]', source: '582. Sexy [ˈseksi] — сексуальный' },
]

describe('necessary words catalog', () => {
  it('assigns worlds deterministically', () => {
    const catalog = buildNecessaryWordsCatalog(sourceWords)
    const byId = Object.fromEntries(catalog.words.map((word) => [word.id, word]))

    expect(byId[42]?.primaryWorld).toBe('core')
    expect(byId[223]?.primaryWorld).toBe('home')
    expect(byId[324]?.primaryWorld).toBe('travel')
    expect(byId[881]?.primaryWorld).toBe('digital')
  })

  it('filters excluded words out of active learning', () => {
    const catalog = buildNecessaryWordsCatalog(sourceWords)
    const activeIds = filterActiveNecessaryWords(catalog.words).map((word) => word.id)

    expect(activeIds).not.toContain(582)
    expect(activeIds).toContain(223)
  })
})
