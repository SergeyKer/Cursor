export const DEFAULT_PUZZLE_ERROR_TEXT = 'Порядок неверный. Попробуйте ещё раз.'

export function resolvePuzzleAttemptChatMessage(params: {
  attempts: number
  errorText: string
  hintText: string
}): string {
  if (params.attempts >= 2) {
    const hint = params.hintText.trim()
    if (hint) return hint
  }
  return params.errorText.trim() || DEFAULT_PUZZLE_ERROR_TEXT
}

export function shouldCaptureBankBaseline(params: {
  selectedCount: number
  availableCount: number
  fullCount: number
}): boolean {
  return params.selectedCount === 0 && params.availableCount === params.fullCount && params.fullCount > 0
}

export const PUZZLE_WORD_CHIP_HEIGHT_PX = 36
export const PUZZLE_WORD_BANK_ROW_GAP_PX = 6

/** До замера ResizeObserver в LessonStepRenderer — панель пазла выше обычного композера. */
export const PUZZLE_BOTTOM_STACK_FALLBACK = '18rem'

/** Вертикальные части LessonSentencePuzzle (px), без word bank. */
const PUZZLE_PANEL_SECTION_PADDING_Y_PX = 16
const PUZZLE_PANEL_HEADER_BLOCK_PX = 34
const PUZZLE_PANEL_INSTRUCTION_BLOCK_PX = 28
const PUZZLE_PANEL_SLOTS_BLOCK_PX = 44
const PUZZLE_PANEL_CHECK_BUTTON_PX = 40
const PUZZLE_PANEL_WORD_BANK_MARGIN_PX = 8

export function estimatePuzzleWordBankMinHeight(fullCount: number, wordsPerRow = 2): number {
  if (fullCount <= 0) return 0
  const columns = Math.max(1, wordsPerRow)
  const rows = Math.ceil(fullCount / columns)
  return rows * PUZZLE_WORD_CHIP_HEIGHT_PX + Math.max(0, rows - 1) * PUZZLE_WORD_BANK_ROW_GAP_PX
}

export function resolvePuzzleWordBankHeight(params: {
  fullCount: number
  measuredHeight?: number
  wordsPerRow?: number
}): number {
  const estimated = estimatePuzzleWordBankMinHeight(params.fullCount, params.wordsPerRow)
  const measured = params.measuredHeight ?? 0
  return Math.max(estimated, measured)
}

export function shouldResetBankBaseline(prevVariantId: string, nextVariantId: string): boolean {
  return prevVariantId !== nextVariantId
}

export function estimatePuzzleBottomStackMinHeight(wordCount = 4, wordsPerRow = 2): number {
  const wordBankHeight = estimatePuzzleWordBankMinHeight(wordCount, wordsPerRow)
  return (
    PUZZLE_PANEL_SECTION_PADDING_Y_PX +
    PUZZLE_PANEL_HEADER_BLOCK_PX +
    PUZZLE_PANEL_INSTRUCTION_BLOCK_PX +
    PUZZLE_PANEL_SLOTS_BLOCK_PX +
    PUZZLE_PANEL_WORD_BANK_MARGIN_PX +
    wordBankHeight +
    PUZZLE_PANEL_CHECK_BUTTON_PX
  )
}
