import { PUZZLE_BOTTOM_STACK_FALLBACK } from '@/lib/puzzlePanelLayout'

export const LESSON_INPUT_GAP_PX = 10
export const LESSON_SCROLL_GAP_REM = 0.625
/** Симметричный padding scroll-контейнера (tailwind p-2.5). */
export const LESSON_SCROLL_CONTAINER_PADDING_REM = LESSON_SCROLL_GAP_REM
/** Fallback из globals.css — высота input на шагах 1–4. */
export const CHAT_INPUT_HEIGHT_REM = 5.5

export type LessonScrollLayoutInput = {
  hasCurrentStep: boolean
  hasPostLessonOptions: boolean
  isSentencePuzzle: boolean
  bottomStackHeightPx: number
  /** Нижняя панель — sibling вне scroll (LessonStepRenderer). */
  composerOutsideScroll?: boolean
}

export type LessonScrollBehaviorReason =
  | 'initial'
  | 'step_change'
  | 'overflow_follow'
  | 'reveal'
  | 'new_message'
  | 'feedback'

export function resolveLessonScrollBehavior(input: {
  prefersReducedMotion: boolean
  reason: LessonScrollBehaviorReason
}): ScrollBehavior {
  if (input.prefersReducedMotion) return 'auto'
  if (input.reason === 'initial') {
    return 'auto'
  }
  return 'smooth'
}

/** Fallback, если scrollend не сработал (уже у дна ленты или старый браузер). */
export const LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS = 650

function invokeAfterScrollComplete(
  scrollContainer: HTMLElement,
  behavior: ScrollBehavior,
  onComplete: () => void
): () => void {
  if (behavior === 'auto') {
    onComplete()
    return () => {}
  }

  let done = false
  const complete = () => {
    if (done) return
    done = true
    onComplete()
  }

  const onScrollEnd = () => complete()
  scrollContainer.addEventListener('scrollend', onScrollEnd, { once: true })
  const fallback = window.setTimeout(complete, LESSON_FEED_SCROLL_COMPLETE_FALLBACK_MS)

  return () => {
    scrollContainer.removeEventListener('scrollend', onScrollEnd)
    window.clearTimeout(fallback)
  }
}

export function scrollLessonFeedTailIfNeededWithComplete(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  onComplete?: () => void
): () => void {
  if (!scrollContainer) return () => {}
  scrollLessonFeedTailIfNeeded(scrollContainer, behavior)
  if (!onComplete) return () => {}
  return invokeAfterScrollComplete(scrollContainer, behavior, onComplete)
}

export function scrollLessonFeedToMaxWithComplete(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
  onComplete?: () => void
): () => void {
  if (!scrollContainer) return () => {}
  scrollLessonFeedToMax(scrollContainer, behavior)
  if (!onComplete) return () => {}
  return invokeAfterScrollComplete(scrollContainer, behavior, onComplete)
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
    return `${input.postLessonFallbackRem ?? 12}rem`
  }
  if (input.isSentencePuzzle) {
    return PUZZLE_BOTTOM_STACK_FALLBACK
  }
  return `${CHAT_INPUT_HEIGHT_REM}rem`
}

export function resolveScrollBottomPadding(input: LessonScrollLayoutInput): string | undefined {
  if (!input.hasCurrentStep) return undefined

  if (input.composerOutsideScroll) {
    return undefined
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

export type LessonFeedScrollMode = 'scroll_to_max' | 'tail_if_needed'

/** Отключить pin/scrollToMax на пазле: checking (включая 500ms до service-строки) и advancing. */
export function resolveRelaxFeedTailPin(input: {
  status: 'idle' | 'checking' | 'feedback' | 'completed'
  showAdvancingStatusLine: boolean
  isAdvancingToNextStep: boolean
  isAdvancingToNextVariant: boolean
}): boolean {
  return (
    input.status === 'checking' ||
    (input.showAdvancingStatusLine &&
      (input.isAdvancingToNextStep || input.isAdvancingToNextVariant))
  )
}

export function shouldPinLessonFeedTailNearComposer(input: {
  useFeedScrollToMax: boolean
  relaxFeedTailPin: boolean
}): boolean {
  return input.useFeedScrollToMax && !input.relaxFeedTailPin
}

export function resolveLessonFeedScrollMode(input: {
  useFeedScrollToMax: boolean
  relaxFeedTailPin: boolean
}): LessonFeedScrollMode {
  if (!input.useFeedScrollToMax) return 'tail_if_needed'
  if (input.relaxFeedTailPin) return 'tail_if_needed'
  return 'scroll_to_max'
}

/** rem → px при типичном 16px root (для расчётов в тестах). */
export function remToPx(rem: number, rootPx = 16): number {
  return rem * rootPx
}

export function resolveLessonScrollContainerPaddingPx(rootPx = 16): number {
  return remToPx(LESSON_SCROLL_CONTAINER_PADDING_REM, rootPx)
}

export function parseLessonScrollPaddingPx(
  padding: string | undefined,
  rootPx = 16
): number {
  if (!padding) {
    return resolveLessonScrollContainerPaddingPx(rootPx)
  }
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

/** Двойной rAF: дождаться layout перед scrollTo (нужно на iOS Safari). */
export function scheduleScrollAfterLayout(run: () => void): () => void {
  let innerRaf = 0
  const outerRaf = requestAnimationFrame(() => {
    innerRaf = requestAnimationFrame(run)
  })
  return () => {
    cancelAnimationFrame(outerRaf)
    if (innerRaf) cancelAnimationFrame(innerRaf)
  }
}

/** Класс scroll-контейнера ленты урока/чата: touch-скролл на iOS Safari. */
export const LESSON_SCROLL_VIEWPORT_CLASS =
  'lesson-scroll-viewport min-h-0 flex-1 overflow-y-auto overflow-x-hidden'

/** scrollTo(max) — для puzzle / post-lesson. */
export function scrollLessonFeedToMax(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scrollContainer) return
  const maxTop = computeMaxScrollTop(scrollContainer.scrollHeight, scrollContainer.clientHeight)
  scrollContainer.scrollTo({ top: maxTop, behavior })
}

/**
 * Скролл к хвосту ленты — как в Chat.tsx: scrollTo(scrollHeight, behavior).
 * При короткой ленте браузер остаётся на scrollTop = 0.
 */
export function scrollLessonFeedTailIfNeeded(
  scrollContainer: HTMLElement | null,
  behavior: ScrollBehavior = 'auto'
): void {
  if (!scrollContainer) return
  scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior })
}

export function isLessonFeedOverflowing(scrollContainer: HTMLElement | null): boolean {
  if (!scrollContainer) return false
  return scrollContainer.scrollHeight > scrollContainer.clientHeight
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

/** Модель scrollLessonFeedTailIfNeeded при заданных размерах. */
export function simulateScrollTopAfterTailIfNeeded(params: {
  contentHeightPx: number
  scrollPaddingBottomPx: number
  clientHeightPx: number
}): number {
  const scrollHeight = params.contentHeightPx + params.scrollPaddingBottomPx
  if (scrollHeight <= params.clientHeightPx) return 0
  return computeMaxScrollTop(scrollHeight, params.clientHeightPx)
}
