'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import LessonStepBubble from '@/components/lesson/LessonStepBubble'
import PracticeBriefingScreen from '@/components/practice/PracticeBriefingScreen'
import PracticeFinale from '@/components/practice/PracticeFinale'
import PracticeQuestionRenderer from '@/components/practice/PracticeQuestionRenderer'
import { APP_BTN_SECONDARY_LARGE } from '@/lib/homeCtaStyles'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import {
  isPracticeAnswerPanelLocked,
  isPracticeChoiceInteractionDisabled,
  isPracticeChoicePanelFrozen,
  PRACTICE_ANSWER_REVEAL_MS,
} from '@/lib/practice/practiceAnswerPanelLock'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import {
  CHAT_COMPOSER_STACK_TOP_CLASS,
  DIALOG_COMPOSER_PADDING_BOTTOM,
  getChatComposerStackLayout,
} from '@/lib/chatComposerMetrics'
import { ensurePracticeChoiceOptions } from '@/lib/practice/ensurePracticeChoiceOptions'
import {
  isPracticeChoiceChipsPanel,
  resolvePracticeChoiceComposerLayout,
} from '@/lib/practice/practiceComposerLayout'
import { isPracticeCorrectionComposerActive } from '@/lib/practice/practiceCorrectionMode'
import { useDialogFeedKeyboardScroll } from '@/hooks/useDialogFeedKeyboardScroll'
import { useLessonComposerHeightLock } from '@/hooks/useLessonComposerHeightLock'
import { useLessonSectionReveal } from '@/hooks/useLessonSectionReveal'
import { resolveTaskBubbleIndex } from '@/lib/lessonBubbleLayout'
import {
  estimateLessonChoiceChipsMinHeight,
  measureChoiceChipsLaneWidthPx,
} from '@/lib/lessonComposerLayout'
import {
  isLessonFeedScrolledToTail,
  isPracticeFeedCheckingTailMessageId,
  isWithinRevealEndOverflowSettleWindow,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolveLessonShellScrollBehavior,
  resolvePracticeFeedScrollRequest,
  resolveScrollBottomPadding,
  scrollLessonFeedToModeIfNeeded,
  scrollLessonFeedToModeWithCompleteIfNeeded,
  shouldSkipLessonFeedOverflowFollow,
  shouldSkipRevealEndOverflowScroll,
} from '@/lib/lessonFeedScroll'
import {
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
  CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS,
  ChatBubbleFrame,
  getBubblePosition,
  type BubbleRole,
} from '@/components/chat/ChatBubble'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { PracticeFlowState } from '@/hooks/usePracticeSession'
import TypingText from '@/components/TypingText'
import { ENGVO_SERVICE_TYPEWRITER_CHAR_MS } from '@/lib/practice/practiceRevealTiming'
import type { Audience } from '@/lib/types'
import type { PracticeMode, PracticeQuestion, PracticeSession } from '@/types/practice'

interface PracticeScreenProps {
  session: PracticeSession
  audience?: Audience
  state: PracticeFlowState
  feedback?: { type: 'success' | 'error'; message: string } | null
  pendingAnswer?: string | null
  currentQuestion: PracticeQuestion | null
  canSubmit: boolean
  completionMeta?: {
    tier: 0 | 1 | 2
    globalAmount: number
    ringCount: number
    gemsPending: boolean
    cupClaimed: boolean
  } | null
  onSubmitAnswer: (answer: string) => void
  onRepeat: () => void
  onStartMode: (mode: PracticeMode) => void
  onOpenLesson: () => void
  onBackToPracticeMenu: () => void
  onRetryAfterError?: () => void
  onAcknowledgeInstruction: () => void
  generationBusy?: boolean
}

const statusCardClassByTone: Record<'success' | 'error', string> = {
  success: 'border-green-200/90 bg-green-50/95 text-green-700',
  error: 'border-amber-200/90 bg-amber-50/95 text-amber-800',
}

const LESSON_FEED_ENTER_ANIM_MS = 800

function nextMode(mode: PracticeMode): PracticeMode {
  if (mode === 'reference') return 'challenge'
  if (mode === 'relaxed') return 'balanced'
  if (mode === 'balanced') return 'challenge'
  return 'challenge'
}

function useLessonUserEnterClass() {
  const enteredIdsRef = useRef<Set<string>>(new Set())
  return useCallback((messageId: string) => {
    if (enteredIdsRef.current.has(messageId)) return ''
    enteredIdsRef.current.add(messageId)
    return 'lesson-enter'
  }, [])
}

/** Статус «Верно/Неверно» - как в уроках (`.lesson-feed-status-enter`). */
function useLessonFeedStatusEnterClass(prefersReducedMotion: boolean) {
  const enteredIdsRef = useRef<Set<string>>(new Set())
  return useCallback(
    (messageId: string) => {
      if (prefersReducedMotion) return ''
      if (enteredIdsRef.current.has(messageId)) return ''
      enteredIdsRef.current.add(messageId)
      return 'lesson-feed-status-enter'
    },
    [prefersReducedMotion]
  )
}

export default function PracticeScreen({
  session,
  audience = 'adult',
  state,
  feedback = null,
  pendingAnswer = null,
  currentQuestion,
  canSubmit,
  completionMeta = null,
  onSubmitAnswer,
  onRepeat,
  onStartMode,
  onOpenLesson,
  onBackToPracticeMenu,
  onRetryAfterError,
  onAcknowledgeInstruction,
  generationBusy = false,
}: PracticeScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesStackRef = useRef<HTMLDivElement | null>(null)
  const composerStackRef = useRef<HTMLDivElement | null>(null)
  const previousScrollSnapshotRef = useRef<{
    messageCount: number
    currentIndex: number
    tailMessageId: string
  } | null>(null)
  const previousRevealInProgressRef = useRef(false)
  const revealEndedAtRef = useRef<number | null>(null)
  const awaitingFeedEnterBeforeTextRevealRef = useRef(false)
  const shellScrollCompleteInvokedRef = useRef(false)
  const [lessonFeedEnterClassActive, setLessonFeedEnterClassActive] = useState(false)
  const [composerInnerWidthPx, setComposerInnerWidthPx] = useState<number | undefined>()
  const [showCheckingStatusLine, setShowCheckingStatusLine] = useState(false)

  const lessonUserEnterClass = useLessonUserEnterClass()
  const prefersReducedMotion = usePrefersReducedMotion()
  const lessonFeedStatusEnterClass = useLessonFeedStatusEnterClass(prefersReducedMotion)

  const resolvedFeedbackType = useMemo(() => {
    if (feedback?.type) return feedback.type
    if (state === 'generating_next' || state === 'feedback') {
      const currentQuestionId = session.questions[session.currentIndex]?.id
      const lastAnswer = session.answers
        .filter((answer) => answer.questionId === currentQuestionId)
        .at(-1)
      return lastAnswer?.feedbackTone
    }
    return undefined
  }, [feedback?.type, session, state])

  const messages = useMemo(
    () =>
      buildPracticeFeedMessages({
        session,
        state,
        audience,
        pendingAnswer,
        feedbackType: resolvedFeedbackType,
        showCheckingStatusLine,
      }),
    [session, state, audience, pendingAnswer, resolvedFeedbackType, showCheckingStatusLine]
  )

  const tailMessageId = messages.at(-1)?.id ?? ''

  const currentLessonMessage = useMemo(
    () => messages.find((message) => message.kind === 'lesson' && !message.isHistorical) ?? null,
    [messages]
  )

  const revealBubbles = useMemo(
    () => currentLessonMessage?.bubbles ?? [],
    [currentLessonMessage]
  )
  const revealSectionCount = revealBubbles.length
  const revealKey = session.questions[session.currentIndex]?.id ?? null
  const taskBubbleIndex = useMemo(() => resolveTaskBubbleIndex(revealBubbles), [revealBubbles])
  const revealEnabled =
    state === 'active' && Boolean(currentLessonMessage) && revealSectionCount > 0

  const {
    isShellEnterActive,
    isTextRevealActive,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    isRevealInitializedForKey,
    onShellScrollComplete,
    onTextSectionRevealComplete,
  } = useLessonSectionReveal({
    sessionId: `practice:${session.id}`,
    revealKey,
    enabled: revealEnabled,
    sectionCount: revealSectionCount,
    prefersReducedMotion,
    extraPauseBeforeIndex: taskBubbleIndex >= 0 ? taskBubbleIndex : undefined,
  })

  const invokeShellScrollCompleteOnce = useCallback(() => {
    if (shellScrollCompleteInvokedRef.current) return
    shellScrollCompleteInvokedRef.current = true
    awaitingFeedEnterBeforeTextRevealRef.current = false
    onShellScrollComplete()
  }, [onShellScrollComplete])

  useLayoutEffect(() => {
    if (!isShellEnterActive) {
      setLessonFeedEnterClassActive(false)
      awaitingFeedEnterBeforeTextRevealRef.current = false
      return
    }
    if (prefersReducedMotion) {
      awaitingFeedEnterBeforeTextRevealRef.current = false
      setLessonFeedEnterClassActive(false)
      return
    }
    shellScrollCompleteInvokedRef.current = false
    awaitingFeedEnterBeforeTextRevealRef.current = true
    setLessonFeedEnterClassActive(true)
  }, [isShellEnterActive, prefersReducedMotion, revealKey])

  useEffect(() => {
    if (!lessonFeedEnterClassActive) return
    const fallbackTimer = window.setTimeout(() => {
      if (!awaitingFeedEnterBeforeTextRevealRef.current) return
      setLessonFeedEnterClassActive(false)
      invokeShellScrollCompleteOnce()
    }, LESSON_FEED_ENTER_ANIM_MS + 80)
    return () => window.clearTimeout(fallbackTimer)
  }, [invokeShellScrollCompleteOnce, lessonFeedEnterClassActive, revealKey])

  useEffect(() => {
    if (state !== 'checking') {
      setShowCheckingStatusLine(false)
      return
    }

    const timer = window.setTimeout(() => {
      setShowCheckingStatusLine(true)
    }, PRACTICE_ANSWER_REVEAL_MS)

    return () => window.clearTimeout(timer)
  }, [state, session.currentIndex, currentQuestion?.id])

  const isCorrectionComposerActive = isPracticeCorrectionComposerActive(
    state,
    session.wrongAttemptsOnCurrentQuestion ?? 0
  )

  const showQuestionComposer =
    currentQuestion != null &&
    state !== 'completed' &&
    state !== 'error'

  const isChoiceChipsPanel =
    showQuestionComposer && isPracticeChoiceChipsPanel(currentQuestion, isCorrectionComposerActive)

  const deferChoiceChipsUntilCardReveal =
    isChoiceChipsPanel &&
    state === 'active' &&
    revealSectionCount > 0 &&
    !prefersReducedMotion

  const isChoiceChipsVisible =
    !deferChoiceChipsUntilCardReveal ||
    (isRevealInitializedForKey && !isRevealInProgress)

  const choiceOptions = useMemo(
    () =>
      currentQuestion && isChoiceChipsPanel
        ? ensurePracticeChoiceOptions(currentQuestion.options, currentQuestion.targetAnswer)
        : [],
    [currentQuestion, isChoiceChipsPanel]
  )

  const choiceComposerLayout = isChoiceChipsPanel
    ? resolvePracticeChoiceComposerLayout({
        isChoicePanel: true,
        deferUntilReveal: deferChoiceChipsUntilCardReveal,
        isRevealInProgress,
        isRevealInitializedForKey,
        isChoiceChipsVisible,
        prefersReducedMotion,
      })
    : null

  const choiceComposerMinHeightEstimate =
    isChoiceChipsPanel && choiceComposerLayout?.reserveMinHeight
      ? estimateLessonChoiceChipsMinHeight(choiceOptions.length, choiceOptions, composerInnerWidthPx)
      : undefined

  const composerHeightLockReleased =
    prefersReducedMotion ||
    (choiceComposerLayout ? choiceComposerLayout.lockReleased : !isRevealInProgress)

  const lockedComposerMinHeight = useLessonComposerHeightLock({
    stackRef: composerStackRef,
    transitionKey: currentQuestion?.id ?? null,
    panelKind: 'choice',
    optionCount: choiceOptions.length,
    choiceOptions,
    containerWidthPx: composerInnerWidthPx,
    compact: true,
    enabled: isChoiceChipsPanel,
    lockReleased: composerHeightLockReleased,
  })

  const composerMinHeight =
    lockedComposerMinHeight ??
    (choiceComposerLayout?.reserveMinHeight && !isChoiceChipsVisible
      ? choiceComposerMinHeightEstimate
      : undefined)

  const isAnswerPanelLocked = isPracticeAnswerPanelLocked(
    state,
    resolvedFeedbackType,
    isRevealInProgress
  )
  const isChoicePanelFrozen = isPracticeChoicePanelFrozen(
    state,
    resolvedFeedbackType,
    isRevealInProgress
  )
  const isChoiceInteractionDisabled = isPracticeChoiceInteractionDisabled(
    state,
    resolvedFeedbackType,
    isRevealInProgress
  )

  const scrollBottomPadding = resolveScrollBottomPadding({
    hasCurrentStep: state !== 'completed',
    hasPostLessonOptions: false,
    isSentencePuzzle: false,
    bottomStackHeightPx: 0,
    composerOutsideScroll: true,
  })

  const scheduleScroll = useCallback(
    (scrollFn: (behavior: ScrollBehavior) => void, behavior: ScrollBehavior = 'auto') => {
      let innerRaf = 0
      let extraRaf = 0
      const needsSafariDialogLayoutPass =
        typeof document !== 'undefined' &&
        document.documentElement.hasAttribute('data-ios-safari-dialog')
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => {
          const run = () => scrollFn(behavior)
          if (needsSafariDialogLayoutPass) {
            extraRaf = requestAnimationFrame(run)
          } else {
            run()
          }
        })
      })
      return () => {
        cancelAnimationFrame(outerRaf)
        if (innerRaf) cancelAnimationFrame(innerRaf)
        if (extraRaf) cancelAnimationFrame(extraRaf)
      }
    },
    []
  )

  const scheduleScrollPracticeFeedTail = useCallback(
    (behavior: ScrollBehavior = 'auto') =>
      scheduleScroll((scrollBehavior) => {
        const scrollContainer = scrollContainerRef.current
        if (!scrollContainer) return
        scrollLessonFeedToModeIfNeeded(scrollContainer, 'tail_if_needed', scrollBehavior)
      }, behavior),
    [scheduleScroll]
  )

  useEffect(() => {
    if (!isShellEnterActive) return

    const completeShellScroll = () => {
      if (awaitingFeedEnterBeforeTextRevealRef.current) return
      invokeShellScrollCompleteOnce()
    }

    const behavior = resolveLessonShellScrollBehavior({
      prefersReducedMotion,
      isFirstLessonStep: false,
      deferLayoutSettling: false,
    })

    let cleanupScrollComplete: (() => void) | undefined

    const cleanupSchedule = scheduleScroll((scrollBehavior) => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        completeShellScroll()
        return
      }
      cleanupScrollComplete = scrollLessonFeedToModeWithCompleteIfNeeded(
        scrollContainer,
        'tail_if_needed',
        scrollBehavior,
        completeShellScroll
      )
    }, behavior)

    return () => {
      cleanupSchedule()
      cleanupScrollComplete?.()
    }
  }, [
    isShellEnterActive,
    prefersReducedMotion,
    invokeShellScrollCompleteOnce,
    scheduleScroll,
    revealKey,
  ])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const inSettle =
      (deferChoiceChipsUntilCardReveal &&
        (isRevealInProgress ||
          !isChoiceChipsVisible ||
          isWithinRevealEndOverflowSettleWindow(revealEndedAtRef.current))) ||
      (state === 'checking' && showCheckingStatusLine)
    if (inSettle) {
      root.setAttribute('data-lesson-feed-scroll-settle', '')
    } else {
      root.removeAttribute('data-lesson-feed-scroll-settle')
    }
    return () => {
      root.removeAttribute('data-lesson-feed-scroll-settle')
    }
  }, [deferChoiceChipsUntilCardReveal, isRevealInProgress, isChoiceChipsVisible, state, showCheckingStatusLine])

  useLayoutEffect(() => {
    if (!isChoiceChipsPanel) return
    const el = composerStackRef.current
    if (!el) return

    const measure = () => {
      const width = measureChoiceChipsLaneWidthPx(el)
      if (width != null) {
        setComposerInnerWidthPx((current) => (current === width ? current : width))
      }
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isChoiceChipsPanel, currentQuestion?.id])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const nextSnapshot = {
      messageCount: messages.length,
      currentIndex: session.currentIndex,
      tailMessageId,
    }
    const previousSnapshot = previousScrollSnapshotRef.current

    if (previousSnapshot === null) {
      previousScrollSnapshotRef.current = nextSnapshot
      scheduleScrollPracticeFeedTail(
        resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'initial', state })
      )
      return
    }

    const indexChanged = previousSnapshot.currentIndex !== nextSnapshot.currentIndex
    const messageCountIncreased = nextSnapshot.messageCount > previousSnapshot.messageCount
    const tailChanged = previousSnapshot.tailMessageId !== nextSnapshot.tailMessageId

    if (!indexChanged && !messageCountIncreased && !tailChanged) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    const shellScrollHandlesStepChange =
      indexChanged && !prefersReducedMotion && revealEnabled

    if (shellScrollHandlesStepChange) {
      previousScrollSnapshotRef.current = nextSnapshot
      return
    }

    previousScrollSnapshotRef.current = nextSnapshot

    const scrollBehavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: indexChanged
        ? 'step_change'
        : messageCountIncreased || tailChanged
          ? 'new_message'
          : 'initial',
      state,
    })
    scheduleScrollPracticeFeedTail(scrollBehavior)
  }, [
    messages.length,
    session.currentIndex,
    state,
    tailMessageId,
    prefersReducedMotion,
    revealEnabled,
    scheduleScrollPracticeFeedTail,
  ])

  useEffect(() => {
    if (state !== 'feedback' || !feedback) return
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    return scheduleScrollPracticeFeedTail(
      resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'feedback', state })
    )
  }, [state, feedback, tailMessageId, prefersReducedMotion, scheduleScrollPracticeFeedTail])

  useEffect(() => {
    if (!isRevealInProgress) return
    if (deferChoiceChipsUntilCardReveal) return
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    const behavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: 'reveal',
      state,
    })
    return scheduleScrollPracticeFeedTail(behavior)
  }, [
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    deferChoiceChipsUntilCardReveal,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    state,
  ])

  useEffect(() => {
    const wasRevealInProgress = previousRevealInProgressRef.current
    previousRevealInProgressRef.current = isRevealInProgress

    if (!wasRevealInProgress || isRevealInProgress) return

    if (
      shouldSkipRevealEndOverflowScroll({
        deferChoiceChipsUntilCardReveal,
        shouldRenderChoiceChips: isChoiceChipsPanel,
        wasRevealInProgress,
        isRevealInProgress,
      })
    ) {
      revealEndedAtRef.current = Date.now()
      return
    }

    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    return scheduleScrollPracticeFeedTail(
      resolvePracticeFeedScrollRequest({ prefersReducedMotion, reason: 'overflow_follow', state })
    )
  }, [
    isRevealInProgress,
    deferChoiceChipsUntilCardReveal,
    isChoiceChipsPanel,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    state,
  ])

  useEffect(() => {
    const messagesStack = messagesStackRef.current
    if (!messagesStack || state === 'completed') return
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      if (isShellEnterActive) return
      if (state === 'checking' || isPracticeFeedCheckingTailMessageId(tailMessageId)) return
      const skipOverflowFollow = shouldSkipLessonFeedOverflowFollow({
        isRevealInProgress,
        deferChoiceChipsUntilCardReveal,
        isChoiceChipsVisible,
        revealEndedAtMs: revealEndedAtRef.current,
      })
      if (skipOverflowFollow) return

      scheduleScrollPracticeFeedTail(
        resolvePracticeFeedScrollRequest({
          prefersReducedMotion,
          reason: 'overflow_follow',
          state,
        })
      )
    })
    observer.observe(messagesStack)
    return () => observer.disconnect()
  }, [
    state,
    tailMessageId,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    messages.length,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    isShellEnterActive,
    deferChoiceChipsUntilCardReveal,
    isChoiceChipsVisible,
    session.currentIndex,
  ])

  const composerStackLayout = getChatComposerStackLayout(isChoiceChipsPanel)
  const composerStackStyle = {
    ...(composerStackLayout.style
      ? { ...composerStackLayout.style, paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }
      : composerStackLayout.style),
    ...(composerMinHeight != null ? { minHeight: composerMinHeight } : {}),
  }

  useDialogFeedKeyboardScroll(scrollContainerRef, showQuestionComposer)

  if (state === 'briefing') {
    return (
      <PracticeBriefingScreen
        session={session}
        audience={audience}
        onContinue={onAcknowledgeInstruction}
      />
    )
  }

  return (
    <div className="dialog-flex-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
      <div className="chat-shell-x flex min-h-0 flex-1 flex-col py-2 sm:py-3">
        <div className="mx-auto flex min-h-0 flex-1 w-full max-w-[29rem] flex-col">
          <div
            className="glass-surface flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-[1.15rem] border border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)]"
            style={{ boxShadow: 'var(--chat-shell-shadow)' }}
          >
            <DialogGlassScrollHost>
              <div
                ref={scrollContainerRef}
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3`}
                style={
                  scrollBottomPadding
                    ? {
                        paddingBottom: scrollBottomPadding,
                        scrollPaddingBottom: scrollBottomPadding,
                      }
                    : undefined
                }
              >
                <div ref={messagesStackRef}>
                  {messages.map((message, index) => {
                    const previousRole = messages[index - 1]?.role as BubbleRole | undefined
                    const nextRole = messages[index + 1]?.role as BubbleRole | undefined
                    const position = getBubblePosition(previousRole, message.role, nextRole)
                    const isBubbleEnd = position === 'solo' || position === 'last'
                    const rowMargin = isBubbleEnd ? 'mb-2.5' : 'mb-0.5'

                    if (message.kind === 'lesson') {
                      const isCurrentQuestion = !message.isHistorical
                      const isActiveRevealTarget =
                        isCurrentQuestion && message.id === currentLessonMessage?.id

                      const hideLessonBubbleUntilRevealReady =
                        isCurrentQuestion &&
                        isActiveRevealTarget &&
                        revealEnabled &&
                        !isRevealInitializedForKey

                      const lessonShellEnterActive =
                        isCurrentQuestion &&
                        isActiveRevealTarget &&
                        (isShellEnterActive || hideLessonBubbleUntilRevealReady)

                      const lessonFeedEnterActive =
                        isCurrentQuestion &&
                        isActiveRevealTarget &&
                        !prefersReducedMotion &&
                        lessonFeedEnterClassActive

                      const currentLessonTextRevealedThroughIndex =
                        !isCurrentQuestion || !isActiveRevealTarget
                          ? (message.bubbles?.length ?? 0) - 1
                          : revealEnabled
                            ? !isRevealInitializedForKey
                              ? -1
                              : isRevealInProgress || isShellEnterActive
                                ? textRevealedThroughIndex
                                : (message.bubbles?.length ?? 0) - 1
                            : (message.bubbles?.length ?? 0) - 1

                      if (hideLessonBubbleUntilRevealReady && !lessonFeedEnterActive) {
                        return null
                      }

                      return (
                        <ChatBubbleFrame
                          key={message.id}
                          role="assistant"
                          position={position}
                          className={`w-full${lessonFeedEnterActive ? ' lesson-feed-enter' : ''}`}
                          rowClassName={rowMargin}
                          onAnimationEnd={
                            lessonFeedEnterActive
                              ? (event) => {
                                  if (event.animationName !== 'lessonFeedSlideIn') return
                                  setLessonFeedEnterClassActive(false)
                                  invokeShellScrollCompleteOnce()
                                }
                              : undefined
                          }
                        >
                          <LessonStepBubble
                            key={
                              isCurrentQuestion && currentQuestion
                                ? `practice-soft-${currentQuestion.id}`
                                : message.id
                            }
                            bubbles={message.bubbles ?? []}
                            shellEnterActive={
                              isCurrentQuestion && isActiveRevealTarget ? lessonShellEnterActive : false
                            }
                            animateSections={
                              isCurrentQuestion &&
                              isActiveRevealTarget &&
                              isTextRevealActive
                            }
                            textRevealedThroughIndex={currentLessonTextRevealedThroughIndex}
                            textAnimatingIndex={
                              isCurrentQuestion && isActiveRevealTarget && isTextRevealActive
                                ? textAnimatingIndex
                                : null
                            }
                            onTextSectionRevealComplete={
                              isCurrentQuestion && isActiveRevealTarget
                                ? onTextSectionRevealComplete
                                : undefined
                            }
                          />
                        </ChatBubbleFrame>
                      )
                    }

                    if (message.kind === 'answer') {
                      return (
                        <ChatBubbleFrame
                          key={message.id}
                          role="user"
                          position={position}
                          className={lessonUserEnterClass(message.id)}
                          rowClassName={rowMargin}
                        >
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] font-normal">
                            {message.text}
                          </p>
                        </ChatBubbleFrame>
                      )
                    }

                    if (message.tone === 'service') {
                      const serviceRowClass = message.id.startsWith('practice-checking-')
                        ? CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS
                        : CHAT_FEED_SERVICE_STATUS_ROW_CLASS
                      return (
                        <div key={message.id} dir="ltr" className={serviceRowClass}>
                          <TypingText
                            key={message.id}
                            text={message.text ?? ''}
                            mode="char"
                            speed={ENGVO_SERVICE_TYPEWRITER_CHAR_MS}
                            startDelayMs={0}
                            fadeWhileTyping={false}
                            singleLine
                            className="w-fit text-[14px] italic typing-indicator-text-shimmer"
                          />
                        </div>
                      )
                    }

                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="assistant"
                        position={position}
                        className={lessonFeedStatusEnterClass(message.id)}
                        rowClassName={rowMargin}
                      >
                        <section
                          className={`chat-section-surface glass-surface rounded-xl border ${
                            !message.text ? 'px-3 py-2' : 'px-2.5 py-1.5'
                          } ${statusCardClassByTone[message.tone ?? 'success']}`}
                        >
                          {!message.text ? (
                            <p className="whitespace-pre-line break-words text-[15px] leading-[1.45]">
                              {message.text}
                            </p>
                          ) : (
                            <FeedbackStatusText text={message.text} />
                          )}
                        </section>
                      </ChatBubbleFrame>
                    )
                  })}
                </div>
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              ref={composerStackRef}
              className={`${CHAT_COMPOSER_STACK_TOP_CLASS} ${composerStackLayout.verticalClass}`}
              style={composerStackStyle}
              contentMaxWidthClass={isChoiceChipsPanel ? undefined : 'max-w-[22rem]'}
            >
              {state === 'completed' ? (
                <PracticeFinale
                  session={session}
                  tier={completionMeta?.tier}
                  globalAmount={completionMeta?.globalAmount}
                  ringCount={completionMeta?.ringCount}
                  gemsPending={completionMeta?.gemsPending}
                  cupClaimed={completionMeta?.cupClaimed}
                  onRepeat={onRepeat}
                  onChallenge={() => onStartMode(nextMode(session.mode))}
                  onOpenLesson={onOpenLesson}
                  onBackToPracticeMenu={onBackToPracticeMenu}
                  busy={generationBusy}
                />
              ) : state === 'error' ? (
                <div className="space-y-2">
                  <p className="px-1 text-center text-[13px] leading-snug text-amber-800">
                    {feedback?.message ??
                      'Не удалось подготовить следующий шаг. Можно повторить безопасный вариант.'}
                  </p>
                  <button
                    type="button"
                    onClick={onRetryAfterError ?? onRepeat}
                    disabled={generationBusy}
                    className={APP_BTN_SECONDARY_LARGE}
                  >
                    {generationBusy ? 'Генерируем...' : 'Повторить безопасный вариант'}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToPracticeMenu}
                    className="w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-[var(--text-muted)]"
                  >
                    В меню практики
                  </button>
                </div>
              ) : showQuestionComposer ? (
                <PracticeQuestionRenderer
                  key={currentQuestion.id}
                  question={currentQuestion}
                  disabled={!canSubmit || isChoiceInteractionDisabled}
                  choicePanelFrozen={isChoicePanelFrozen}
                  answerPanelLocked={isAnswerPanelLocked}
                  correctionMode={isCorrectionComposerActive}
                  wrongAttemptsOnCurrentQuestion={session.wrongAttemptsOnCurrentQuestion ?? 0}
                  audience={audience}
                  onSubmit={onSubmitAnswer}
                  suppressChoiceChipEnterAnimation={!isChoiceChipsVisible}
                  choiceChipsVisible={isChoiceChipsVisible}
                />
              ) : null}
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
