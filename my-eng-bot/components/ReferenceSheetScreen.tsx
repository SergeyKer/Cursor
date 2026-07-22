'use client'

import { useMemo, useRef, type ReactNode } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  BLUE_PRIMARY_SKIN,
  BLUE_SECONDARY_SKIN,
  BTN_DISABLED_CLASS,
  BTN_FONT_INLINE,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { buildReferenceBubbles } from '@/lib/reference/buildReferenceBubbles'
import type { ReferenceSheet } from '@/lib/reference/types'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'

type ReferenceSheetScreenProps = {
  sheet: ReferenceSheet
  onBack: () => void
  onStartLesson: () => void
  onStartPractice?: () => void
}

const BACK_BTN_CLASS = [
  BTN_INTERACTION_BASE,
  'inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200',
  'bg-gradient-to-r from-slate-50 to-sky-50 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-600',
  'hover:from-white hover:to-sky-100 active:brightness-95 sm:px-3 sm:text-sm',
  BTN_DISABLED_CLASS,
].join(' ')

const ROW_CTA_BASE = [
  BTN_INTERACTION_BASE,
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center whitespace-nowrap',
  BTN_FONT_INLINE,
  BTN_DISABLED_CLASS,
].join(' ')

const PRIMARY_ROW_CTA_CLASS = `${ROW_CTA_BASE} ${BLUE_PRIMARY_SKIN}`
const SECONDARY_ROW_CTA_CLASS = `${ROW_CTA_BASE} ${BLUE_SECONDARY_SKIN}`

function BackButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={BACK_BTN_CLASS}>
      {children}
    </button>
  )
}

export default function ReferenceSheetScreen({
  sheet,
  onBack,
  onStartLesson,
  onStartPractice,
}: ReferenceSheetScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bubbles = useMemo(() => buildReferenceBubbles(sheet), [sheet])
  const showPractice = Boolean(sheet.hasPractice && onStartPractice)

  return (
    <LessonReadingShell
      scrollRef={scrollContainerRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
      composer={
        <div className="flex w-full items-center gap-1.5">
          <BackButton onClick={onBack}>{REFERENCE_COPY.back}</BackButton>
          {showPractice ? (
            <>
              <button type="button" onClick={onStartPractice} className={PRIMARY_ROW_CTA_CLASS}>
                {REFERENCE_COPY.startPractice}
              </button>
              <button type="button" onClick={onStartLesson} className={SECONDARY_ROW_CTA_CLASS}>
                {REFERENCE_COPY.startLesson}
              </button>
            </>
          ) : (
            <button type="button" onClick={onStartLesson} className={PRIMARY_ROW_CTA_CLASS}>
              {REFERENCE_COPY.startLesson}
            </button>
          )}
        </div>
      }
    >
      <UnifiedLessonBubble bubbles={bubbles} layout="detached" enterMode="reading" animateSections />
    </LessonReadingShell>
  )
}
