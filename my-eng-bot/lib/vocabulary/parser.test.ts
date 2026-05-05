import { describe, expect, it } from 'vitest'
import { parseNecessaryWordLine, parseNecessaryWordsText } from '@/lib/vocabulary/parser'

describe('vocabulary parser', () => {
  it('parses a standard vocabulary line', () => {
    expect(parseNecessaryWordLine('42. To be [biː] — быть')).toEqual({
      id: 42,
      en: 'To be',
      ru: 'быть',
      transcription: '[biː]',
      source: '42. To be [biː] — быть',
    })
  })

  it('cleans a noisy translation suffix', () => {
    const parsed = parseNecessaryWordLine('45. Or [ɔː(r)] — или Самый важный глагол')
    expect(parsed?.ru).toBe('или')
  })

  it('skips invalid lines safely', () => {
    expect(parseNecessaryWordLine('not a vocabulary line')).toBeNull()
    expect(parseNecessaryWordsText('1. Cat [kæt] — кошка\nbad line')).toHaveLength(1)
  })
})
