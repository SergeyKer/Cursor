import { PUZZLE_BOTTOM_STACK_FALLBACK } from '@/lib/puzzlePanelLayout'

export const LESSON_INPUT_GAP_PX = 10
export const LESSON_SCROLL_GAP_REM = 0.625
/** Fallback из globals.css — высота input на шагах 1–4. */
export const CHAT_INPUT_HEIGHT_REM = 5.5

export type LessonScrollLayoutInput = {
  hasCurrentStep: boolean
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  bottomStackHeightPx: number
  useMinimalPuzzlePadding?: boolean
  /** Без замера нижней панели — не раздувать padding (16rem), иначе scrollTo(max) оставляет пустоту. */
  useMinimalPostLessonPadding?: boolean
}

export function resolveBottomStackHeightCss(input: {
  bottomStackHeightPx: number
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  postLessonFallbackRem?: number
}): string {
  if (input.bottomStackHeightPx > 0) {
    return `${input.bottomStackHeightPx}px`
  }
  if (input.hasPostLessonOptions) {
    return `${input.postLessonFallbackRem ?? 16}rem`
  }
  if (input.isSentencePuzzle) {
    return PUZZLE_BOTTOM_STACK_FALLBACK
  }
  return `${CHAT_INPUT_HEIGHT_REM}rem`
}

export function resolveScrollBottomPadding(input: LessonScrollLayoutInput): string | undefined {
  if (!input.hasCurrentStep) return undefined

  if (input.isSentencePuzzle && input.useMinimalPuzzlePadding) {
    return `calc(${LESSON_SCROLL_GAP_REM}rem + ${LESSON_INPUT_GAP_PX}px)`
  }

  if (input.hasPostLessonOptions && input.useMinimalPostLessonPadding) {
    return `calc(${LESSON_SCROLL_GAP_REM}rem + ${LESSON_INPUT_GAP_PX}px)`
  }

  const bottomStackHeightCss = resolveBottomStackHeightCss({
    bottomStackHeightPx: input.bottomStackHeightPx,
    hasPostLessonOptions: input.hasPostLessonOptions,
    isSentencePuzzle: input.isSentencePuzzle,
  })

  return `calc(${LESSON_SCROLL_GAP_REM}rem + ${bottomStackHeightCss} + ${LESSON_INPUT_GAP_PX}px)`
}

export function resolveShowFeedEndAnchor(input: {
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  includePuzzleAnchor?: boolean
}): boolean {
  return input.hasPostLessonOptions || (input.includePuzzleAnchor === true && input.isSentencePuzzle)
}

/** rem → px при типичном 16px root (для расчётов в тестах). */
export function remToPx(rem: number, rootPx = 16): number {
  return rem * rootPx
}

export function parseLessonScrollPaddingPx(
  padding: string | undefined,
  rootPx = 16
): number {
  if (!padding) return 0
  const gapPx = remToPx(LESSON_SCROLL_GAP_REM, rootPx) + LESSON_INPUT_GAP_PX
  if (padding.includes(PUZZLE_BOTTOM_STACK_FALLBACK)) {
    return gapPx + remToPx(18, rootPx)
  }
  if (padding.includes(`${CHAT_INPUT_HEIGHT_REM}rem`)) {
    return gapPx + remToPx(CHAT_INPUT_HEIGHT_REM, rootPx)
  }
  if (padding === `calc(${LESSON_SCROLL_GAP_REM}rem + ${LESSON_INPUT_GAP_PX}px)`) {
    return gapPx
  }
  throw new Error(`Unsupported padding in test: ${padding}`)
}

export function computeMaxScrollTop(scrollHeight: number, clientHeight: number): number {
  return Math.max(0, scrollHeight - clientHeight)
}

/** scrollTo(max) — для puzzle, где feedEndAnchor и scrollIntoView не используются. */
export function scrollLessonFeedToMax(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scrollContainer) return
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  scrollContainer.scrollTo({ top: maxTop, behavior })
}

/**
 * Модель scrollIntoView({ block: 'end' }) для нулевого якоря в конце контента.
 * Если идеальный scrollTop < 0 — браузер остаётся на 0 (контент «липнет» к верху).
 */
export function simulateScrollTopAfterIntoViewEnd(params: {
  contentHeightPx: number
  clientHeightPx: number
  scrollPaddingBottomPx: number
}): number {
  const { contentHeightPx, clientHeightPx, scrollPaddingBottomPx } = params
  const scrollHeight = contentHeightPx + scrollPaddingBottomPx
  const maxScrollTop = computeMaxScrollTop(scrollHeight, clientHeightPx)
  const idealScrollTop = contentHeightPx - (clientHeightPx - scrollPaddingBottomPx)
  if (idealScrollTop < 0) return 0
  return Math.min(idealScrollTop, maxScrollTop)
}

/** Видимый зазор между низом последнего сообщения и низом scroll-viewport при scrollTop. */
export function computeVisibleGapAboveScrollBottom(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
  scrollTop: number
}): number {
  const { contentHeightPx, clientHeightPx, scrollTop } = params
  const contentBottomInViewport = contentHeightPx - scrollTop
  return Math.max(0, clientHeightPx - contentBottomInViewport)
}

/** scrollTo({ top: scrollHeight }) в браузере даёт scrollTop = maxScrollTop. */
export function simulateScrollTopAfterScrollToMax(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
}): number {
  const scrollHeight = params.contentHeightPx + params.scrollPaddingBottomPx
  return computeMaxScrollTop(scrollHeight, params.clientHeightPx)
}
