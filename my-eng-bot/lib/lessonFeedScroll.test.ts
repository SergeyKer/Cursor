import { describe, expect, it } from 'vitest'
import {
  CHAT_INPUT_HEIGHT_REM,
  computeVisibleGapAboveScrollBottom,
  LESSON_INPUT_GAP_PX,
  parseLessonScrollPaddingPx,
  remToPx,
  resolveScrollBottomPadding,
  resolveShowFeedEndAnchor,
  simulateScrollTopAfterIntoViewEnd,
  simulateScrollTopAfterScrollToMax,
} from '@/lib/lessonFeedScroll'

const ROOT_PX = 16
const CLIENT_HEIGHT_PX = 400
/** Короткая лента: один bubble на шаге 5 (~60–120px). */
const SHORT_CONTENT_PX = 100
/** Длинная лента: шаги 1–4 + шаг 5. */
const LONG_CONTENT_PX = 2200

describe('resolveScrollBottomPadding — текущая vs исправленная логика', () => {
  it('шаг 4: padding включает --chat-input-height (~5.5rem), не 18rem', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: false,
      isSentencePuzzle: false,
      bottomStackHeightPx: 0,
    })
    expect(padding).toContain(`${CHAT_INPUT_HEIGHT_REM}rem`)
    expect(padding).not.toContain('18rem')
    expect(parseLessonScrollPaddingPx(padding, ROOT_PX)).toBe(
      remToPx(0.625 + CHAT_INPUT_HEIGHT_REM, ROOT_PX) + LESSON_INPUT_GAP_PX
    )
  })

  it('шаг 5 (текущий баг): padding включает PUZZLE fallback 18rem — в ~3.3× больше шага 4', () => {
    const step4PaddingPx = parseLessonScrollPaddingPx(
      resolveScrollBottomPadding({
        hasCurrentStep: true,
        hasPostLessonOptions: false,
        isSentencePuzzle: false,
        bottomStackHeightPx: 0,
      }),
      ROOT_PX
    )
    const step5PaddingPx = parseLessonScrollPaddingPx(
      resolveScrollBottomPadding({
        hasCurrentStep: true,
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        bottomStackHeightPx: 0,
      }),
      ROOT_PX
    )

    expect(step5PaddingPx).toBeGreaterThan(step4PaddingPx * 2.5)
    expect(step5PaddingPx).toBe(remToPx(0.625 + 18, ROOT_PX) + LESSON_INPUT_GAP_PX)
  })

  it('шаг 5 (fix): минимальный padding без высоты панели пазла', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: false,
      isSentencePuzzle: true,
      bottomStackHeightPx: 0,
      useMinimalPuzzlePadding: true,
    })
    expect(parseLessonScrollPaddingPx(padding, ROOT_PX)).toBe(remToPx(0.625, ROOT_PX) + LESSON_INPUT_GAP_PX)
  })
})

describe('showFeedEndAnchor — puzzle + scrollIntoView path', () => {
  it('текущий баг: puzzle включает feedEndAnchor → scrollIntoView вместо scrollTo', () => {
    expect(
      resolveShowFeedEndAnchor({
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        includePuzzleAnchor: true,
      })
    ).toBe(true)
  })

  it('fix: puzzle без feedEndAnchor', () => {
    expect(
      resolveShowFeedEndAnchor({
        hasPostLessonOptions: false,
        isSentencePuzzle: true,
        includePuzzleAnchor: false,
      })
    ).toBe(false)
  })
})

describe('simulateScrollTopAfterIntoViewEnd — причина «липнет к верху»', () => {
  const puzzlePaddingPx = remToPx(0.625 + 18, ROOT_PX) + LESSON_INPUT_GAP_PX

  it('короткая лента + 18rem scrollPadding: scrollTop почти 0 (липнет к верху)', () => {
    const scrollTop = simulateScrollTopAfterIntoViewEnd({
      contentHeightPx: SHORT_CONTENT_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
    })
    expect(scrollTop).toBeLessThan(20)
  })

  it('при scrollTop=0 виден огромный зазор до низа viewport (как на скрине)', () => {
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: SHORT_CONTENT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop: 0,
    })
    expect(visibleGap).toBeGreaterThan(250)
  })
})

describe('post-lesson medal — padding и scrollTo(max)', () => {
  const postLessonFallbackPaddingPx = remToPx(0.625 + 16, ROOT_PX) + LESSON_INPUT_GAP_PX
  const minimalPaddingPx = remToPx(0.625, ROOT_PX) + LESSON_INPUT_GAP_PX
  const measuredBottomStackPx = 200

  it('до замера: fallback 16rem в resolveScrollBottomPadding', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: true,
      isSentencePuzzle: false,
      bottomStackHeightPx: 0,
    })
    expect(padding).toContain('16rem')
  })

  it('fix: минимальный padding до замера нижней панели', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: true,
      isSentencePuzzle: false,
      bottomStackHeightPx: 0,
      useMinimalPostLessonPadding: true,
    })
    expect(parseLessonScrollPaddingPx(padding, ROOT_PX)).toBe(minimalPaddingPx)
  })

  it('после замера: padding по высоте панели медали', () => {
    const padding = resolveScrollBottomPadding({
      hasCurrentStep: true,
      hasPostLessonOptions: true,
      isSentencePuzzle: false,
      bottomStackHeightPx: measuredBottomStackPx,
    })
    expect(padding).toContain(`${measuredBottomStackPx}px`)
    expect(padding).not.toContain('16rem')
  })

  it('длинная лента + 16rem: огромный зазор над низом scroll-области', () => {
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: postLessonFallbackPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: postLessonFallbackPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThan(250)
  })

  it('fix: длинная лента + замеренная панель — зазор ≈ высоте панели', () => {
    const measuredPaddingPx = minimalPaddingPx + measuredBottomStackPx
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: measuredPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: measuredPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThanOrEqual(measuredBottomStackPx - 5)
    expect(visibleGap).toBeLessThan(measuredBottomStackPx + 35)
  })
})

describe('simulateScrollTopAfterScrollToMax — длинная лента (типичный шаг 5)', () => {
  const puzzlePaddingPx = remToPx(0.625 + 18, ROOT_PX) + LESSON_INPUT_GAP_PX
  const minimalPaddingPx = remToPx(0.625, ROOT_PX) + LESSON_INPUT_GAP_PX

  it('текущий баг: scrollTo max + 18rem padding → зазор ~298px над низом scroll-области', () => {
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: puzzlePaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThan(290)
    expect(visibleGap).toBeLessThan(310)
  })

  it('fix: scrollTo max + минимальный padding → зазор ~26px (как на шагах 1–4 по порядку величины)', () => {
    const scrollTop = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: minimalPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const visibleGap = computeVisibleGapAboveScrollBottom({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: minimalPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
      scrollTop,
    })
    expect(visibleGap).toBeGreaterThanOrEqual(20)
    expect(visibleGap).toBeLessThan(35)
  })
})
