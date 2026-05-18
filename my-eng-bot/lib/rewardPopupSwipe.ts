export const REWARD_POPUP_SWIPE_DISMISS_PX = 64

export function shouldDismissSwipe(deltaX: number): boolean {
  return Math.abs(deltaX) >= REWARD_POPUP_SWIPE_DISMISS_PX
}

/** Opacity while dragging horizontally (0.4–1). */
export function swipeDragOpacity(deltaX: number, fadeSpan = 120): number {
  return Math.max(0.4, 1 - Math.abs(deltaX) / fadeSpan)
}
