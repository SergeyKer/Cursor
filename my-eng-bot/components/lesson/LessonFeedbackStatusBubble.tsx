'use client'

import { useEffect, useState } from 'react'
import EngvoFeedServiceTypingText from '@/components/engvo/EngvoFeedServiceTypingText'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import { ENGVO_TYPING_MESSAGE } from '@/lib/engvoPersonaCopy'
import { LESSON_TEXT_SECTION_PAUSE_MS } from '@/lib/lessonRevealTiming'
import { renderTaskInstructionText } from '@/lib/lessonBubbleTextRender'

const feedbackCardSurfaceClass =
  'chat-section-surface glass-surface rounded-xl border px-3 py-2'

const errorStatusCardClass =
  'border-amber-200/90 bg-amber-50/95 text-amber-800'

const repeatInstructionCardClass =
  'border-[var(--chat-section-emerald-border)] bg-[var(--chat-section-emerald)]'

const sayInstructionTextClass = 'text-[15px] leading-[1.45] text-[var(--text)]'

type LessonFeedbackStatusBubbleProps = {
  hintText: string
  repeatAnswer?: string
  repeatInstructionVerb?: string
  animateSayText?: boolean
  sayTextRevealReady?: boolean
  /** Показывать пустую карточку «Скажите» до раскрытия текста (практика). */
  reserveEmptySayBlock?: boolean
  /** «Engvo печатает...» поверх invisible-якоря финального текста (практика). */
  emptySayTypingIndicator?: boolean
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
  emptySayTypingIndicator = false,
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
  const useEmptySayMinHeight =
    reserveEmptySayBlock && !sayTextRevealing && !emptySayTypingIndicator

  const sayInstructionContent = renderTaskInstructionText(sayInstructionText)

  return (
    <div className="space-y-1.5">
      <section className={`${feedbackCardSurfaceClass} ${errorStatusCardClass}`} role="alert">
        <FeedbackStatusText text={hintText} />
      </section>

      <section
        className={`overflow-hidden ${feedbackCardSurfaceClass} ${repeatInstructionCardClass}${
          useEmptySayMinHeight ? ' min-h-[2.75rem]' : ''
        }`}
        role="note"
      >
        {sayTextRevealing ? (
          <div
            className={`${sayInstructionTextClass}${
              showSaySoftEnter ? ' lesson-text-soft-enter' : ''
            }`}
          >
            {sayInstructionContent}
          </div>
        ) : emptySayTypingIndicator ? (
          <div className="relative">
            <div className={`invisible ${sayInstructionTextClass}`} aria-hidden="true">
              {sayInstructionContent}
            </div>
            <div className="pointer-events-none absolute inset-0" role="status" aria-live="polite">
              <EngvoFeedServiceTypingText text={ENGVO_TYPING_MESSAGE} />
            </div>
          </div>
        ) : reserveEmptySayBlock ? (
          <div className="min-h-[1.45rem]" aria-hidden="true" />
        ) : (
          <div className={`invisible ${sayInstructionTextClass}`} aria-hidden="true">
            {sayInstructionContent}
          </div>
        )}
      </section>
    </div>
  )
}
