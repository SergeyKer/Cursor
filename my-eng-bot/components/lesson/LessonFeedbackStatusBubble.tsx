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
}

export default function LessonFeedbackStatusBubble({
  hintText,
  repeatAnswer,
  repeatInstructionVerb = 'Скажи',
  animateSayText = false,
  sayTextRevealReady = true,
}: LessonFeedbackStatusBubbleProps) {
  const [sayTextRevealing, setSayTextRevealing] = useState(!animateSayText)

  useEffect(() => {
    if (!repeatAnswer || !animateSayText) {
      setSayTextRevealing(!animateSayText && Boolean(repeatAnswer))
      return
    }

    if (!sayTextRevealReady) {
      setSayTextRevealing(false)
      return
    }

    setSayTextRevealing(false)
    const timer = setTimeout(() => {
      setSayTextRevealing(true)
    }, LESSON_TEXT_SECTION_PAUSE_MS)

    return () => clearTimeout(timer)
  }, [repeatAnswer, animateSayText, hintText, sayTextRevealReady])

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
        className={`overflow-hidden ${feedbackCardSurfaceClass} ${repeatInstructionCardClass}`}
        role="note"
      >
        <div
          className={`text-[15px] leading-[1.45] text-[var(--text)] ${
            sayTextRevealing
              ? showSaySoftEnter
                ? 'lesson-text-soft-enter'
                : ''
              : 'invisible'
          }`}
          aria-hidden={!sayTextRevealing}
        >
          {renderTaskInstructionText(sayInstructionText)}
        </div>
      </section>
    </div>
  )
}
