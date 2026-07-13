'use client'

import { useEffect, useRef } from 'react'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import PracticeInstructionFlowInfoStep from '@/components/practice/PracticeInstructionFlowInfoStep'
import { ChatBubbleFrame, getBubblePosition } from '@/components/chat/ChatBubble'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { useBriefingComposerEnter } from '@/hooks/useBriefingComposerEnter'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'
import { buildPracticeBriefingBubbles } from '@/lib/practice/practiceInstructionCopy'
import { getPracticeEconomyDayKey } from '@/lib/practice/practiceEconomyRules'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import {
  getPracticeGlobalXpToday,
  getPracticeTopicProgress,
} from '@/lib/practice/practiceTopicProgressStorage'
import { buildPracticeBadgeBriefingLine } from '@/lib/practice/practiceBadges'
import { loadLessonProgress } from '@/lib/lessonProgressStorage'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import type { Audience } from '@/lib/types'
import type { PracticeSession } from '@/types/practice'

type PracticeBriefingScreenProps = {
  session: PracticeSession
  audience: Audience
  onContinue: () => void
}

export default function PracticeBriefingScreen({
  session,
  audience,
  onContinue,
}: PracticeBriefingScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const {
    cardEnterClassName,
    actionsReady,
    onBubbleAnimationEnd,
    onCardAnimationEnd,
  } = useBriefingComposerEnter({
    resetKey: session.id,
    prefersReducedMotion,
  })
  const briefingBubbles = buildPracticeBriefingBubbles(session, audience)
  const progress = getPracticeTopicProgress(session.lessonId)
  const badgeBriefingLine = buildPracticeBadgeBriefingLine({
    lessonId: session.lessonId,
    progress,
  })
  const thesis = {
    mode: session.mode,
    tier: resolvePracticeEconomyTier(loadLessonProgress(session.lessonId)?.medal ?? null),
    ringCount: progress.ringCount,
    lastQualifyingDayKey: progress.lastQualifyingDayKey,
    todayKey: getPracticeEconomyDayKey(),
    baseBadgeClaimed: Boolean(progress.baseBadgeClaimedAt) || (progress.badgeRank ?? 0) >= 1,
    pendingPracticeCoins: progress.pendingPracticeCoins ?? 0,
    pendingCup: Boolean(progress.pendingCup),
    practiceGlobalXpToday: getPracticeGlobalXpToday(),
    audience,
    forgivenessEnabled: true,
    lessonId: session.lessonId,
    badgeBriefingLine,
  } as const
  const composerMinHeight = estimateLessonComposerMinHeight({
    panelKind: 'briefing',
    compact: true,
    briefingPractice: true,
  })

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    scrollContainer.scrollTo({ top: 0, behavior: 'auto' })
  }, [session.id])

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
                <ChatBubbleFrame
                  role="assistant"
                  position={getBubblePosition(undefined, 'assistant', undefined)}
                  className="lesson-enter"
                  rowClassName="mb-2.5"
                  onAnimationEnd={onBubbleAnimationEnd}
                >
                  <UnifiedLessonBubble bubbles={briefingBubbles} layout="detached" />
                </ChatBubbleFrame>
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
              <PracticeInstructionFlowInfoStep
                session={session}
                audience={audience}
                thesis={thesis}
                onContinue={onContinue}
                enterClassName={cardEnterClassName}
                actionsReady={actionsReady}
                onCardEnterAnimationEnd={onCardAnimationEnd}
              />
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
