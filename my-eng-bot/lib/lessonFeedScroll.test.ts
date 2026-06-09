import { describe, expect, it } from 'vitest'
import {
  CHAT_INPUT_HEIGHT_REM,
  computeVisibleGapAboveScrollBottom,
  LESSON_INPUT_GAP_PX,
  parseLessonScrollPaddingPx,
  remToPx,
  resolveLessonFeedScrollMode,
  resolveLessonScrollBehavior,
  resolveLessonScrollContainerPaddingPx,
  resolveRelaxFeedTailPin,
  resolveScrollBottomPadding,
  resolveShowFeedEndAnchor,
  shouldPinLessonFeedTailNearComposer,
  simulateScrollTopAfterIntoViewEnd,
  simulateScrollTopAfterScrollToMax,
  simulateScrollTopAfterTailIfNeeded,
} from '@/lib/lessonFeedScroll'

const ROOT_PX = 16
const CLIENT_HEIGHT_PX = 400
const SHORT_CONTENT_PX = 100
const LONG_CONTENT_PX = 2200
const SYMMETRIC_PADDING_PX = resolveLessonScrollContainerPaddingPx(ROOT_PX)

describe('resolveScrollBottomPadding', () => {
  it('composerOutsideScroll: true → undefined (симметрия через tailwind p-2.5)', () => {
    expect(
      resolveScrollBottomPadding({
        hasCurrentStep: true,
        hasPostLessonOptions: false,
        isSentencePuzzle: false,
        bottomStackHeightPx: 66,
        composerOutsideScroll: true,
      })
    ).toBeUndefined()
  })

  it('composerOutsideScroll + puzzle: без доп. padding (dock снаружи scroll)', () => {
    expect(
      resolveScrollBottomPadding({
        hasCurrentStep: true,
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        bottomStackHeightPx: 0,
        composerOutsideScroll: true,
      })
    ).toBeUndefined()
  })

  it('legacy: без composerOutsideScroll padding включает высоту панели', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: false,
      isSentencePuzzle: false,
      bottomStackHeightPx: 0,
    })
    expect(padding).toContain(`${CHAT_INPUT_HEIGHT_REM}rem`)
    expect(parseLessonScrollPaddingPx(padding, ROOT_PX)).toBe(
      remToPx(0.625 + CHAT_INPUT_HEIGHT_REM, ROOT_PX) + LESSON_INPUT_GAP_PX
    )
  })

  it('puzzle без composerOutsideScroll: fallback 18rem', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: false,
      isSentencePuzzle: true,
      bottomStackHeightPx: 0,
    })
    expect(padding).toContain('18rem')
  })
})

describe('resolveRelaxFeedTailPin', () => {
  it('checking on entire phase including before service line', () => {
    expect(
      resolveRelaxFeedTailPin({
        status: 'checking',
        showAdvancingStatusLine: false,
        isAdvancingToNextStep: false,
        isAdvancingToNextVariant: false,
      })
    ).toBe(true)
  })

  it('advancing service line relaxes pin', () => {
    expect(
      resolveRelaxFeedTailPin({
        status: 'feedback',
        showAdvancingStatusLine: true,
        isAdvancingToNextStep: true,
        isAdvancingToNextVariant: false,
      })
    ).toBe(true)
  })

  it('puzzle idle does not relax', () => {
    expect(
      resolveRelaxFeedTailPin({
        status: 'idle',
        showAdvancingStatusLine: false,
        isAdvancingToNextStep: false,
        isAdvancingToNextVariant: false,
      })
    ).toBe(false)
  })
})

describe('shouldPinLessonFeedTailNearComposer', () => {
  it('puzzle idle pins tail near composer', () => {
    expect(
      shouldPinLessonFeedTailNearComposer({
        useFeedScrollToMax: true,
        relaxFeedTailPin: false,
      })
    ).toBe(true)
  })

  it('checking unpins tail', () => {
    expect(
      shouldPinLessonFeedTailNearComposer({
        useFeedScrollToMax: true,
        relaxFeedTailPin: true,
      })
    ).toBe(false)
  })

  it('non-puzzle never pins', () => {
    expect(
      shouldPinLessonFeedTailNearComposer({
        useFeedScrollToMax: false,
        relaxFeedTailPin: false,
      })
    ).toBe(false)
  })
})

describe('resolveLessonFeedScrollMode', () => {
  it('puzzle idle scrolls to max', () => {
    expect(
      resolveLessonFeedScrollMode({ useFeedScrollToMax: true, relaxFeedTailPin: false })
    ).toBe('scroll_to_max')
  })

  it('puzzle checking uses tail if needed', () => {
    expect(
      resolveLessonFeedScrollMode({ useFeedScrollToMax: true, relaxFeedTailPin: true })
    ).toBe('tail_if_needed')
  })

  it('chip/text steps always tail if needed', () => {
    expect(
      resolveLessonFeedScrollMode({ useFeedScrollToMax: false, relaxFeedTailPin: false })
    ).toBe('tail_if_needed')
  })
})

describe('resolveLessonScrollBehavior', () => {
  it('prefersReducedMotion → auto', () => {
    expect(
      resolveLessonScrollBehavior({ prefersReducedMotion: true, reason: 'reveal' })
    ).toBe('auto')
  })

  it('overflow_follow → smooth', () => {
    expect(
      resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'overflow_follow' })
    ).toBe('smooth')
  })

  it('initial → auto', () => {
    expect(
      resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'initial' })
    ).toBe('auto')
  })

  it('step_change / reveal / new_message / feedback → smooth', () => {
    expect(
      resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'step_change' })
    ).toBe('smooth')
    expect(resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'reveal' })).toBe(
      'smooth'
    )
    expect(
      resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'new_message' })
    ).toBe('smooth')
    expect(resolveLessonScrollBehavior({ prefersReducedMotion: false, reason: 'feedback' })).toBe(
      'smooth'
    )
  })
})

describe('simulateScrollTopAfterTailIfNeeded', () => {
  it('короткая лента: scrollTop = 0', () => {
    expect(
      simulateScrollTopAfterTailIfNeeded({
        contentHeightPx: 300,
        scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
        clientHeightPx: CLIENT_HEIGHT_PX,
      })
    ).toBe(0)
  })

  it('длинная лента: scrollTop > 0', () => {
    expect(
      simulateScrollTopAfterTailIfNeeded({
        contentHeightPx: LONG_CONTENT_PX,
        scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
        clientHeightPx: CLIENT_HEIGHT_PX,
      })
    ).toBeGreaterThan(0)
  })
})

describe('showFeedEndAnchor — puzzle + scrollIntoView path', () => {
  it('puzzle с includePuzzleAnchor', () => {
    expect(
      resolveShowFeedEndAnchor({
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        includePuzzleAnchor: true,
      })
    ).toBe(true)
  })

  it('puzzle без feedEndAnchor', () => {
    expect(
      resolveShowFeedEndAnchor({
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        includePuzzleAnchor: false,
      })
    ).toBe(false)
  })
})

describe('simulateScrollTopAfterIntoViewEnd — раздутый padding (legacy)', () => {
  const puzzlePaddingPx = remToPx(0.625 + 18, ROOT_PX) + LESSON_INPUT_GAP_PX

  it('короткая лента + 18rem scrollPadding: scrollTop почти 0', () => {
    const scrollTop = simulateScrollTopAfterIntoViewEnd({
      contentHeightPx: SHORT_CONTENT_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
    })
    expect(scrollTop).toBeLessThan(20)
  })

  it('при scrollTop=0 виден огромный зазор (legacy баг)', () => {
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: SHORT_CONTENT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop: 0,
    })
    expect(visibleGap).toBeGreaterThan(250)
  })
})

describe('scrollTo(max) с симметричным padding (урок после fix)', () => {
  it('длинная лента + p-2.5 padding — зазор ~10px', () => {
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThanOrEqual(8)
    expect(visibleGap).toBeLessThan(14)
  })

  it('legacy: раздутый padding даёт зазор ~300px', () => {
    const inflatedPaddingPx = remToPx(0.625 + 18, ROOT_PX) + LESSON_INPUT_GAP_PX
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: inflatedPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: inflatedPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThan(290)
  })
})
