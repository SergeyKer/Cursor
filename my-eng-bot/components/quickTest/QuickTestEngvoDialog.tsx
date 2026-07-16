'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import TypingText from '@/components/TypingText'
import {
  CHAT_FEED_SERVICE_STATUS_ROW_CLASS,
  ChatBubbleFrame,
  getBubblePosition,
} from '@/components/chat/ChatBubble'
import EngvoFeedServiceTypingText from '@/components/engvo/EngvoFeedServiceTypingText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useLessonFeedTailEnter } from '@/hooks/useLessonFeedTailEnter'
import { getChatComposerStackLayout } from '@/lib/chatComposerMetrics'
import { estimateLessonComposerMinHeight, measureChoiceChipsLaneWidthPx } from '@/lib/lessonComposerLayout'
import {
  isLessonFeedOverflowing,
  LESSON_SCROLL_VIEWPORT_CLASS,
  resolveLessonScrollBehavior,
  scheduleScrollAfterLayout,
  scrollLessonFeedTailMessageIntoView,
  scrollLessonFeedToMax,
} from '@/lib/lessonFeedScroll'
import { ENGVO_PREPARING_TASK_MESSAGE, ENGVO_TYPING_MESSAGE } from '@/lib/engvoPersonaCopy'
import { ENGVO_SERVICE_TYPEWRITER_CHAR_MS } from '@/lib/practice/practiceRevealTiming'
import { PRACTICE_ANSWER_REVEAL_MS, PRACTICE_CHECKING_MS } from '@/lib/practice/practiceAnswerPanelLock'
import {
  getPopularTopicsForLevel,
  getQuickTestBankBySlug,
  isLevelFrozen,
  resolveRecommendedTopicSlug,
} from '@/lib/quickTest/catalog'
import { getCompletedVariantIds, selectVariantId } from '@/lib/quickTest/selectVariant'
import { readProgress } from '@/lib/quickTest/storage'
import type { QuickTestLevelId } from '@/lib/quickTest/types'
import { QUICK_TEST_COPY, buildQuickTestLobbyMessages } from '@/lib/uiCopy/quickTest'
import { trackQuickTest } from '@/lib/quickTest/analytics'
import { resolveQuickTestFooter } from '@/lib/quickTest/quickTestFooter'
import type { QuickTestFooterView } from '@/lib/quickTest/quickTestFooter'
import type { Bubble } from '@/types/lesson'

const LEVELS: QuickTestLevelId[] = ['A1', 'A2', 'B1', 'B2']

const lobbyAssistantBubbleClass = 'w-full !max-w-full'
const lobbyAssistantRowClass = 'mb-2.5 w-full'

/** Inner section как neutral SectionCard в «Общении». */
const lobbyCommunicationSectionClass =
  'chat-section-surface glass-surface block min-w-0 w-full max-w-full self-stretch overflow-hidden rounded-xl border border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)]'

const lobbyBlockBodyClass =
  'whitespace-pre-line break-words text-[15px] leading-[1.45] text-[var(--text)]'

type LobbyPhase = 'levels' | 'topics'

type FeedMessage =
  | { id: string; role: 'assistant'; text: string; enter?: boolean }
  | { id: string; role: 'user'; text: string }

type QuickTestEngvoDialogProps = {
  onFooterChange?: (footer: QuickTestFooterView) => void
  onDebugSlugChange?: (slug: string | null) => void
}

export function QuickTestEngvoDialog({ onFooterChange, onDebugSlugChange }: QuickTestEngvoDialogProps) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const composerStackRef = useRef<HTMLDivElement>(null)
  const introStackRef = useRef<HTMLDivElement>(null)
  const introAdvanceSessionRef = useRef(0)

  const lobbyBubbles = useMemo<Bubble[]>(
    () => buildQuickTestLobbyMessages().map((text) => ({ type: 'info', content: text })),
    []
  )
  const lobbySectionCount = lobbyBubbles.length

  const [feed, setFeed] = useState<FeedMessage[]>([])
  const [revealedBlockCount, setRevealedBlockCount] = useState(1)
  const [typingBlockIndex, setTypingBlockIndex] = useState<number | null>(0)
  const [introGhostBlockIndex, setIntroGhostBlockIndex] = useState<number | null>(null)
  const [introReady, setIntroReady] = useState(false)
  const [phase, setPhase] = useState<LobbyPhase>('levels')
  const [level, setLevel] = useState<QuickTestLevelId | null>(null)
  const [composerInnerWidthPx, setComposerInnerWidthPx] = useState<number | undefined>()
  const [topicTransitionPending, setTopicTransitionPending] = useState(false)
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null)
  const topicNavigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topicTransitionPendingRef = useRef(false)

  const levelLabels = useMemo(() => LEVELS.map((id) => QUICK_TEST_COPY.levelLabels[id]), [])
  const topics = level ? getPopularTopicsForLevel(level) : []
  const topicLabels = useMemo(() => topics.map((t) => t.title), [topics])
  const composerStackLayout = useMemo(() => getChatComposerStackLayout(true), [])

  const feedMessageIds = useMemo(() => feed.map((message) => message.id), [feed])
  const feedTailEnter = useLessonFeedTailEnter({
    scrollContainerRef,
    messageIds: feedMessageIds,
    prefersReducedMotion,
    enabled: introReady,
  })

  const lobbyComposerLockRef = useRef(0)
  const [stableLobbyComposerMinHeight, setStableLobbyComposerMinHeight] = useState<number | undefined>(
    undefined
  )

  const pinLobbyFeedTail = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const behavior = resolveLessonScrollBehavior({
      prefersReducedMotion,
      reason: 'new_message',
    })

    const serviceRow = container.querySelector<HTMLElement>('[data-feed-service-status]')
    if (serviceRow) {
      scrollLessonFeedToMax(container, behavior)
      return
    }

    scrollLessonFeedTailMessageIntoView(container, behavior)
    if (isLessonFeedOverflowing(container)) {
      scrollLessonFeedToMax(container, behavior)
    }
  }, [prefersReducedMotion])

  const handleFeedAssistantAnimationEnd = useCallback(
    (messageId: string, event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== 'lessonSlideIn') return
      feedTailEnter.markEnterFinished(messageId)
      if (topicTransitionPendingRef.current) return
      scheduleScrollAfterLayout(pinLobbyFeedTail)
    },
    [feedTailEnter, pinLobbyFeedTail]
  )

  const handleFeedUserAnimationEnd = useCallback(
    (messageId: string, event: AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== 'lessonSlideIn') return
      feedTailEnter.markEnterFinished(messageId)
      if (topicTransitionPendingRef.current) return
      scheduleScrollAfterLayout(pinLobbyFeedTail)
    },
    [feedTailEnter, pinLobbyFeedTail]
  )

  useLayoutEffect(() => {
    if (!introReady) return
    return scheduleScrollAfterLayout(pinLobbyFeedTail)
  }, [feed.length, introReady, pinLobbyFeedTail, topicTransitionPending])

  useEffect(() => {
    onFooterChange?.(
      resolveQuickTestFooter({ phase: phase === 'levels' ? 'lobby-levels' : 'lobby-topics' })
    )
  }, [phase, onFooterChange])

  useEffect(() => {
    if (!onDebugSlugChange) return
    if (selectedTopicSlug) {
      onDebugSlugChange(selectedTopicSlug)
      return
    }
    if (phase === 'topics' && level) {
      onDebugSlugChange(getPopularTopicsForLevel(level)[0]?.slug ?? null)
      return
    }
    onDebugSlugChange(resolveRecommendedTopicSlug())
  }, [level, onDebugSlugChange, phase, selectedTopicSlug])

  useEffect(() => {
    if (!prefersReducedMotion) return
    introAdvanceSessionRef.current += 1
    setRevealedBlockCount(lobbySectionCount)
    setTypingBlockIndex(null)
    setIntroGhostBlockIndex(null)
    setIntroReady(true)
  }, [lobbySectionCount, prefersReducedMotion])

  const onIntroBlockTypeComplete = useCallback(
    (completedIndex: number) => {
      if (prefersReducedMotion) return

      const session = introAdvanceSessionRef.current + 1
      introAdvanceSessionRef.current = session

      const run = async () => {
        if (completedIndex >= lobbySectionCount - 1) {
          if (session !== introAdvanceSessionRef.current) return
          setTypingBlockIndex(null)
          setIntroReady(true)
          return
        }

        setTypingBlockIndex(null)
        const nextBlockIndex = completedIndex + 1
        setRevealedBlockCount(nextBlockIndex + 1)
        setIntroGhostBlockIndex(nextBlockIndex)
        await new Promise((r) => setTimeout(r, PRACTICE_CHECKING_MS))
        if (session !== introAdvanceSessionRef.current) return

        setIntroGhostBlockIndex(null)
        setTypingBlockIndex(nextBlockIndex)
      }

      void run()
    },
    [lobbySectionCount, prefersReducedMotion]
  )

  const startTopic = useCallback(
    (slug: string) => {
      const bank = getQuickTestBankBySlug(slug)
      if (!bank) return
      const completed = getCompletedVariantIds(readProgress(), bank.lessonId)
      const nextVariantId = selectVariantId({
        slug,
        completedVariantIds: completed,
        forceDefault: false,
      })
      trackQuickTest('page_view', {
        entrySource: 'test_lobby',
        slug,
        lessonId: bank.lessonId,
        variantId: nextVariantId,
      })
      router.push(`/test/${slug}?variant=${encodeURIComponent(nextVariantId)}`)
    },
    [router]
  )

  useEffect(() => {
    return () => {
      if (topicNavigateTimerRef.current) {
        clearTimeout(topicNavigateTimerRef.current)
      }
    }
  }, [])

  const scheduleTopicStart = useCallback(
    (slug: string, userLabel?: string) => {
      if (topicTransitionPendingRef.current) return
      topicTransitionPendingRef.current = true
      setSelectedTopicSlug(slug)

      if (userLabel) {
        setFeed((prev) => [
          ...prev,
          { id: `lobby-user-topic-${slug}`, role: 'user', text: userLabel },
        ])
      }

      setTopicTransitionPending(true)

      const delay = prefersReducedMotion ? PRACTICE_ANSWER_REVEAL_MS : PRACTICE_CHECKING_MS
      topicNavigateTimerRef.current = setTimeout(() => {
        topicNavigateTimerRef.current = null
        startTopic(slug)
      }, delay)
    },
    [prefersReducedMotion, startTopic]
  )

  const onLevelChoice = useCallback(
    (text: string) => {
      const id = LEVELS.find((levelId) => QUICK_TEST_COPY.levelLabels[levelId] === text)
      if (!id) return
      if (isLevelFrozen(id)) {
        setFeed((prev) => [
          ...prev,
          { id: `lobby-frozen-${Date.now()}`, role: 'assistant', text: QUICK_TEST_COPY.frozenLevelBubble, enter: true },
        ])
        onFooterChange?.(resolveQuickTestFooter({ phase: 'lobby-levels', frozenHint: true }))
        return
      }
      setFeed((prev) => [
        ...prev,
        { id: `lobby-user-level-${id}`, role: 'user', text },
        { id: 'lobby-pick-topic', role: 'assistant', text: QUICK_TEST_COPY.pickTopicBubble, enter: true },
      ])
      setLevel(id)
      setPhase('topics')
    },
    [onFooterChange]
  )

  const onTopicChoice = useCallback(
    (text: string) => {
      if (topicTransitionPending) return
      const topic = topics.find((t) => t.title === text)
      if (!topic) return
      scheduleTopicStart(topic.slug, text)
    },
    [scheduleTopicStart, topicTransitionPending, topics]
  )

  const onDontKnow = useCallback(() => {
    if (topicTransitionPending) return
    const slug = resolveRecommendedTopicSlug()
    if (!slug) return
    scheduleTopicStart(slug, QUICK_TEST_COPY.dontKnowChip)
  }, [scheduleTopicStart, topicTransitionPending])

  const chipsVisible = introReady
  const chipsLocked = topicTransitionPending
  const choiceOptions =
    phase === 'levels'
      ? [...levelLabels, QUICK_TEST_COPY.dontKnowChip]
      : topicLabels

  useLayoutEffect(() => {
    if (!introReady) return
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
  }, [choiceOptions, introReady, phase])

  const levelsChoiceOptions = useMemo(
    () => [...levelLabels, QUICK_TEST_COPY.dontKnowChip],
    [levelLabels]
  )

  const lobbyComposerMinHeight = useMemo(() => {
    const levelsHeight = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: levelsChoiceOptions,
      containerWidthPx: composerInnerWidthPx,
      compact: true,
    })

    let topicsHeight = 0
    for (const levelId of LEVELS) {
      const labels = getPopularTopicsForLevel(levelId).map((topic) => topic.title)
      if (labels.length === 0) continue
      topicsHeight = Math.max(
        topicsHeight,
        estimateLessonComposerMinHeight({
          panelKind: 'choice',
          choiceOptions: labels,
          containerWidthPx: composerInnerWidthPx,
          compact: true,
        })
      )
    }

    return Math.max(levelsHeight, topicsHeight)
  }, [composerInnerWidthPx, levelsChoiceOptions])

  /** Fallback-width estimate: never shrink below first layout (prevents backdrop jump). */
  const lobbyComposerMinHeightFloor = useMemo(() => {
    const levelsHeight = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: levelsChoiceOptions,
      compact: true,
    })

    let topicsHeight = 0
    for (const levelId of LEVELS) {
      const labels = getPopularTopicsForLevel(levelId).map((topic) => topic.title)
      if (labels.length === 0) continue
      topicsHeight = Math.max(
        topicsHeight,
        estimateLessonComposerMinHeight({
          panelKind: 'choice',
          choiceOptions: labels,
          compact: true,
        })
      )
    }

    return Math.max(levelsHeight, topicsHeight)
  }, [levelsChoiceOptions])

  useLayoutEffect(() => {
    if (!introReady) return
    const stack = composerStackRef.current
    const measured = stack ? Math.round(stack.getBoundingClientRect().height) : 0
    const nextLock = Math.max(
      lobbyComposerLockRef.current,
      lobbyComposerMinHeightFloor,
      lobbyComposerMinHeight,
      measured
    )
    if (nextLock > lobbyComposerLockRef.current) {
      lobbyComposerLockRef.current = nextLock
      setStableLobbyComposerMinHeight(nextLock)
    }
  }, [
    introReady,
    lobbyComposerMinHeight,
    lobbyComposerMinHeightFloor,
    phase,
    feed.length,
  ])

  const appliedLobbyComposerMinHeight = Math.max(
    stableLobbyComposerMinHeight ?? 0,
    lobbyComposerMinHeightFloor,
    lobbyComposerMinHeight
  )

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
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper p-2.5 sm:p-3`}
              >
                {lobbySectionCount > 0 ? (
                  <ChatBubbleFrame
                    role="assistant"
                    position="solo"
                    className={lobbyAssistantBubbleClass}
                    rowClassName={lobbyAssistantRowClass}
                  >
                    <div ref={introStackRef} className="flex w-full min-w-0 flex-col space-y-1.5">
                      {lobbyBubbles.slice(0, revealedBlockCount).map((bubble, blockIndex) => {
                        const text = bubble.content
                        const isTyping = !prefersReducedMotion && typingBlockIndex === blockIndex
                        const isGhostSlot =
                          !prefersReducedMotion && introGhostBlockIndex === blockIndex

                        const isCompactGhost =
                          isGhostSlot && blockIndex > 0

                        return (
                          <section
                            key={`lobby-block-${blockIndex}`}
                            className={lobbyCommunicationSectionClass}
                          >
                            {isCompactGhost ? (
                              <div className="px-3 py-2.5" role="status" aria-live="polite">
                                <EngvoFeedServiceTypingText text={ENGVO_TYPING_MESSAGE} />
                              </div>
                            ) : (
                              <div className="relative w-full px-3 py-2.5">
                                <div
                                  className={`invisible block w-full ${lobbyBlockBodyClass}`}
                                  aria-hidden="true"
                                >
                                  {text}
                                </div>
                                <div className="absolute inset-0 px-3 py-2.5">
                                  {isTyping ? (
                                    <TypingText
                                      text={text}
                                      mode="char"
                                      speed={ENGVO_SERVICE_TYPEWRITER_CHAR_MS}
                                      fadeWhileTyping={false}
                                      variant="chat"
                                      startDelayMs={0}
                                      onComplete={() => onIntroBlockTypeComplete(blockIndex)}
                                    />
                                  ) : (
                                    <span className={lobbyBlockBodyClass}>{text}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </section>
                        )
                      })}
                    </div>
                  </ChatBubbleFrame>
                ) : null}

                {feed.map((message, index) => {
                  if (!feedTailEnter.isMessageVisible(message.id)) return null

                  const previousRole =
                    index === 0 ? ('assistant' as const) : feed[index - 1]?.role
                  const nextRole = feed[index + 1]?.role
                  const position = getBubblePosition(previousRole, message.role, nextRole)

                  return (
                    <ChatBubbleFrame
                      key={message.id}
                      role={message.role}
                      position={position}
                      className={
                        message.role === 'assistant'
                          ? feedTailEnter.getAssistantEnterClass(
                              message.id,
                              message.enter
                            )
                          : feedTailEnter.getUserEnterClass(message.id)
                      }
                      rowClassName="mb-2.5"
                      onAnimationEnd={
                        message.role === 'assistant'
                          ? (event) => handleFeedAssistantAnimationEnd(message.id, event)
                          : (event) => handleFeedUserAnimationEnd(message.id, event)
                      }
                    >
                      {message.role === 'assistant' ? (
                        <section className={lobbyCommunicationSectionClass}>
                          <div className="px-3 py-2">
                            <p className={lobbyBlockBodyClass}>{message.text}</p>
                          </div>
                        </section>
                      ) : (
                        <p className="text-[15px] leading-relaxed">{message.text}</p>
                      )}
                    </ChatBubbleFrame>
                  )
                })}
                {topicTransitionPending ? (
                  <div
                    dir="ltr"
                    className={CHAT_FEED_SERVICE_STATUS_ROW_CLASS}
                    data-feed-service-status=""
                    role="status"
                    aria-live="polite"
                  >
                    <EngvoFeedServiceTypingText
                      text={ENGVO_PREPARING_TASK_MESSAGE}
                      instant={prefersReducedMotion}
                    />
                  </div>
                ) : null}
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              ref={composerStackRef}
              className={composerStackLayout.verticalClass}
              style={{
                ...(composerStackLayout.style ?? {}),
                ...(appliedLobbyComposerMinHeight != null
                  ? { minHeight: appliedLobbyComposerMinHeight }
                  : {}),
              }}
            >
              <div
                className={`w-full ${chipsVisible ? '' : 'invisible'}`}
                aria-hidden={!chipsVisible}
                style={{ pointerEvents: chipsVisible && !chipsLocked ? 'auto' : 'none' }}
              >
                <LessonChoiceChips
                  key={`lobby-${phase}`}
                  resetKey={`lobby-${phase}`}
                  choices={choiceOptions}
                  disabled={chipsLocked}
                  frozen={chipsLocked}
                  suppressEnterAnimation={!introReady || prefersReducedMotion}
                  onChoose={(text) => {
                    if (topicTransitionPending) return
                    if (phase === 'levels') {
                      if (text === QUICK_TEST_COPY.dontKnowChip) onDontKnow()
                      else onLevelChoice(text)
                      return
                    }
                    onTopicChoice(text)
                  }}
                />
              </div>
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
