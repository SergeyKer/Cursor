'use client'

import { useEffect, useRef } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import LessonReturnBriefingFlowInfoStep from '@/components/LessonReturnBriefingFlowInfoStep'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { estimateLessonComposerMinHeight } from '@/lib/lessonComposerLayout'
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
  const prefersReducedMotion = usePrefersReducedMotion()
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
    <LessonReadingShell
      scrollRef={scrollContainerRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} chat-feed-scroll chat-feed-wallpaper py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{
        paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
        minHeight: composerMinHeight,
      }}
      composer={
        <LessonReturnBriefingFlowInfoStep
          runKey={briefing.runKey}
          copy={briefing.copy}
          actions={briefing.actions}
          onContinue={onContinue}
          onGenerateVariant={onGenerateVariant}
          generateVariantBusy={generateVariantBusy}
          generateVariantProgress={generateVariantProgress}
          generateVariantLabel={generateVariantLabel}
          enterClassName={prefersReducedMotion ? '' : 'lesson-enter'}
          actionsReady={true}
        />
      }
    >
      <UnifiedLessonBubble
        bubbles={briefing.bubbles}
        layout="detached"
        enterMode="reading"
        animateSections={!prefersReducedMotion}
      />
    </LessonReadingShell>
  )
}
