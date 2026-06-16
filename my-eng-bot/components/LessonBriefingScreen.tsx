'use client'

import { useEffect, useRef } from 'react'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import LessonReturnBriefingFlowInfoStep from '@/components/LessonReturnBriefingFlowInfoStep'
import { ChatBubbleFrame, getBubblePosition } from '@/components/chat/ChatBubble'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  estimateLessonComposerMinHeight,
} from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import type { LessonReturnBriefingPayload } from '@/lib/lessonReturnBriefingCopy'

type LessonBriefingScreenProps = {
  briefing: LessonReturnBriefingPayload
  onContinue: () => void
  onGenerateVariant?: () => void
  generateVariantBusy?: boolean
  generateVariantProgress?: number
  generateVariantLabel?: string
}

export default function LessonBriefingScreen({
  briefing,
  onContinue,
  onGenerateVariant,
  generateVariantBusy,
  generateVariantProgress,
  generateVariantLabel,
}: LessonBriefingScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const composerMinHeight = estimateLessonComposerMinHeight({
    panelKind: 'briefing',
    compact: false,
    briefingDualCta: briefing.actions.offerGenerateVariant === true,
  })

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    scrollContainer.scrollTo({ top: 0, behavior: 'auto' })
  }, [briefing.runKey])

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
              >
                <ChatBubbleFrame
                  role="assistant"
                  position={getBubblePosition(undefined, 'assistant', undefined)}
                  className="lesson-enter"
                  rowClassName="mb-2.5"
                >
                  <UnifiedLessonBubble bubbles={briefing.bubbles} layout="detached" />
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
              <LessonReturnBriefingFlowInfoStep
                runKey={briefing.runKey}
                copy={briefing.copy}
                actions={briefing.actions}
                onContinue={onContinue}
                onGenerateVariant={onGenerateVariant}
                generateVariantBusy={generateVariantBusy}
                generateVariantProgress={generateVariantProgress}
                generateVariantLabel={generateVariantLabel}
              />
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
