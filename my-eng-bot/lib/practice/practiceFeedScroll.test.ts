import { describe, expect, it } from 'vitest'
import {
  computeScrollTopToPinBlockBottom,
  isPracticeFeedShorterThanViewport,
  PRACTICE_PIN_BLOCK_GAP_PX,
  resolvePracticeScrollPaddingPx,
} from '@/lib/practice/practiceFeedScroll'

const CLIENT_HEIGHT = 500
const PADDING = 120
const SCROLL_HEIGHT = 900

describe('practiceFeedScroll', () => {
  it('resolves scroll padding from bottom stack height', () => {
    expect(resolvePracticeScrollPaddingPx(88, 16)).toBe(10 + 88 + 10)
  })

  it('detects short feed that should pin to composer by content height', () => {
    expect(
      isPracticeFeedShorterThanViewport({
        contentHeightPx: 480,
        clientHeightPx: CLIENT_HEIGHT,
      })
    ).toBe(true)
    expect(
      isPracticeFeedShorterThanViewport({
        contentHeightPx: 560,
        clientHeightPx: CLIENT_HEIGHT,
      })
    ).toBe(false)
  })

  it('does not pin when only scrollHeight fits but content is taller (padding trap)', () => {
    expect(
      isPracticeFeedShorterThanViewport({
        contentHeightPx: 560,
        clientHeightPx: CLIENT_HEIGHT,
      })
    ).toBe(false)
  })

  it('short feed on step 1 (index 0) uses the same pin threshold as later steps', () => {
    const shortFeedOnFirstStep = isPracticeFeedShorterThanViewport({
      contentHeightPx: 320,
      clientHeightPx: CLIENT_HEIGHT,
    })
    expect(shortFeedOnFirstStep).toBe(true)
  })

  it('pins block bottom above composer padding on long feed', () => {
    const blockTop = 520
    const blockHeight = 180
    const scrollTop = computeScrollTopToPinBlockBottom({
      blockTopPx: blockTop,
      blockHeightPx: blockHeight,
      clientHeightPx: CLIENT_HEIGHT,
      scrollPaddingBottomPx: PADDING,
      scrollHeightPx: SCROLL_HEIGHT,
    })
    const blockBottomInViewport = blockTop + blockHeight - scrollTop
    expect(blockBottomInViewport).toBeLessThanOrEqual(CLIENT_HEIGHT - PADDING + PRACTICE_PIN_BLOCK_GAP_PX)
    expect(scrollTop).toBeGreaterThan(0)
  })

  it('returns 0 scrollTop when block already fits without scrolling', () => {
    const scrollTop = computeScrollTopToPinBlockBottom({
      blockTopPx: 40,
      blockHeightPx: 120,
      clientHeightPx: CLIENT_HEIGHT,
      scrollPaddingBottomPx: PADDING,
      scrollHeightPx: 300,
    })
    expect(scrollTop).toBe(0)
  })
})
