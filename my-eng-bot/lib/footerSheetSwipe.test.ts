import { describe, expect, it } from 'vitest'
import {
  clampFooterSheetDragDelta,
  footerSheetBackdropOpacity,
  FOOTER_SHEET_DISMISS_PX,
  FOOTER_SHEET_SWIPE_START_PX,
  isFooterSheetSwipeOwned,
  shouldDismissFooterSheet,
  shouldStartFooterSheetSwipe,
} from '@/lib/footerSheetSwipe'

describe('footerSheetSwipe', () => {
  it('uses gdebenz-like start and dismiss thresholds', () => {
    expect(FOOTER_SHEET_SWIPE_START_PX).toBe(6)
    expect(FOOTER_SHEET_DISMISS_PX).toBe(90)
    expect(shouldStartFooterSheetSwipe(6)).toBe(false)
    expect(shouldStartFooterSheetSwipe(7)).toBe(true)
    expect(shouldDismissFooterSheet(89)).toBe(false)
    expect(shouldDismissFooterSheet(90)).toBe(true)
  })

  it('fades backdrop while dragging down', () => {
    expect(footerSheetBackdropOpacity(0)).toBe(1)
    expect(footerSheetBackdropOpacity(210)).toBe(0.5)
    expect(footerSheetBackdropOpacity(420)).toBe(0)
    expect(footerSheetBackdropOpacity(500)).toBe(0)
  })

  it('clamps drag delta so reverse motion cannot go above rest', () => {
    expect(clampFooterSheetDragDelta(-40)).toBe(0)
    expect(clampFooterSheetDragDelta(0)).toBe(0)
    expect(clampFooterSheetDragDelta(48)).toBe(48)
  })

  it('keeps swipe ownership after reverse drag (regression vs abort-on-deltaY<=0)', () => {
    expect(isFooterSheetSwipeOwned(false)).toBe(false)
    expect(isFooterSheetSwipeOwned(true)).toBe(true)
    // Claimed drag must stay owned even when finger goes above start (negative delta).
    const swipeActive = true
    const deltaY = -12
    expect(isFooterSheetSwipeOwned(swipeActive)).toBe(true)
    expect(clampFooterSheetDragDelta(deltaY)).toBe(0)
    expect(shouldDismissFooterSheet(clampFooterSheetDragDelta(deltaY))).toBe(false)
  })
})
