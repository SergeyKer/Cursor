import { describe, expect, it } from 'vitest'
import { highlightCorrected } from '@/lib/languageNote/highlightCorrected'

describe('highlightCorrected', () => {
  it('bolds first occurrences and skips missing highlights', () => {
    expect(highlightCorrected('I like riding a bike.', ['riding', 'missing', 'bike'])).toEqual([
      { text: 'I like ', bold: false },
      { text: 'riding', bold: true },
      { text: ' a ', bold: false },
      { text: 'bike', bold: true },
      { text: '.', bold: false },
    ])
  })

  it('prefers longer highlight when overlapping candidates exist', () => {
    const segments = highlightCorrected('play the fool', ['play the fool', 'play'])
    expect(segments).toEqual([{ text: 'play the fool', bold: true }])
  })
})
