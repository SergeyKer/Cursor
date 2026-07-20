export const FOOTER_SHEET_SWIPE_START_PX = 6
export const FOOTER_SHEET_DISMISS_PX = 90
export const FOOTER_SHEET_BACKDROP_FADE_SPAN = 420

export function shouldDismissFooterSheet(deltaY: number): boolean {
  return deltaY >= FOOTER_SHEET_DISMISS_PX
}

export function footerSheetBackdropOpacity(
  deltaY: number,
  span = FOOTER_SHEET_BACKDROP_FADE_SPAN
): number {
  if (deltaY <= 0) return 1
  return Math.max(0, 1 - deltaY / span)
}

export function shouldStartFooterSheetSwipe(deltaY: number): boolean {
  return deltaY > FOOTER_SHEET_SWIPE_START_PX
}

/** Sheet drag offset never goes above rest position. */
export function clampFooterSheetDragDelta(deltaY: number): number {
  return Math.max(0, deltaY)
}

/**
 * Once drag-dismiss is claimed for a touch, keep ownership until touch end.
 * Do not abort on reverse movement (negative deltaY).
 */
export function isFooterSheetSwipeOwned(swipeActive: boolean): boolean {
  return swipeActive
}
