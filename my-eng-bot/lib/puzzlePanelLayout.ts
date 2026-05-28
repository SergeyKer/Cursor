import type { FooterVoiceCandidate } from '@/lib/footerVoice'

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
    if (answer) return `${errorText}\nСкажи: ${answer}`.trim()
  }
  return errorText
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

/** Сколько чипов помещается в один ряд на узкой панели (3 коротких слова — одна строка). */
export function resolvePuzzleWordsPerRow(wordCount: number): number {
  if (wordCount <= 1) return 1
  if (wordCount <= 4) return wordCount
  return 2
}

export function estimatePuzzleWordBankMinHeight(fullCount: number, wordsPerRow?: number): number {
  if (fullCount <= 0) return 0
  const columns = Math.max(1, wordsPerRow ?? resolvePuzzleWordsPerRow(fullCount))
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

/** Стабильный minHeight банка на весь подшаг (полный банк, без схлопывания при пустом банке). */
export function resolveActivePuzzleWordBankMinHeight(params: {
  fullWordCount: number
  measuredHeight?: number
}): number {
  if (params.fullWordCount <= 0) return 0
  const measured = params.measuredHeight ?? 0
  if (measured > 0) return measured
  return estimatePuzzleWordBankMinHeight(params.fullWordCount)
}

export function shouldResetBankBaseline(prevVariantId: string, nextVariantId: string): boolean {
  return prevVariantId !== nextVariantId
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

export function estimatePuzzleBottomStackMinHeight(wordCount = 4, wordsPerRow?: number): number {
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
