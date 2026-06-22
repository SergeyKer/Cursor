'use client'

import { useEffect, useState } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import { LESSON_TEXT_SECTION_PAUSE_MS } from '@/lib/lessonRevealTiming'
import { renderTaskInstructionText } from '@/lib/lessonBubbleTextRender'

const feedbackCardSurfaceClass =
  'chat-section-surface glass-surface rounded-xl border px-3 py-2'

const errorStatusCardClass =
  'border-amber-200/90 bg-amber-50/95 text-amber-800'

const repeatInstructionCardClass =
  'border-[var(--chat-section-emerald-border)] bg-[var(--chat-section-emerald)]'

type LessonFeedbackStatusBubbleProps = {
  hintText: string
  repeatAnswer?: string
  repeatInstructionVerb?: string
  animateSayText?: boolean
  sayTextRevealReady?: boolean
  /** Показывать пустую карточку «Скажите» до раскрытия текста (практика). */
  reserveEmptySayBlock?: boolean
  /** Задержка перед текстом «Скажите»; 0 — одновременно с внешним UI (поле ввода). */
  sayRevealDelayMs?: number
}

export default function LessonFeedbackStatusBubble({
  hintText,
  repeatAnswer,
  repeatInstructionVerb = 'Скажи',
  animateSayText = false,
  sayTextRevealReady = true,
  reserveEmptySayBlock = false,
  sayRevealDelayMs,
}: LessonFeedbackStatusBubbleProps) {
  const [sayTextRevealing, setSayTextRevealing] = useState(!animateSayText)

  useEffect(() => {
    if (!repeatAnswer || !animateSayText) {
      setSayTextRevealing(!animateSayText && Boolean(repeatAnswer) && sayTextRevealReady)
      return
    }

    if (!sayTextRevealReady) {
      setSayTextRevealing(false)
      return
    }

    const delay = sayRevealDelayMs ?? LESSON_TEXT_SECTION_PAUSE_MS
    if (delay <= 0) {
      setSayTextRevealing(true)
      return
    }

    setSayTextRevealing(false)
    const timer = setTimeout(() => {
      setSayTextRevealing(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [repeatAnswer, animateSayText, hintText, sayTextRevealReady, sayRevealDelayMs])

  if (!repeatAnswer) {
    return (
      <section className={`${feedbackCardSurfaceClass} ${errorStatusCardClass}`} role="alert">
        <FeedbackStatusText text={hintText} />
      </section>
    )
  }

  const sayInstructionText = `${repeatInstructionVerb}: ${repeatAnswer}`
  const showSaySoftEnter = animateSayText && sayTextRevealing

  return (
    <div className="space-y-1.5">
      <section className={`${feedbackCardSurfaceClass} ${errorStatusCardClass}`} role="alert">
        <FeedbackStatusText text={hintText} />
      </section>

      <section
        className={`overflow-hidden ${feedbackCardSurfaceClass} ${repeatInstructionCardClass}${
          reserveEmptySayBlock && !sayTextRevealing ? ' min-h-[2.75rem]' : ''
        }`}
        role="note"
      >
        {sayTextRevealing ? (
          <div
            className={`text-[15px] leading-[1.45] text-[var(--text)]${
              showSaySoftEnter ? ' lesson-text-soft-enter' : ''
            }`}
          >
            {renderTaskInstructionText(sayInstructionText)}
          </div>
        ) : reserveEmptySayBlock ? (
          <div className="min-h-[1.45rem]" aria-hidden="true" />
        ) : (
          <div
            className="invisible text-[15px] leading-[1.45] text-[var(--text)]"
            aria-hidden="true"
          >
            {renderTaskInstructionText(sayInstructionText)}
          </div>
        )}
      </section>
    </div>
  )
}
