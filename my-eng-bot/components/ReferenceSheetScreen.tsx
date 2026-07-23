'use client'

import { useMemo, useRef, type ReactNode } from 'react'
import LessonReadingShell from '@/components/LessonReadingShell'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_TERTIARY_BACK,
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

/** Catalog default keeps prior behavior; back-only is for generated chip sheets. */
export type ReferenceActionsMode = 'lesson+practice' | 'lesson' | 'back-only'

type ReferenceSheetScreenProps = {
  sheet: ReferenceSheet
  onBack: () => void
  onStartLesson?: () => void
  onStartPractice?: () => void
  /** Default: derive from hasPractice + callbacks (menu-compatible). */
  actionsMode?: ReferenceActionsMode
}

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
    <button type="button" onClick={onClick} className={APP_BTN_TERTIARY_BACK}>
      {children}
    </button>
  )
}

export function resolveReferenceActionsMode(
  sheet: ReferenceSheet,
  actionsMode: ReferenceActionsMode | undefined,
  onStartLesson: (() => void) | undefined,
  onStartPractice: (() => void) | undefined
): ReferenceActionsMode {
  if (actionsMode) return actionsMode
  if (sheet.hasPractice && onStartPractice && onStartLesson) return 'lesson+practice'
  if (onStartLesson) return 'lesson'
  return 'back-only'
}

export default function ReferenceSheetScreen({
  sheet,
  onBack,
  onStartLesson,
  onStartPractice,
  actionsMode,
}: ReferenceSheetScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bubbles = useMemo(() => buildReferenceBubbles(sheet), [sheet])
  const mode = resolveReferenceActionsMode(sheet, actionsMode, onStartLesson, onStartPractice)

  return (
    <LessonReadingShell
      scrollRef={scrollContainerRef}
      scrollClassName={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper py-2.5 sm:py-3`}
      composerClassName={CHAT_COMPOSER_STACK_TOP_CLASS}
      composerStyle={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
      composer={
        <div className="flex w-full items-center gap-1.5">
          <BackButton onClick={onBack}>{REFERENCE_COPY.back}</BackButton>
          {mode === 'lesson+practice' && onStartPractice && onStartLesson ? (
            <>
              <button type="button" onClick={onStartPractice} className={PRIMARY_ROW_CTA_CLASS}>
                {REFERENCE_COPY.startPractice}
              </button>
              <button type="button" onClick={onStartLesson} className={SECONDARY_ROW_CTA_CLASS}>
                {REFERENCE_COPY.startLesson}
              </button>
            </>
          ) : null}
          {mode === 'lesson' && onStartLesson ? (
            <button type="button" onClick={onStartLesson} className={PRIMARY_ROW_CTA_CLASS}>
              {REFERENCE_COPY.startLesson}
            </button>
          ) : null}
        </div>
      }
    >
      <UnifiedLessonBubble bubbles={bubbles} layout="detached" enterMode="reading" animateSections />
    </LessonReadingShell>
  )
}
