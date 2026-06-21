import {
  computeMaxScrollTop,
  LESSON_INPUT_GAP_PX,
  LESSON_SCROLL_GAP_REM,
  remToPx,
} from '@/lib/lessonFeedScroll'

export const PRACTICE_PIN_BLOCK_GAP_PX = 8
/** Зазор, чтобы pin не переключался туда-сюда на границе высоты viewport. */
export const PRACTICE_PIN_HYSTERESIS_PX = 24

export function resolvePracticeScrollPaddingPx(bottomStackHeightPx: number, rootPx = 16): number {
  return remToPx(LESSON_SCROLL_GAP_REM, rootPx) + bottomStackHeightPx + LESSON_INPUT_GAP_PX
}

/** Композер снаружи scroll-контейнера - для pin не дублируем его высоту в viewport. */
export function resolvePracticePinBottomInsetPx(): number {
  return LESSON_INPUT_GAP_PX + PRACTICE_PIN_BLOCK_GAP_PX
}

/** Сравниваем высоту контента ленты (без scroll-padding), иначе padding раздувает scrollHeight и ломает pin. */
export function isPracticeFeedShorterThanViewport(params: {
  contentHeightPx: number
  clientHeightPx: number
}): boolean {
  return params.contentHeightPx + PRACTICE_PIN_HYSTERESIS_PX <= params.clientHeightPx
}

/** offsetTop блока относительно scroll-контейнера (с учётом текущего scrollTop). */
export function getBlockOffsetTopWithinScrollRoot(
  scrollRoot: HTMLElement,
  block: HTMLElement
): number {
  const scrollRootRect = scrollRoot.getBoundingClientRect()
  const blockRect = block.getBoundingClientRect()
  return blockRect.top - scrollRootRect.top + scrollRoot.scrollTop
}

/** scrollTop, чтобы низ блока оказался над padding композера. */
export function computeScrollTopToPinBlockBottom(params: {
  blockTopPx: number
  blockHeightPx: number
  clientHeightPx: number
  scrollPaddingBottomPx: number
  scrollHeightPx: number
  gapPx?: number
}): number {
  const gap = params.gapPx ?? PRACTICE_PIN_BLOCK_GAP_PX
  const blockBottom = params.blockTopPx + params.blockHeightPx
  const visibleContentBottom = params.clientHeightPx - params.scrollPaddingBottomPx
  const idealScrollTop = blockBottom - visibleContentBottom + gap
  const maxScrollTop = computeMaxScrollTop(params.scrollHeightPx, params.clientHeightPx)
  if (idealScrollTop <= 0) return 0
  return Math.min(idealScrollTop, maxScrollTop)
}
