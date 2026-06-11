import type { FooterVoiceCandidate } from '@/lib/footerVoice'
import {
  CHIP_PANEL_DEFAULT_WIDTH_PX,
  estimateFlexChipBlockMinHeightFromItems,
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
  return `Подсказка: первое слово — ${firstWord}.`
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

/** До замера ResizeObserver — верхняя граница панели пазла. */
export const PUZZLE_BOTTOM_STACK_FALLBACK = '18rem'

const PUZZLE_PANEL_SECTION_PADDING_Y_PX = 16
const PUZZLE_PANEL_HEADER_BLOCK_PX = 34
const PUZZLE_PANEL_INSTRUCTION_BLOCK_PX = 28
const PUZZLE_PANEL_SLOT_ROW_GAP_PX = 6
const PUZZLE_PANEL_CHECK_BUTTON_PX = 40
const PUZZLE_PANEL_WORD_BANK_MARGIN_PX = 8
const PUZZLE_SM_BREAKPOINT_PX = 640

export function resolvePuzzleSlotColumns(
  slotCount: number,
  containerWidthPx = CHIP_PANEL_DEFAULT_WIDTH_PX
): number {
  if (slotCount <= 3) return 3
  if (slotCount <= 4) return 4
  return containerWidthPx >= PUZZLE_SM_BREAKPOINT_PX ? 4 : 2
}

export function estimatePuzzleSlotBlockMinHeight(
  slotCount: number,
  containerWidthPx = CHIP_PANEL_DEFAULT_WIDTH_PX
): number {
  if (slotCount <= 0) return 0
  const columns = resolvePuzzleSlotColumns(slotCount, containerWidthPx)
  const rows = Math.ceil(slotCount / columns)
  return rows * PUZZLE_WORD_CHIP_HEIGHT_PX + Math.max(0, rows - 1) * PUZZLE_PANEL_SLOT_ROW_GAP_PX
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
  words: string[]
  hasInstruction?: boolean
  containerWidthPx?: number
}): number {
  const containerWidthPx = params.containerWidthPx ?? CHIP_PANEL_DEFAULT_WIDTH_PX
  const wordCount = params.words.length
  const wordBankHeight = estimatePuzzleWordBankMinHeight(params.words, containerWidthPx)

  return (
    PUZZLE_PANEL_SECTION_PADDING_Y_PX +
    PUZZLE_PANEL_HEADER_BLOCK_PX +
    (params.hasInstruction ? PUZZLE_PANEL_INSTRUCTION_BLOCK_PX : 0) +
    estimatePuzzleSlotBlockMinHeight(wordCount, containerWidthPx) +
    PUZZLE_PANEL_WORD_BANK_MARGIN_PX +
    wordBankHeight +
    PUZZLE_PANEL_CHECK_BUTTON_PX
  )
}

/** @deprecated Используйте estimatePuzzlePanelMinHeight с массивом слов. */
export function estimatePuzzleBottomStackMinHeight(wordCount = 4, containerWidthPx?: number): number {
  const words = Array.from({ length: wordCount }, (_, index) => `word${index + 1}`)
  return estimatePuzzlePanelMinHeight({
    words,
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
