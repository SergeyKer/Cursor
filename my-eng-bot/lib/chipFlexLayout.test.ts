import { describe, expect, it } from 'vitest'
import {
  CHIP_PANEL_DEFAULT_WIDTH_PX,
  countFlexChipRows,
  estimateFlexChipBlockMinHeightFromItems,
  PUZZLE_WORD_BANK_ROW_GAP_PX,
} from '@/lib/chipFlexLayout'

const I_KNOW_WORDS = ['I', 'know', 'what', 'she', 'likes']

const B2_WORDS = [
  'I',
  'really',
  'know',
  'what',
  'she',
  'would',
  'like',
  'tomorrow',
]

describe('countFlexChipRows', () => {
  it('packs five short puzzle words into one row on a wide panel', () => {
    expect(countFlexChipRows(I_KNOW_WORDS, CHIP_PANEL_DEFAULT_WIDTH_PX, PUZZLE_WORD_BANK_ROW_GAP_PX, 'puzzle')).toBe(1)
  })

  it('uses multiple rows for a long B2 sentence on a narrow panel', () => {
    expect(countFlexChipRows(B2_WORDS, 320, PUZZLE_WORD_BANK_ROW_GAP_PX, 'puzzle')).toBeGreaterThanOrEqual(2)
  })
})

describe('estimateFlexChipBlockMinHeightFromItems', () => {
  it('estimates one row for I know puzzle words on a wide panel', () => {
    expect(
      estimateFlexChipBlockMinHeightFromItems({
        items: I_KNOW_WORDS,
        style: 'puzzle',
        containerWidthPx: CHIP_PANEL_DEFAULT_WIDTH_PX,
      })
    ).toBe(36)
  })

  it('estimates more than one row for long words on a narrow panel', () => {
    const height = estimateFlexChipBlockMinHeightFromItems({
      items: B2_WORDS,
      style: 'puzzle',
      containerWidthPx: 320,
    })
    expect(height).toBeGreaterThan(36)
  })
})
