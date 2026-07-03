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

export function layoutFlexChipRows(
  items: string[],
  containerWidthPx: number,
  style: FlexChipStyle,
  gapPx: number = PUZZLE_WORD_BANK_ROW_GAP_PX
): string[][] {
  if (items.length === 0) return []

  const width = Math.max(1, containerWidthPx)
  const rows: string[][] = [[]]
  let rowWidth = 0

  for (const item of items) {
    const chipWidth = estimateFlexChipWidth(item, style)
    const needed = rowWidth === 0 ? chipWidth : rowWidth + gapPx + chipWidth
    if (rowWidth > 0 && needed > width) {
      rows.push([item])
      rowWidth = chipWidth
    } else {
      rows[rows.length - 1].push(item)
      rowWidth = needed
    }
  }

  return rows
}

export type FlexChipRowWithIndex = {
  token: string
  index: number
}

export function layoutFlexChipRowsWithIndices(
  items: string[],
  containerWidthPx: number,
  style: FlexChipStyle,
  gapPx: number = PUZZLE_WORD_BANK_ROW_GAP_PX
): FlexChipRowWithIndex[][] {
  if (items.length === 0) return []

  const width = Math.max(1, containerWidthPx)
  const rows: FlexChipRowWithIndex[][] = [[]]
  let rowWidth = 0

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const chipWidth = estimateFlexChipWidth(item, style)
    const needed = rowWidth === 0 ? chipWidth : rowWidth + gapPx + chipWidth
    if (rowWidth > 0 && needed > width) {
      rows.push([{ token: item, index }])
      rowWidth = chipWidth
    } else {
      rows[rows.length - 1].push({ token: item, index })
      rowWidth = needed
    }
  }

  return rows
}

export function resolveFlexRowSlotWidthPx(
  laneWidthPx: number,
  slotBasisCount: number,
  gapPx: number = PUZZLE_WORD_BANK_ROW_GAP_PX
): number {
  if (slotBasisCount <= 0) return 0
  const width = Math.max(1, laneWidthPx)
  return Math.max(0, Math.floor((width - (slotBasisCount - 1) * gapPx) / slotBasisCount))
}

export function resolveFlexChipRowBasisCount(rows: string[][]): number {
  if (rows.length === 0) return 0
  return Math.max(...rows.map((row) => row.length))
}

export function countFlexChipRows(
  items: string[],
  containerWidthPx: number,
  gapPx: number,
  style: FlexChipStyle
): number {
  return layoutFlexChipRows(items, containerWidthPx, style, gapPx).length
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
