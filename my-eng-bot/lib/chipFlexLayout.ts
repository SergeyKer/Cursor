export type FlexChipStyle = 'choice' | 'puzzle'

/** max-w-[29rem] минус px-2.5 секции пазла (10+10). */
export const CHIP_PANEL_DEFAULT_WIDTH_PX = 444

const FLEX_CHIP_BORDER_PX = 2
const FLEX_CHIP_MIN_WIDTH_PX = 36

const CHOICE_CHIP_HORIZONTAL_PADDING_PX = 24
const CHOICE_CHIP_CHAR_WIDTH_PX = 7

const PUZZLE_CHIP_HORIZONTAL_PADDING_PX = 20
const PUZZLE_CHIP_CHAR_WIDTH_PX = 7

const CHOICE_CHIP_HEIGHT_PX = 36
const PUZZLE_CHIP_HEIGHT_PX = 36

export const PUZZLE_WORD_BANK_ROW_GAP_PX = 6

export function resolveFlexChipHeightPx(style: FlexChipStyle): number {
  return style === 'choice' ? CHOICE_CHIP_HEIGHT_PX : PUZZLE_CHIP_HEIGHT_PX
}

export function estimateFlexChipWidth(text: string, style: FlexChipStyle): number {
  const trimmed = text.trim()
  const horizontalPadding =
    style === 'choice' ? CHOICE_CHIP_HORIZONTAL_PADDING_PX : PUZZLE_CHIP_HORIZONTAL_PADDING_PX
  const charWidth = style === 'choice' ? CHOICE_CHIP_CHAR_WIDTH_PX : PUZZLE_CHIP_CHAR_WIDTH_PX
  const contentWidth = horizontalPadding + FLEX_CHIP_BORDER_PX + trimmed.length * charWidth
  return Math.max(FLEX_CHIP_MIN_WIDTH_PX, Math.ceil(contentWidth))
}

export function countFlexChipRows(
  items: string[],
  containerWidthPx: number,
  gapPx: number,
  style: FlexChipStyle
): number {
  if (items.length === 0) return 0
  const width = Math.max(1, containerWidthPx)
  let rows = 1
  let rowWidth = 0

  for (const item of items) {
    const chipWidth = estimateFlexChipWidth(item, style)
    const needed = rowWidth === 0 ? chipWidth : rowWidth + gapPx + chipWidth
    if (rowWidth > 0 && needed > width) {
      rows += 1
      rowWidth = chipWidth
    } else {
      rowWidth = needed
    }
  }

  return rows
}

export function estimateFlexChipBlockMinHeight(params: {
  rowCount: number
  chipHeightPx: number
  gapPx: number
}): number {
  if (params.rowCount <= 0) return 0
  return (
    params.rowCount * params.chipHeightPx + Math.max(0, params.rowCount - 1) * params.gapPx
  )
}

export function estimateFlexChipBlockMinHeightFromItems(params: {
  items: string[]
  style: FlexChipStyle
  containerWidthPx?: number
  gapPx?: number
}): number {
  const gapPx = params.gapPx ?? PUZZLE_WORD_BANK_ROW_GAP_PX
  const chipHeightPx = resolveFlexChipHeightPx(params.style)
  const rows = countFlexChipRows(
    params.items,
    params.containerWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX,
    gapPx,
    params.style
  )
  return estimateFlexChipBlockMinHeight({ rowCount: rows, chipHeightPx, gapPx })
}
