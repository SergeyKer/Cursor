'use client'

import { useEffect, useState } from 'react'
import TypingText from '@/components/TypingText'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { renderBubbleContent } from '@/lib/lessonBubbleTextRender'
import { practiceTypewriterSpeedForSection } from '@/lib/practice/practiceRevealTiming'
import type { Bubble } from '@/types/lesson'

type PracticeQuestionRevealStyle = 'typewriter' | 'softText'

type PracticeQuestionBubbleProps = {
  bubbles: Bubble[]
  visibleSectionCount: number
  typingSectionIndex?: number | null
  animateSections?: boolean
  /** `typewriter` — практика; `softText` — уроки: карточка сразу, текст fade по полосам. */
  revealStyle?: PracticeQuestionRevealStyle
  textRevealedThroughIndex?: number
  textAnimatingIndex?: number | null
  /** Скрывает текст, пока пузырь въезжает (анимация на ChatBubbleFrame). */
  shellEnterActive?: boolean
  onTextSectionRevealComplete?: (sectionIndex: number) => void
  onSectionTypewriterComplete?: (sectionIndex: number) => void
}

const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[#FFFBEB]',
  info: 'bg-[#FFFFFF]',
  task: 'bg-[#F0FDF4]',
}

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white/95'

function SectionTypewriterContent({
  content,
  sectionType,
  typewriterActive,
  onTypewriterComplete,
}: {
  content: string
  sectionType: Bubble['type']
  typewriterActive: boolean
  onTypewriterComplete?: () => void
}) {
  const [typingDone, setTypingDone] = useState(!typewriterActive)

  useEffect(() => {
    setTypingDone(!typewriterActive)
  }, [typewriterActive, content])

  if (!typewriterActive || typingDone) {
    return renderBubbleContent(content, {
      emphasizeTaskInstructions: sectionType === 'task',
    })
  }

  return (
    <TypingText
      key={content}
      text={content}
      mode="word"
      speed={practiceTypewriterSpeedForSection(sectionType)}
      startDelayMs={0}
      fadeWhileTyping={false}
      variant="chat"
      onComplete={() => {
        setTypingDone(true)
        onTypewriterComplete?.()
      }}
    />
  )
}

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

export default function PracticeQuestionBubble({
  bubbles,
  visibleSectionCount,
  typingSectionIndex = null,
  animateSections = true,
  revealStyle = 'typewriter',
  textRevealedThroughIndex = -1,
  textAnimatingIndex = null,
  shellEnterActive = false,
  onTextSectionRevealComplete,
  onSectionTypewriterComplete,
}: PracticeQuestionBubbleProps) {
  const cornerClass = LESSON_CARD_RADIUS_CLASS
  const isSoftText = revealStyle === 'softText'
  const visibleBubbles = isSoftText ? bubbles : bubbles.slice(0, Math.max(0, visibleSectionCount))

  if (visibleBubbles.length === 0) {
    return null
  }

  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden opacity-100 ${lessonCardSurfaceClass} ${cornerClass}`}
    >
      {visibleBubbles.map((bubble, bubbleIndex) => {
        const isLastVisible = bubbleIndex === visibleBubbles.length - 1
        const useTypewriter =
          revealStyle === 'typewriter' &&
          animateSections &&
          typingSectionIndex !== null &&
          bubbleIndex === typingSectionIndex
        const softTextWrapper = isSoftText
          ? resolveSoftTextWrapper(
              bubbleIndex,
              shellEnterActive,
              animateSections,
              textRevealedThroughIndex,
              textAnimatingIndex
            )
          : null

        return (
          <section
            key={`${bubble.type}-${bubbleIndex}`}
            className={`${useTypewriter ? 'practice-section-appear' : ''} px-3 py-2 opacity-100 ${unifiedSectionClassByType[bubble.type]} ${
              isLastVisible ? '' : 'border-b border-[var(--chat-section-neutral-border)]'
            }`}
          >
            {useTypewriter ? (
              <SectionTypewriterContent
                content={bubble.content}
                sectionType={bubble.type}
                typewriterActive
                onTypewriterComplete={() => onSectionTypewriterComplete?.(bubbleIndex)}
              />
            ) : isSoftText ? (
              <div
                className={softTextWrapper?.className}
                aria-hidden={softTextWrapper?.ariaHidden}
                onAnimationEnd={(event) => {
                  if (!softTextWrapper?.isAnimating) return
                  if (event.animationName !== 'lessonTextSoftIn') return
                  onTextSectionRevealComplete?.(bubbleIndex)
                }}
              >
                {renderBubbleContent(bubble.content, {
                  emphasizeTaskInstructions: bubble.type === 'task',
                })}
              </div>
            ) : (
              renderBubbleContent(bubble.content, {
                emphasizeTaskInstructions: bubble.type === 'task',
              })
            )}
          </section>
        )
      })}
    </div>
  )
}
