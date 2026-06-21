'use client'

import { useMemo } from 'react'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { splitLessonBubblesForDisplay } from '@/lib/lessonBubbleLayout'
import { renderBubbleContent } from '@/lib/lessonBubbleTextRender'
import type { Bubble } from '@/types/lesson'

type LessonStepBubbleProps = {
  bubbles: Bubble[]
  animateSections?: boolean
  textRevealedThroughIndex?: number
  textAnimatingIndex?: number | null
  shellEnterActive?: boolean
  /** Текущий шаг: один слитный блок (выезд целиком, без скачка при чипах). */
  preferUnifiedLayout?: boolean
  onTextSectionRevealComplete?: (sectionIndex: number) => void
}

const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[#FFFBEB]',
  info: 'bg-[#FFFFFF]',
  task: 'bg-[#F0FDF4]',
}

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white/95'

function resolveSoftTextWrapper(
  sectionIndex: number,
  shellEnterActive: boolean,
  animateText: boolean,
  textRevealedThroughIndex: number,
  textAnimatingIndex: number | null
): { className: string; ariaHidden: boolean; isAnimating: boolean } {
  if (shellEnterActive) {
    return { className: 'opacity-0', ariaHidden: true, isAnimating: false }
  }

  if (!animateText) {
    return { className: '', ariaHidden: false, isAnimating: false }
  }

  if (sectionIndex <= textRevealedThroughIndex) {
    return { className: '', ariaHidden: false, isAnimating: false }
  }

  const activeIndex = textAnimatingIndex ?? (textRevealedThroughIndex < 0 ? 0 : null)

  if (sectionIndex === activeIndex) {
    return { className: 'lesson-text-soft-enter', ariaHidden: false, isAnimating: true }
  }

  return { className: 'opacity-0', ariaHidden: true, isAnimating: false }
}

function SoftTextSection({
  bubble,
  sectionIndex,
  shellEnterActive,
  animateSections,
  textRevealedThroughIndex,
  textAnimatingIndex,
  onTextSectionRevealComplete,
  isLastInCard,
}: {
  bubble: Bubble
  sectionIndex: number
  shellEnterActive: boolean
  animateSections: boolean
  textRevealedThroughIndex: number
  textAnimatingIndex: number | null
  onTextSectionRevealComplete?: (sectionIndex: number) => void
  isLastInCard: boolean
}) {
  const softTextWrapper = resolveSoftTextWrapper(
    sectionIndex,
    shellEnterActive,
    animateSections,
    textRevealedThroughIndex,
    textAnimatingIndex
  )

  return (
    <section
      className={`px-3 py-2 ${unifiedSectionClassByType[bubble.type]} ${
        isLastInCard ? '' : 'border-b border-[var(--chat-section-neutral-border)]'
      }`}
    >
      <div
        className={softTextWrapper.className}
        aria-hidden={softTextWrapper.ariaHidden}
        onAnimationEnd={(event) => {
          if (!softTextWrapper.isAnimating) return
          if (event.animationName !== 'lessonTextSoftIn') return
          onTextSectionRevealComplete?.(sectionIndex)
        }}
      >
        {renderBubbleContent(bubble.content, {
          emphasizeTaskInstructions: bubble.type === 'task',
        })}
      </div>
    </section>
  )
}

export default function LessonStepBubble({
  bubbles,
  animateSections = true,
  textRevealedThroughIndex = -1,
  textAnimatingIndex = null,
  shellEnterActive = false,
  preferUnifiedLayout = false,
  onTextSectionRevealComplete,
}: LessonStepBubbleProps) {
  const cornerClass = LESSON_CARD_RADIUS_CLASS
  const split = useMemo(() => splitLessonBubblesForDisplay(bubbles), [bubbles])
  const useUnifiedLayout =
    preferUnifiedLayout || !split.useSplitLayout || !split.taskBubble

  if (bubbles.length === 0) {
    return null
  }

  if (useUnifiedLayout) {
    return (
      <div
        className={`relative w-full min-w-0 overflow-hidden ${lessonCardSurfaceClass} ${cornerClass}`}
      >
        {bubbles.map((bubble, bubbleIndex) => (
          <SoftTextSection
            key={`${bubble.type}-${bubbleIndex}`}
            bubble={bubble}
            sectionIndex={bubbleIndex}
            shellEnterActive={shellEnterActive}
            animateSections={animateSections}
            textRevealedThroughIndex={textRevealedThroughIndex}
            textAnimatingIndex={textAnimatingIndex}
            onTextSectionRevealComplete={onTextSectionRevealComplete}
            isLastInCard={bubbleIndex === bubbles.length - 1}
          />
        ))}
      </div>
    )
  }

  const { theoryBubbles, taskBubble, taskIndex } = split

  return (
    <div className="w-full min-w-0 space-y-1.5">
      {theoryBubbles.length > 0 ? (
        <div className={`relative overflow-hidden ${lessonCardSurfaceClass} ${cornerClass}`}>
          {theoryBubbles.map((bubble, theoryIndex) => (
            <SoftTextSection
              key={`${bubble.type}-${theoryIndex}`}
              bubble={bubble}
              sectionIndex={theoryIndex}
              shellEnterActive={shellEnterActive}
              animateSections={animateSections}
              textRevealedThroughIndex={textRevealedThroughIndex}
              textAnimatingIndex={textAnimatingIndex}
              onTextSectionRevealComplete={onTextSectionRevealComplete}
              isLastInCard={theoryIndex === theoryBubbles.length - 1}
            />
          ))}
        </div>
      ) : null}

      <div className={`relative overflow-hidden ${lessonCardSurfaceClass} ${cornerClass}`}>
        <SoftTextSection
          bubble={taskBubble}
          sectionIndex={taskIndex}
          shellEnterActive={shellEnterActive}
          animateSections={animateSections}
          textRevealedThroughIndex={textRevealedThroughIndex}
          textAnimatingIndex={textAnimatingIndex}
          onTextSectionRevealComplete={onTextSectionRevealComplete}
          isLastInCard
        />
      </div>
    </div>
  )
}
