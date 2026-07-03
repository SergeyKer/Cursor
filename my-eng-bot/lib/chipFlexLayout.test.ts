import { describe, expect, it } from 'vitest'
import {
  CHIP_PANEL_DEFAULT_WIDTH_PX,
  countFlexChipRows,
  estimateFlexChipBlockMinHeightFromItems,
  layoutFlexChipRows,
  layoutFlexChipRowsWithIndices,
  PUZZLE_WORD_BANK_ROW_GAP_PX,
  resolveFlexChipRowBasisCount,
  resolveFlexRowSlotWidthPx,
} from '@/lib/chipFlexLayout'

const I_KNOW_WORDS = ['I', 'know', 'what', 'she', 'likes']
const ITS_TIME_WORDS = ["It's", 'time', 'to', 'go', 'home']

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

describe('layoutFlexChipRows', () => {
  it('packs five short practice words into one row on a mobile lane', () => {
    expect(layoutFlexChipRows(ITS_TIME_WORDS, 395, 'puzzle', PUZZLE_WORD_BANK_ROW_GAP_PX)).toEqual([
      ITS_TIME_WORDS,
    ])
    expect(countFlexChipRows(ITS_TIME_WORDS, 395, PUZZLE_WORD_BANK_ROW_GAP_PX, 'puzzle')).toBe(1)
  })

  it('preserves global indices when rows wrap', () => {
    const rows = layoutFlexChipRowsWithIndices(B2_WORDS, 320, 'puzzle', PUZZLE_WORD_BANK_ROW_GAP_PX)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.flat().map((item) => item.index)).toEqual(B2_WORDS.map((_, index) => index))
  })

  it('uses the fullest row as slot basis count', () => {
    const rows = layoutFlexChipRows(ITS_TIME_WORDS, 395, 'puzzle', PUZZLE_WORD_BANK_ROW_GAP_PX)
    expect(resolveFlexChipRowBasisCount(rows)).toBe(5)
  })

  it('keeps equal slot width for a partial last row', () => {
    const rows = layoutFlexChipRows(['one', 'two', 'three', 'four', 'five'], 180, 'puzzle', PUZZLE_WORD_BANK_ROW_GAP_PX)
    const basisCount = resolveFlexChipRowBasisCount(rows)
    const slotWidth = resolveFlexRowSlotWidthPx(180, basisCount, PUZZLE_WORD_BANK_ROW_GAP_PX)
    expect(basisCount).toBeGreaterThan(1)
    expect(slotWidth).toBeGreaterThan(0)
    expect(slotWidth * basisCount).toBeLessThanOrEqual(180)
  })
})

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
