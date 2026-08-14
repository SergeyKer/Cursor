'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import ProgressCtaButton from '@/components/ProgressCtaButton'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_PRIMARY_LESSON_START,
  APP_BTN_TERTIARY_BACK_SKIN,
  BTN_FONT_SMALL,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { estimateIntroComposerMinHeight, LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'

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
  const showSticky = Boolean(actionLabel && onAction)
  return (
    <LessonReadingShell
      scrollRef={scrollRef}
      showChatWallpaper={false}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{
        paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM,
        ...(showSticky ? { minHeight: estimateIntroComposerMinHeight({ hasSecondaryChips: false }) } : {}),
      }}
      composer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onBack}
              className={`${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl ${APP_BTN_TERTIARY_BACK_SKIN} px-2.5 py-2 text-center ${BTN_FONT_SMALL} sm:px-3 sm:text-sm`}
            >
              {backLabel}
            </button>
          </div>
          {showSticky ? (
            <ProgressCtaButton onClick={onAction!} disabled={actionDisabled} className={APP_BTN_PRIMARY_LESSON_START}>
              {actionLabel}
            </ProgressCtaButton>
          ) : null}
        </div>
      }
    >
      <div className="w-full min-w-0 space-y-2.5">{children}</div>
    </LessonReadingShell>
  )
}
