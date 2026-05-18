import { describe, expect, it } from 'vitest'
import {
  REWARD_POPUP_SWIPE_DISMISS_PX,
  shouldDismissSwipe,
  swipeDragOpacity,
} from './rewardPopupSwipe'

describe('rewardPopupSwipe', () => {
  it('dismisses when horizontal delta exceeds threshold', () => {
    expect(shouldDismissSwipe(REWARD_POPUP_SWIPE_DISMISS_PX - 1)).toBe(false)
    expect(shouldDismissSwipe(REWARD_POPUP_SWIPE_DISMISS_PX)).toBe(true)
    expect(shouldDismissSwipe(-REWARD_POPUP_SWIPE_DISMISS_PX)).toBe(true)
  })

  it('fades opacity while dragging', () => {
    expect(swipeDragOpacity(0)).toBe(1)
    expect(swipeDragOpacity(120)).toBe(0.4)
    expect(swipeDragOpacity(200)).toBe(0.4)
  })
})
