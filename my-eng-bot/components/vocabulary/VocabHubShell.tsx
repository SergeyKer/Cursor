'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import { APP_BTN_TERTIARY_BACK } from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { VOCAB_COMPOSER_SECONDARY } from '@/lib/vocabulary/cardStyles'

type Props = {
  children: ReactNode
  backLabel: string
  onBack: () => void
  actionLabel?: string | null
  onAction?: () => void
  actionDisabled?: boolean
}

export default function VocabHubShell({
  children,
  backLabel,
  onBack,
  actionLabel,
  onAction,
  actionDisabled = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [])
  return (
    <LessonReadingShell
      scrollRef={scrollRef}
      showChatWallpaper={false}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} space-y-2.5 py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
      composer={
        <div className="flex w-full items-center gap-1.5">
          <button type="button" onClick={onBack} className={APP_BTN_TERTIARY_BACK}>
            {backLabel}
          </button>
          {actionLabel && onAction ? (
            <button
              type="button"
              disabled={actionDisabled}
              onClick={onAction}
              className={VOCAB_COMPOSER_SECONDARY}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      }
    >
      {children}
    </LessonReadingShell>
  )
}
