'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import LessonChoiceChips from '@/components/LessonChoiceChips'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { ChatBubbleFrame, getBubblePosition, CHAT_FEED_SERVICE_STATUS_ROW_CLASS } from '@/components/chat/ChatBubble'
import EngvoFeedServiceTypingText from '@/components/engvo/EngvoFeedServiceTypingText'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'
import {
  LESSON_SCROLL_VIEWPORT_CLASS,
  scheduleScrollAfterLayout,
  scrollLessonFeedTailMessageIntoView,
  resolveLessonScrollBehavior,
} from '@/lib/lessonFeedScroll'
import { ENGVO_TYPING_MESSAGE } from '@/lib/engvoPersonaCopy'
import { PRACTICE_CHECKING_MS } from '@/lib/practice/practiceAnswerPanelLock'
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

const LEVELS: QuickTestLevelId[] = ['A1', 'A2', 'B1', 'B2']
const TYPING_ID = 'lobby-typing'

type LobbyPhase = 'levels' | 'topics'

type FeedMessage =
  | { id: string; role: 'assistant'; text: string; enter?: boolean }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'service'; text: string }

type QuickTestEngvoDialogProps = {
  onFooterChange?: (footer: QuickTestFooterView) => void
}

export function QuickTestEngvoDialog({ onFooterChange }: QuickTestEngvoDialogProps) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const enteredIdsRef = useRef<Set<string>>(new Set())
  const [feed, setFeed] = useState<FeedMessage[]>(() => {
    const first = buildQuickTestLobbyMessages()[0]
    return first
      ? [{ id: 'lobby-msg-1', role: 'assistant', text: first, enter: true }]
      : []
  })
  const [introReady, setIntroReady] = useState(false)
  const [phase, setPhase] = useState<LobbyPhase>('levels')
  const [level, setLevel] = useState<QuickTestLevelId | null>(null)
  const introStartedRef = useRef(false)

  const levelLabels = useMemo(() => LEVELS.map((id) => QUICK_TEST_COPY.levelLabels[id]), [])
  const topics = level ? getPopularTopicsForLevel(level) : []
  const topicLabels = useMemo(() => topics.map((t) => t.title), [topics])
  const composerMinHeight = useMemo(() => {
    const levelsH = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: [...levelLabels, QUICK_TEST_COPY.dontKnowChip],
      compact: true,
    })
    const topicsH = estimateLessonComposerMinHeight({
      panelKind: 'choice',
      choiceOptions: topicLabels.length > 0 ? topicLabels : levelLabels,
      compact: true,
    })
    return Math.max(levelsH, topicsH)
  }, [levelLabels, topicLabels])

  const scrollTail = useCallback(() => {
    scheduleScrollAfterLayout(() => {
      scrollLessonFeedTailMessageIntoView(
        scrollContainerRef.current,
        resolveLessonScrollBehavior({
          prefersReducedMotion,
          reason: 'new_message',
        })
      )
    })
  }, [prefersReducedMotion])

  useEffect(() => {
    scrollTail()
  }, [feed.length, scrollTail])

  useEffect(() => {
    onFooterChange?.(
      resolveQuickTestFooter({ phase: phase === 'levels' ? 'lobby-levels' : 'lobby-topics' })
    )
  }, [phase, onFooterChange])

  useEffect(() => {
    if (introStartedRef.current) return
    introStartedRef.current = true
    const messages = [...buildQuickTestLobbyMessages()]
    let cancelled = false

    const appendAssistant = (id: string, text: string) => {
      setFeed((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== TYPING_ID)
        return [...withoutTyping, { id, role: 'assistant', text, enter: true }]
      })
    }

    const showTyping = () => {
      setFeed((prev) => {
        if (prev.some((m) => m.id === TYPING_ID)) return prev
        return [...prev, { id: TYPING_ID, role: 'service', text: ENGVO_TYPING_MESSAGE }]
      })
    }

    const run = async () => {
      if (prefersReducedMotion) {
        setFeed(
          messages.map((text, index) => ({
            id: `lobby-msg-${index + 1}`,
            role: 'assistant' as const,
            text,
          }))
        )
        setIntroReady(true)
        return
      }

      for (let i = 1; i < messages.length; i += 1) {
        if (cancelled) return
        showTyping()
        await new Promise((r) => setTimeout(r, PRACTICE_CHECKING_MS))
        if (cancelled) return
        appendAssistant(`lobby-msg-${i + 1}`, messages[i]!)
        await new Promise((r) => setTimeout(r, 420 + 200))
      }
      if (!cancelled) setIntroReady(true)
    }

    void run()
    return () => {
      cancelled = true
      introStartedRef.current = false
    }
  }, [prefersReducedMotion])

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
      const topic = topics.find((t) => t.title === text)
      if (!topic) return
      startTopic(topic.slug)
    },
    [startTopic, topics]
  )

  const onDontKnow = useCallback(() => {
    const slug = resolveRecommendedTopicSlug()
    if (slug) startTopic(slug)
  }, [startTopic])

  const assistantEnterClass = useCallback(
    (id: string, allowEnter?: boolean) => {
      if (prefersReducedMotion || !allowEnter) return ''
      if (enteredIdsRef.current.has(id)) return ''
      enteredIdsRef.current.add(id)
      return 'lesson-enter'
    },
    [prefersReducedMotion]
  )

  const userEnterClass = useCallback(
    (id: string) => {
      if (prefersReducedMotion) return ''
      if (enteredIdsRef.current.has(id)) return ''
      enteredIdsRef.current.add(id)
      return 'lesson-text-soft-enter'
    },
    [prefersReducedMotion]
  )

  const chipsVisible = introReady
  const choiceOptions =
    phase === 'levels'
      ? [...levelLabels, QUICK_TEST_COPY.dontKnowChip]
      : topicLabels

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
                {feed.map((message, index) => {
                  if (message.role === 'service') {
                    return (
                      <div key={message.id} dir="ltr" className={CHAT_FEED_SERVICE_STATUS_ROW_CLASS}>
                        <EngvoFeedServiceTypingText text={message.text} />
                      </div>
                    )
                  }
                  const previousRole = feed[index - 1]?.role === 'service' ? undefined : feed[index - 1]?.role
                  const nextRole = feed[index + 1]?.role === 'service' ? undefined : feed[index + 1]?.role
                  const position = getBubblePosition(
                    previousRole as 'assistant' | 'user' | undefined,
                    message.role,
                    nextRole as 'assistant' | 'user' | undefined
                  )
                  return (
                    <ChatBubbleFrame
                      key={message.id}
                      role={message.role}
                      position={position}
                      className={
                        message.role === 'assistant'
                          ? assistantEnterClass(message.id, message.enter)
                          : userEnterClass(message.id)
                      }
                      rowClassName="mb-2.5"
                    >
                      {message.role === 'assistant' ? (
                        <UnifiedLessonBubble
                          bubbles={[{ type: 'info', content: message.text }]}
                          layout="detached"
                        />
                      ) : (
                        <p className="text-[15px] leading-relaxed">{message.text}</p>
                      )}
                    </ChatBubbleFrame>
                  )
                })}
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              className={CHAT_COMPOSER_STACK_TOP_CLASS}
              style={{
                paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
                minHeight: composerMinHeight,
              }}
              contentMaxWidthClass="max-w-[22rem]"
            >
              <div
                className={chipsVisible ? '' : 'invisible'}
                aria-hidden={!chipsVisible}
                style={{ pointerEvents: chipsVisible ? 'auto' : 'none' }}
              >
                <LessonChoiceChips
                  key={`lobby-${phase}`}
                  resetKey={`lobby-${phase}`}
                  choices={choiceOptions}
                  suppressEnterAnimation={!chipsVisible || prefersReducedMotion}
                  onChoose={(text) => {
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
