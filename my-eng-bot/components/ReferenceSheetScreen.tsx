'use client'

import { useMemo, useRef, type ReactNode } from 'react'
import UnifiedLessonBubble from '@/components/UnifiedLessonBubble'
import { ChatBubbleFrame } from '@/components/chat/ChatBubble'
import DialogComposerStack from '@/components/DialogComposerStack'
import { DialogGlassScrollHost } from '@/components/DialogGlassScrollHost'
import {
  isStaggeredRevealComplete,
  useStaggeredSectionRevealMap,
  type StaggeredRevealTarget,
} from '@/hooks/useStaggeredSectionReveal'
import { CHAT_COMPOSER_STACK_TOP_CLASS, DIALOG_COMPOSER_PADDING_BOTTOM } from '@/lib/chatComposerMetrics'
import {
  APP_BTN_PRIMARY_LESSON_START,
  APP_BTN_SECONDARY_MENU,
  BTN_INTERACTION_BASE,
} from '@/lib/homeCtaStyles'
import { LESSON_INTRO_SCROLL_CLASS } from '@/lib/lessonComposerLayout'
import { LESSON_SCROLL_VIEWPORT_CLASS } from '@/lib/lessonFeedScroll'
import { LESSON_SECTION_REVEAL_INTERVAL_MS } from '@/lib/lessonRevealTiming'
import type { ReferenceSheet } from '@/lib/reference/types'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'
import type { Bubble } from '@/types/lesson'

type ReferenceSheetScreenProps = {
  sheet: ReferenceSheet
  onBack: () => void
  onStartLesson: () => void
  onStartPractice?: () => void
}

function formatBullets(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n')
}

function formatExamples(examples: ReferenceSheet['examples']): string {
  return examples
    .map((ex) => {
      const note = ex.note?.trim()
      return note ? `${ex.en} → ${ex.ru} (${note})` : `${ex.en} → ${ex.ru}`
    })
    .map((line) => `• ${line}`)
    .join('\n')
}

function buildReferenceBubbles(sheet: ReferenceSheet): Bubble[] {
  const bubbles: Bubble[] = [
    {
      type: 'info',
      content: sheet.level ? `${sheet.title}\n${sheet.level}` : sheet.title,
    },
  ]

  if (sheet.hook) {
    bubbles.push({
      type: 'positive',
      content: `${REFERENCE_COPY.cardHook}\n${sheet.hook}`,
    })
  }

  if (sheet.rule.length > 0) {
    bubbles.push({
      type: 'info',
      content: `${REFERENCE_COPY.cardRule}\n${formatBullets(sheet.rule)}`,
    })
  }

  if (sheet.formula.length > 0) {
    bubbles.push({
      type: 'task',
      content: `${REFERENCE_COPY.cardFormula}\n${formatBullets(sheet.formula)}`,
    })
  }

  if (sheet.traps.length > 0) {
    bubbles.push({
      type: 'info',
      content: `${REFERENCE_COPY.cardTraps}\n${formatBullets(sheet.traps)}`,
    })
  }

  if (sheet.examples.length > 0) {
    bubbles.push({
      type: 'positive',
      content: `${REFERENCE_COPY.cardExamples}\n${formatExamples(sheet.examples)}`,
    })
  }

  return bubbles
}

function LinkChip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN_INTERACTION_BASE} inline-flex min-h-10 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-2.5 py-2 text-center text-[13px] font-semibold text-slate-600 hover:from-white hover:to-sky-100 active:brightness-95 sm:px-3 sm:text-sm`}
    >
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
  const staggeredTargets = useMemo<StaggeredRevealTarget[]>(
    () => [{ id: 'reference-main', sectionCount: bubbles.length }],
    [bubbles.length]
  )
  const visibleSectionCounts = useStaggeredSectionRevealMap(
    staggeredTargets,
    sheet.id,
    LESSON_SECTION_REVEAL_INTERVAL_MS
  )
  const visibleCount = visibleSectionCounts['reference-main'] ?? 0
  const revealDone = isStaggeredRevealComplete(visibleSectionCounts, staggeredTargets)
  const showPractice = Boolean(sheet.hasPractice && onStartPractice)

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
                className={`${LESSON_SCROLL_VIEWPORT_CLASS} ${LESSON_INTRO_SCROLL_CLASS} chat-feed-wallpaper p-2.5 sm:p-3`}
              >
                <ChatBubbleFrame role="assistant" position="solo" rowClassName="mb-2.5">
                  <UnifiedLessonBubble
                    bubbles={bubbles}
                    animateSections
                    layout="detached"
                    visibleSectionCount={visibleCount}
                  />
                </ChatBubbleFrame>
              </div>
            </DialogGlassScrollHost>

            <DialogComposerStack
              className={CHAT_COMPOSER_STACK_TOP_CLASS}
              style={{ paddingBottom: DIALOG_COMPOSER_PADDING_BOTTOM }}
              contentMaxWidthClass="max-w-[22rem]"
            >
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full items-center justify-between gap-1.5">
                  <LinkChip onClick={onBack}>{REFERENCE_COPY.back}</LinkChip>
                </div>
                {revealDone ? (
                  <div className="flex w-full flex-col gap-2">
                    {showPractice ? (
                      <>
                        <button type="button" onClick={onStartPractice} className={APP_BTN_PRIMARY_LESSON_START}>
                          {REFERENCE_COPY.startPractice}
                        </button>
                        <button type="button" onClick={onStartLesson} className={APP_BTN_SECONDARY_MENU}>
                          {REFERENCE_COPY.startLesson}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={onStartLesson} className={APP_BTN_PRIMARY_LESSON_START}>
                        {REFERENCE_COPY.startLesson}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </DialogComposerStack>
          </div>
        </div>
      </div>
    </div>
  )
}
