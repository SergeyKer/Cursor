'use client'

import { useEffect, useRef, useState, type AnimationEvent } from 'react'
import FeedbackStatusText from '@/components/FeedbackStatusText'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { LESSON_SECTION_REVEAL_INTERVAL_MS } from '@/lib/lessonRevealTiming'
import { renderTaskInstructionText } from '@/lib/lessonBubbleTextRender'

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white/95'

const errorStatusCardClass =
  'border-amber-200/90 bg-amber-50/95 text-amber-800'

type LessonFeedbackStatusBubbleProps = {
  hintText: string
  repeatAnswer?: string
  animateSayText?: boolean
  onSayTextRevealComplete?: () => void
}

export default function LessonFeedbackStatusBubble({
  hintText,
  repeatAnswer,
  animateSayText = false,
  onSayTextRevealComplete,
}: LessonFeedbackStatusBubbleProps) {
  const [sayTextRevealing, setSayTextRevealing] = useState(!animateSayText)
  const sayRevealCompleteRef = useRef(false)

  useEffect(() => {
    sayRevealCompleteRef.current = false
    if (!repeatAnswer || !animateSayText) {
      setSayTextRevealing(!animateSayText && Boolean(repeatAnswer))
      return
    }

    setSayTextRevealing(false)
    const timer = setTimeout(() => {
      setSayTextRevealing(true)
    }, LESSON_SECTION_REVEAL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [repeatAnswer, animateSayText, hintText])

  const handleSayTextAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName !== 'lessonTextSoftIn') return
    if (sayRevealCompleteRef.current) return
    sayRevealCompleteRef.current = true
    onSayTextRevealComplete?.()
  }

  if (!repeatAnswer) {
    return (
      <section
        className={`chat-section-surface glass-surface rounded-xl border px-2.5 py-1.5 ${errorStatusCardClass}`}
        role="alert"
      >
        <FeedbackStatusText text={hintText} />
      </section>
    )
  }

  const sayInstructionText = `Скажи: ${repeatAnswer}`
  const showSaySoftEnter = animateSayText && sayTextRevealing

  return (
    <div className="space-y-1.5">
      <section
        className={`chat-section-surface glass-surface rounded-xl border px-2.5 py-1.5 ${errorStatusCardClass}`}
        role="alert"
      >
        <FeedbackStatusText text={hintText} />
      </section>

      <section
        className={`overflow-hidden ${lessonCardSurfaceClass} ${LESSON_CARD_RADIUS_CLASS}`}
        role="note"
      >
        <div className="bg-[#F0FDF4] px-3 py-2.5 text-[15px] leading-[1.45] text-[var(--text)]">
          <div
            className={
              sayTextRevealing
                ? showSaySoftEnter
                  ? 'lesson-text-soft-enter'
                  : ''
                : 'opacity-0'
            }
            aria-hidden={!sayTextRevealing}
            onAnimationEnd={showSaySoftEnter ? handleSayTextAnimationEnd : undefined}
          >
            {renderTaskInstructionText(sayInstructionText)}
          </div>
        </div>
      </section>
    </div>
  )
}
