import { describe, expect, it } from 'vitest'
import {
  CHAT_INPUT_HEIGHT_REM,
  computeVisibleGapAboveScrollBottom,
  isFollowTailScrollSettled,
  isLessonFeedAnswerTailMessageId,
  isLessonFeedCheckingTailMessageId,
  isLessonFeedFeedbackTailMessageId,
  LESSON_INPUT_GAP_PX,
  parseLessonScrollPaddingPx,
  remToPx,
  computeMaxScrollTop,
  isLessonFeedScrolledToTail,
  isWithinRevealEndOverflowSettleWindow,
  LESSON_FEED_KEYBOARD_SCROLL_GAP_PX,
  LESSON_REVEAL_END_OVERFLOW_SETTLE_MS,
  resolveFollowTailTargetTop,
  resolveLessonShellScrollBehavior,
  resolvePracticeFeedScrollRequest,
  resolveLessonFeedScrollMode,
  resolveLessonScrollBehavior,
  resolveLessonScrollContainerPaddingPx,
  resolvePuzzleFeedMessagesStackClass,
  resolveRelaxFeedTailPin,
  resolveDialogFeedScrollPadding,
  resolveDialogFeedScrollPaddingStyle,
  resolveScrollBottomPadding,
  resolveShowFeedEndAnchor,
  shouldMtAutoPinPuzzleCheckingRow,
  shouldPinLessonFeedTailNearComposer,
  shouldSkipRevealEndOverflowScroll,
  simulateScrollTopAfterIntoViewEnd,
  simulateScrollTopAfterScrollToMax,
  simulateScrollTopAfterTailIfNeeded,
  stepFollowTailScrollTop,
} from '@/lib/lessonFeedScroll'

const ROOT_PX = 16
const CLIENT_HEIGHT_PX = 400
const SHORT_CONTENT_PX = 100
const LONG_CONTENT_PX = 2200
const SYMMETRIC_PADDING_PX = resolveLessonScrollContainerPaddingPx(ROOT_PX)

describe('resolveDialogFeedScrollPadding', () => {
  it('использует --chat-composer-stack-height с fallback rem', () => {
    expect(resolveDialogFeedScrollPadding()).toBe(
      `calc(0.625rem + var(--chat-composer-stack-height, ${CHAT_INPUT_HEIGHT_REM}rem) + ${LESSON_INPUT_GAP_PX}px)`
    )
  })

  it('resolveDialogFeedScrollPaddingStyle задаёт padding и scrollPadding', () => {
    const style = resolveDialogFeedScrollPaddingStyle()
    expect(style.paddingBottom).toBe(style.scrollPaddingBottom)
    expect(style.paddingBottom).toContain('--chat-composer-stack-height')
  })
})

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

  it('puzzle checking keeps pin for stable «Engvo проверяет…» offset', () => {
    expect(
      resolveRelaxFeedTailPin({
        status: 'checking',
        showAdvancingStatusLine: false,
        isAdvancingToNextStep: false,
        isAdvancingToNextVariant: false,
        isSentencePuzzle: true,
      })
    ).toBe(false)
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

describe('resolvePuzzleFeedMessagesStackClass', () => {
  it('short puzzle feed pins whole stack with justify-end', () => {
    expect(
      resolvePuzzleFeedMessagesStackClass({
        pinFeedTailNearComposer: true,
        isFeedOverflowing: false,
      })
    ).toBe('flex min-h-full flex-col justify-end')
  })

  it('overflowing puzzle feed drops justify-end', () => {
    expect(
      resolvePuzzleFeedMessagesStackClass({
        pinFeedTailNearComposer: true,
        isFeedOverflowing: true,
      })
    ).toBe('flex min-h-full flex-col')
  })

  it('returns undefined when pin is off', () => {
    expect(
      resolvePuzzleFeedMessagesStackClass({
        pinFeedTailNearComposer: false,
        isFeedOverflowing: true,
      })
    ).toBeUndefined()
  })
})

describe('shouldMtAutoPinPuzzleCheckingRow', () => {
  it('pins checking row on overflowing puzzle retry', () => {
    expect(
      shouldMtAutoPinPuzzleCheckingRow({
        isSentencePuzzle: true,
        status: 'checking',
        isFeedOverflowing: true,
        isCheckingMessage: true,
        isLastInFeed: true,
      })
    ).toBe(true)
  })

  it('does not pin on first short attempt', () => {
    expect(
      shouldMtAutoPinPuzzleCheckingRow({
        isSentencePuzzle: true,
        status: 'checking',
        isFeedOverflowing: false,
        isCheckingMessage: true,
        isLastInFeed: true,
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

  it('checking unpins tail on non-puzzle steps', () => {
    expect(
      shouldPinLessonFeedTailNearComposer({
        useFeedScrollToMax: true,
        relaxFeedTailPin: true,
      })
    ).toBe(false)
  })

  it('puzzle checking keeps tail pinned near composer', () => {
    expect(
      shouldPinLessonFeedTailNearComposer({
        useFeedScrollToMax: true,
        relaxFeedTailPin: false,
      })
    ).toBe(true)
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

  it('puzzle checking with relaxed pin uses tail if needed', () => {
    expect(
      resolveLessonFeedScrollMode({ useFeedScrollToMax: true, relaxFeedTailPin: true })
    ).toBe('tail_if_needed')
  })

  it('puzzle checking keeps scroll_to_max when pin is held', () => {
    expect(
      resolveLessonFeedScrollMode({ useFeedScrollToMax: true, relaxFeedTailPin: false })
    ).toBe('scroll_to_max')
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

describe('isLessonFeedScrolledToTail', () => {
  it('у дна ленты — true', () => {
    const container = {
      scrollHeight: 1200,
      clientHeight: 400,
      scrollTop: 800,
    } as HTMLElement
    expect(isLessonFeedScrolledToTail(container, 'tail_if_needed')).toBe(true)
  })

  it('хвост отстаёт — false', () => {
    const container = {
      scrollHeight: 1200,
      clientHeight: 400,
      scrollTop: 700,
    } as HTMLElement
    expect(isLessonFeedScrolledToTail(container, 'tail_if_needed')).toBe(false)
  })

  it('короткая лента на scrollTop 0 — true', () => {
    const container = {
      scrollHeight: 300,
      clientHeight: 400,
      scrollTop: 0,
    } as HTMLElement
    expect(isLessonFeedScrolledToTail(container, 'tail_if_needed')).toBe(true)
    expect(computeMaxScrollTop(container.scrollHeight, container.clientHeight)).toBe(0)
  })
})

describe('lesson feed tail message ids', () => {
  it('распознаёт answer, checking, feedback', () => {
    expect(isLessonFeedAnswerTailMessageId('answer-step-1-try-1')).toBe(true)
    expect(isLessonFeedCheckingTailMessageId('checking-answer-step-1-try-1')).toBe(true)
    expect(isLessonFeedFeedbackTailMessageId('feedback-answer-step-1-try-1-error')).toBe(true)
    expect(isLessonFeedAnswerTailMessageId('feedback-x')).toBe(false)
  })
})

describe('resolvePracticeFeedScrollRequest', () => {
  it('checking / feedback / submitting — smooth как в уроке', () => {
    for (const state of ['submitting', 'checking', 'feedback', 'correction'] as const) {
      expect(
        resolvePracticeFeedScrollRequest({
          prefersReducedMotion: false,
          reason: 'new_message',
          state,
        })
      ).toBe('smooth')
    }
  })

  it('active new_message — smooth без reduced motion', () => {
    expect(
      resolvePracticeFeedScrollRequest({
        prefersReducedMotion: false,
        reason: 'new_message',
        state: 'active',
      })
    ).toBe('smooth')
  })
})

describe('resolveLessonShellScrollBehavior', () => {
  it('first step and reduced motion → auto', () => {
    expect(
      resolveLessonShellScrollBehavior({ prefersReducedMotion: false, isFirstLessonStep: true })
    ).toBe('auto')
    expect(
      resolveLessonShellScrollBehavior({ prefersReducedMotion: true, isFirstLessonStep: false })
    ).toBe('auto')
  })

  it('step 2+ reveal → smooth', () => {
    expect(
      resolveLessonShellScrollBehavior({ prefersReducedMotion: false, isFirstLessonStep: false })
    ).toBe('smooth')
  })
})

describe('shouldSkipRevealEndOverflowScroll', () => {
  it('skips when deferred choice reveal just finished', () => {
    expect(
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal: true,
        shouldRenderChoiceChips: true,
        wasRevealInProgress: true,
        isRevealInProgress: false,
      })
    ).toBe(true)
  })

  it('does not skip while reveal still in progress', () => {
    expect(
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal: true,
        shouldRenderChoiceChips: true,
        wasRevealInProgress: true,
        isRevealInProgress: true,
      })
    ).toBe(false)
  })

  it('does not skip for non-choice steps', () => {
    expect(
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal: true,
        shouldRenderChoiceChips: false,
        wasRevealInProgress: true,
        isRevealInProgress: false,
      })
    ).toBe(false)
  })

  it('does not skip without defer', () => {
    expect(
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal: false,
        shouldRenderChoiceChips: true,
        wasRevealInProgress: true,
        isRevealInProgress: false,
      })
    ).toBe(false)
  })
})

describe('isWithinRevealEndOverflowSettleWindow', () => {
  it('true inside settle window', () => {
    const now = 10_000
    expect(isWithinRevealEndOverflowSettleWindow(now - 100, now)).toBe(true)
    expect(isWithinRevealEndOverflowSettleWindow(now - LESSON_REVEAL_END_OVERFLOW_SETTLE_MS + 1, now)).toBe(
      true
    )
  })

  it('false outside settle window or without timestamp', () => {
    const now = 10_000
    expect(isWithinRevealEndOverflowSettleWindow(now - LESSON_REVEAL_END_OVERFLOW_SETTLE_MS, now)).toBe(
      false
    )
    expect(isWithinRevealEndOverflowSettleWindow(null, now)).toBe(false)
  })
})

describe('follow-tail scroll helpers', () => {
  it('stepFollowTailScrollTop lerps toward target', () => {
    expect(stepFollowTailScrollTop({ currentScrollTop: 0, targetScrollTop: 100 })).toBe(20)
    expect(stepFollowTailScrollTop({ currentScrollTop: 99.5, targetScrollTop: 100 })).toBe(100)
  })

  it('isFollowTailScrollSettled requires stable frames near target', () => {
    expect(
      isFollowTailScrollSettled({
        currentScrollTop: 100,
        targetScrollTop: 100.5,
        stableFrames: 1,
      })
    ).toBe(false)
    expect(
      isFollowTailScrollSettled({
        currentScrollTop: 100,
        targetScrollTop: 100.5,
        stableFrames: 2,
      })
    ).toBe(true)
  })

  it('resolveFollowTailTargetTop returns 0 for short feed in tail mode', () => {
    const container = {
      scrollHeight: 300,
      clientHeight: 400,
    } as HTMLElement
    expect(resolveFollowTailTargetTop(container, 'tail_if_needed')).toBe(0)
  })

  it('resolveFollowTailTargetTop returns maxTop for overflowing feed', () => {
    const container = {
      scrollHeight: 1200,
      clientHeight: 400,
    } as HTMLElement
    expect(resolveFollowTailTargetTop(container, 'tail_if_needed')).toBe(800)
    expect(resolveFollowTailTargetTop(container, 'scroll_to_max')).toBe(800)
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

describe('computeLessonFeedScrollTopForTailMessage (клавиатура)', () => {
  function tailScrollTopModel(input: {
    contentHeightPx: number
    rowTopPx: number
    rowHeightPx: number
    scrollPaddingBottomPx: number
    clientHeightPx: number
    gapPx?: number
  }): number {
    const scrollHeight = input.contentHeightPx + input.scrollPaddingBottomPx
    const maxTop = computeMaxScrollTop(scrollHeight, input.clientHeightPx)
    const targetBottom = input.rowTopPx + input.rowHeightPx
    const minScrollTop = targetBottom - input.clientHeightPx + (input.gapPx ?? LESSON_FEED_KEYBOARD_SCROLL_GAP_PX)
    return Math.min(maxTop, Math.max(0, minScrollTop))
  }

  it('короткая лента: scrollTop остаётся 0', () => {
    const top = tailScrollTopModel({
      contentHeightPx: SHORT_CONTENT_PX,
      rowTopPx: 0,
      rowHeightPx: SHORT_CONTENT_PX,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    expect(top).toBe(0)
  })

  it('длинная лента: tail scroll меньше scrollToMax с раздутым padding', () => {
    const inflatedPaddingPx = remToPx(0.625 + 5.5, ROOT_PX) + LESSON_INPUT_GAP_PX
    const rowHeight = 120
    const scrollToMax = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: inflatedPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const tailTop = tailScrollTopModel({
      contentHeightPx: LONG_CONTENT_PX,
      rowTopPx: LONG_CONTENT_PX - rowHeight,
      rowHeightPx: rowHeight,
      scrollPaddingBottomPx: inflatedPaddingPx,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    expect(tailTop).toBeLessThan(scrollToMax)
    expect(tailTop).toBeGreaterThan(0)
  })

  it('на scrollToMax хвост уже виден — не откатывать scrollTop при фокусе', () => {
    const rowHeight = 120
    const contentHeightPx = LONG_CONTENT_PX
    const scrollToMax = simulateScrollTopAfterScrollToMax({
      contentHeightPx,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const targetBottom = contentHeightPx
    const visibleBottom = scrollToMax + CLIENT_HEIGHT_PX
    expect(targetBottom + LESSON_FEED_KEYBOARD_SCROLL_GAP_PX).toBeLessThanOrEqual(
      visibleBottom + 1
    )
  })

  it('при уменьшении viewport доскролл только вниз', () => {
    const rowHeight = 120
    const rowTopPx = LONG_CONTENT_PX - rowHeight
    const targetBottom = rowTopPx + rowHeight
    const scrollTopAtMax = simulateScrollTopAfterScrollToMax({
      contentHeightPx: LONG_CONTENT_PX,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: CLIENT_HEIGHT_PX,
    })
    const shrunkClientHeight = 220
    const needTop = tailScrollTopModel({
      contentHeightPx: LONG_CONTENT_PX,
      rowTopPx,
      rowHeightPx: rowHeight,
      scrollPaddingBottomPx: SYMMETRIC_PADDING_PX,
      clientHeightPx: shrunkClientHeight,
    })
    expect(needTop).toBeGreaterThan(scrollTopAtMax)
    expect(Math.max(scrollTopAtMax, needTop)).toBe(needTop)
  })
})
