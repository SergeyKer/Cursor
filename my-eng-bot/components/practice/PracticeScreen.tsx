'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import PracticeFinale from '@/components/practice/PracticeFinale'
import { APP_BTN_SECONDARY_LARGE } from '@/lib/homeCtaStyles'
import PracticeInstructionFlowInfoStep from '@/components/practice/PracticeInstructionFlowInfoStep'
import PracticeQuestionRenderer from '@/components/practice/PracticeQuestionRenderer'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import {
  isPracticeAnswerPanelLocked,
  isPracticeChoiceInteractionDisabled,
  isPracticeChoicePanelFrozen,
} from '@/lib/practice/practiceAnswerPanelLock'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { DIALOG_COMPOSER_PADDING_BOTTOM, getChatComposerStackLayout } from '@/lib/chatComposerMetrics'
import { isPracticeChoiceChipsPanel } from '@/lib/practice/practiceComposerLayout'
import { isPracticeCorrectionComposerActive } from '@/lib/practice/practiceCorrectionMode'
import { useDialogFeedKeyboardScroll } from '@/hooks/useDialogFeedKeyboardScroll'
import {
  followLessonFeedTail,
  isLessonFeedScrolledToTail,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolvePracticeFeedScrollRequest,
  resolveScrollBottomPadding,
} from '@/lib/lessonFeedScroll'
import PracticeQuestionBubble from '@/components/practice/PracticeQuestionBubble'
import {
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
  CHAT_FEED_SERVICE_STATUS_ROW_PUZZLE_CHECKING_CLASS,
  ChatBubbleFrame,
  getBubblePosition,
  type BubbleRole,
} from '@/components/chat/ChatBubble'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { usePracticeQuestionReveal } from '@/hooks/usePracticeQuestionReveal'
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

function nextMode(mode: PracticeMode): PracticeMode {
  if (mode === 'reference') return 'challenge'
  if (mode === 'relaxed') return 'balanced'
  if (mode === 'balanced') return 'challenge'
  return 'challenge'
}

/** Анимация входа только при первом появлении id в ленте (без повторов при смене state). */
function usePracticeEnterClass() {
  const enteredIdsRef = useRef<Set<string>>(new Set())
  return useCallback((messageId: string) => {
    if (enteredIdsRef.current.has(messageId)) return ''
    enteredIdsRef.current.add(messageId)
    return 'practice-enter'
  }, [])
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
  const previousScrollSnapshotRef = useRef<{
    messageCount: number
    currentIndex: number
    tailMessageId: string
  } | null>(null)
  const practiceEnterClass = usePracticeEnterClass()
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
      }),
    [session, state, audience, pendingAnswer, resolvedFeedbackType]
  )

  const tailMessageId = messages.at(-1)?.id ?? ''

  const currentLessonMessage = useMemo(
    () => messages.find((message) => message.kind === 'lesson' && !message.isHistorical) ?? null,
    [messages]
  )

  const prefersReducedMotion = usePrefersReducedMotion()
  const revealBubbles = currentLessonMessage?.bubbles ?? []
  const revealSectionCount = revealBubbles.length
  const isBriefingReveal = state === 'briefing'
  const revealKey = isBriefingReveal
    ? `briefing-${session.id}`
    : (session.questions[session.currentIndex]?.id ?? null)
  const revealEnabled =
    Boolean(revealKey) &&
    revealSectionCount > 0 &&
    (isBriefingReveal || (state === 'active' && currentLessonMessage != null))

  const {
    visibleSectionCount,
    typingSectionIndex,
    isRevealInProgress,
    onSectionTypewriterComplete,
  } = usePracticeQuestionReveal({
    sessionId: session.id,
    revealKey,
    enabled: revealEnabled,
    sectionCount: revealSectionCount,
    prefersReducedMotion,
  })

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
    hasCurrentStep: state !== 'briefing' && state !== 'completed',
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
        followLessonFeedTail(scrollContainer, { mode: 'tail_if_needed', behavior: scrollBehavior })
      }, behavior),
    [scheduleScroll]
  )

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (state === 'briefing') {
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' })
      previousScrollSnapshotRef.current = {
        messageCount: messages.length,
        currentIndex: session.currentIndex,
        tailMessageId,
      }
      return
    }

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
    if (isLessonFeedScrolledToTail(scrollContainerRef.current, 'tail_if_needed')) return

    const behavior = resolvePracticeFeedScrollRequest({
      prefersReducedMotion,
      reason: 'reveal',
      state,
    })
    return scheduleScrollPracticeFeedTail(behavior)
  }, [
    visibleSectionCount,
    typingSectionIndex,
    isRevealInProgress,
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    state,
  ])

  useEffect(() => {
    const messagesStack = messagesStackRef.current
    if (!messagesStack || state === 'briefing' || state === 'completed') return
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
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
    prefersReducedMotion,
    scheduleScrollPracticeFeedTail,
    messages.length,
    visibleSectionCount,
    isRevealInProgress,
    session.currentIndex,
  ])

  const showQuestionComposer =
    currentQuestion != null &&
    state !== 'briefing' &&
    state !== 'completed' &&
    state !== 'error'

  const isCorrectionComposerActive = isPracticeCorrectionComposerActive(
    state,
    session.wrongAttemptsOnCurrentQuestion ?? 0
  )

  const isChoiceChipsPanel =
    showQuestionComposer && isPracticeChoiceChipsPanel(currentQuestion, isCorrectionComposerActive)
  const composerStackLayout = getChatComposerStackLayout(isChoiceChipsPanel)
  const composerStackStyle = composerStackLayout.style
    ? { ...composerStackLayout.style, paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }
    : composerStackLayout.style

  useDialogFeedKeyboardScroll(scrollContainerRef, showQuestionComposer)

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
                    const lessonVisibleSectionCount = isCurrentQuestion
                      ? isActiveRevealTarget
                        ? visibleSectionCount
                        : message.bubbles?.length ?? 0
                      : message.bubbles?.length ?? 0
                    const lessonAnimateSections = isCurrentQuestion && isRevealInProgress
                    const lessonTypingSectionIndex =
                      isActiveRevealTarget && isRevealInProgress ? typingSectionIndex : null

                    return (
                      <div key={message.id}>
                        {lessonVisibleSectionCount > 0 ? (
                          <ChatBubbleFrame
                            role="assistant"
                            position={position}
                            className="w-full"
                            rowClassName={rowMargin}
                          >
                            <PracticeQuestionBubble
                              bubbles={message.bubbles ?? []}
                              visibleSectionCount={lessonVisibleSectionCount}
                              typingSectionIndex={lessonTypingSectionIndex}
                              animateSections={isCurrentQuestion ? lessonAnimateSections : false}
                              onSectionTypewriterComplete={
                                isActiveRevealTarget ? onSectionTypewriterComplete : undefined
                              }
                            />
                          </ChatBubbleFrame>
                        ) : null}
                      </div>
                    )
                  }

                  if (message.kind === 'answer') {
                    return (
                      <ChatBubbleFrame
                        key={message.id}
                        role="user"
                        position={position}
                        className={practiceEnterClass(message.id)}
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
                      className={practiceEnterClass(message.id)}
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

            <DialogComposerStack className={composerStackLayout.verticalClass} style={composerStackStyle}>
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
                    {feedback?.message ?? 'Не удалось подготовить следующий шаг. Можно повторить безопасный вариант.'}
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
              ) : state === 'briefing' ? (
                <PracticeInstructionFlowInfoStep
                  session={session}
                  audience={audience}
                  onContinue={onAcknowledgeInstruction}
                />
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
                />
              ) : null}
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
