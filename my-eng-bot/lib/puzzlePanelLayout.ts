import type { FooterVoiceCandidate } from '@/lib/footerVoice'
import {
  CHIP_PANEL_DEFAULT_WIDTH_PX,
  estimateFlexChipBlockMinHeightFromItems,
  layoutFlexChipRows,
  PUZZLE_WORD_BANK_ROW_GAP_PX,
  resolveFlexChipHeightPx,
} from '@/lib/chipFlexLayout'

export const DEFAULT_PUZZLE_ERROR_TEXT = 'Порядок неверный. Попробуйте ещё раз.'

/** Подсказка «первое слово» только для банков длиннее порога. */
export const PUZZLE_FIRST_WORD_HINT_THRESHOLD = 4

export function shouldUseFirstWordPuzzleHint(wordCount: number): boolean {
  return wordCount > PUZZLE_FIRST_WORD_HINT_THRESHOLD
}

export function buildPuzzleFirstWordHintText(firstWord: string): string {
  return `Подсказка: первое слово - ${firstWord}.`
}

export function buildPuzzleVariantHintText(correctOrder: string[]): string {
  if (!shouldUseFirstWordPuzzleHint(correctOrder.length)) return ''
  const first = correctOrder[0]?.trim()
  if (!first) return ''
  return buildPuzzleFirstWordHintText(first)
}

export function resolvePuzzleSubHintText(wordCount: number, hintText: string): string {
  if (!shouldUseFirstWordPuzzleHint(wordCount)) return ''
  return hintText.trim()
}

export function resolvePuzzleAttemptChatMessage(params: {
  attempts: number
  errorText: string
  hintText: string
  wordCount: number
  correctAnswer?: string
}): string {
  const errorText = params.errorText.trim() || DEFAULT_PUZZLE_ERROR_TEXT
  if (params.attempts >= 2) {
    const hint = resolvePuzzleSubHintText(params.wordCount, params.hintText)
    if (hint) return hint
    const answer = params.correctAnswer?.trim()
    if (answer) return `${errorText}\nВыбери: ${answer}`.trim()
  }
  return errorText
}

export const PUZZLE_WORD_CHIP_HEIGHT_PX = resolveFlexChipHeightPx('puzzle')
export { PUZZLE_WORD_BANK_ROW_GAP_PX }

/** До замера ResizeObserver - верхняя граница панели пазла. */
export const PUZZLE_BOTTOM_STACK_FALLBACK = '18rem'

const PUZZLE_PANEL_SECTION_PADDING_Y_PX = 16
const PUZZLE_PANEL_HEADER_BLOCK_PX = 34
const PUZZLE_PANEL_INSTRUCTION_BLOCK_PX = 28
const PUZZLE_PANEL_SLOT_ROW_GAP_PX = 6
const PUZZLE_PANEL_CHECK_BUTTON_PX = 40
const PUZZLE_PANEL_WORD_BANK_MARGIN_PX = 8
/** @deprecated Слоты следуют layoutFlexChipRows, не фиксированной сетке. */
export function resolvePuzzleSlotColumns(
  slotCount: number,
  containerWidthPx = CHIP_PANEL_DEFAULT_WIDTH_PX
): number {
  if (slotCount <= 3) return 3
  if (slotCount <= 4) return 4
  return containerWidthPx >= 640 ? 4 : 2
}

export function estimatePuzzleSlotBlockMinHeight(
  slotTokens: string[],
  containerWidthPx = CHIP_PANEL_DEFAULT_WIDTH_PX
): number {
  if (slotTokens.length === 0) return 0
  const rowCount = layoutFlexChipRows(
    slotTokens,
    containerWidthPx,
    'puzzle',
    PUZZLE_PANEL_SLOT_ROW_GAP_PX
  ).length
  return (
    rowCount * PUZZLE_WORD_CHIP_HEIGHT_PX +
    Math.max(0, rowCount - 1) * PUZZLE_PANEL_SLOT_ROW_GAP_PX
  )
}

export function estimatePuzzleWordBankMinHeight(
  words: string[],
  containerWidthPx = CHIP_PANEL_DEFAULT_WIDTH_PX
): number {
  return estimateFlexChipBlockMinHeightFromItems({
    items: words,
    style: 'puzzle',
    containerWidthPx,
    gapPx: PUZZLE_WORD_BANK_ROW_GAP_PX,
  })
}

export function estimatePuzzlePanelMinHeight(params: {
  slotTokens: string[]
  bankWords: string[]
  hasTitle?: boolean
  hasInstruction?: boolean
  containerWidthPx?: number
}): number {
  const containerWidthPx = params.containerWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX
  const wordBankHeight = estimatePuzzleWordBankMinHeight(params.bankWords, containerWidthPx)

  return (
    PUZZLE_PANEL_SECTION_PADDING_Y_PX +
    (params.hasTitle !== false ? PUZZLE_PANEL_HEADER_BLOCK_PX : 0) +
    (params.hasInstruction ? PUZZLE_PANEL_INSTRUCTION_BLOCK_PX : 0) +
    estimatePuzzleSlotBlockMinHeight(params.slotTokens, containerWidthPx) +
    PUZZLE_PANEL_WORD_BANK_MARGIN_PX +
    wordBankHeight +
    PUZZLE_PANEL_CHECK_BUTTON_PX
  )
}

/** @deprecated Используйте estimatePuzzlePanelMinHeight с slotTokens и bankWords. */
export function estimatePuzzleBottomStackMinHeight(wordCount = 4, containerWidthPx?: number): number {
  const words = Array.from({ length: wordCount }, (_, index) => `word${index + 1}`)
  return estimatePuzzlePanelMinHeight({
    slotTokens: words,
    bankWords: words,
    hasTitle: true,
    hasInstruction: true,
    containerWidthPx,
  })
}

/** Подсказка в футере: заголовок текущего подпазла (укладывается в лимит строки). */
export function buildPuzzleFooterVoiceCandidate(params: {
  subIndex: number
  subTotal: number
  variantTitle?: string | null
}): FooterVoiceCandidate {
  const title =
    params.variantTitle?.trim() ||
    `Пазл ${params.subIndex + 1}/${Math.max(params.subTotal, 1)}`
  return {
    key: `puzzle-sub-${params.subIndex}`,
    priority: 55,
    text: title,
    compactText: title,
    tone: 'hint',
  }
}
