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
