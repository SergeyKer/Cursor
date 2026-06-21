'use client'

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { LESSON_CARD_ENTER_MS } from '@/lib/lessonRevealTiming'
import { renderBubbleContent } from '@/lib/lessonBubbleTextRender'
import type { Bubble } from '@/types/lesson'

export type UnifiedLessonBubbleLayout = 'unified' | 'detached'

type UnifiedLessonBubbleProps = {
  bubbles: Bubble[]
  animateSections?: boolean
  /** `detached` - отдельные карточки (интро), как в LessonExtraTipsScreen; `unified` - слитная карточка урока. */
  layout?: UnifiedLessonBubbleLayout
  /** Только для `detached`: сколько секций уже показано; скрытые остаются в layout (`opacity-0`). */
  visibleSectionCount?: number
}

/** Фоны горизонтальных полос внутри одной карточки урока (positive / info / task). */
const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[#FFFBEB]',
  info: 'bg-[#FFFFFF]',
  task: 'bg-[#F0FDF4]',
}

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white/95'

export default function UnifiedLessonBubble({
  bubbles,
  animateSections = true,
  layout = 'unified',
  visibleSectionCount,
}: UnifiedLessonBubbleProps) {
  const cornerClass = LESSON_CARD_RADIUS_CLASS

  if (layout === 'detached') {
    const useStaggeredReveal = visibleSectionCount !== undefined

    return (
      <div className="w-full min-w-0 space-y-2.5">
        {bubbles.map((bubble, bubbleIndex) => {
          const isVisible = !useStaggeredReveal || bubbleIndex < visibleSectionCount
          const isRevealing = useStaggeredReveal && bubbleIndex === visibleSectionCount - 1
          const shouldAnimate = animateSections && (!useStaggeredReveal || isRevealing)

          return (
            <section
              key={`${bubble.type}-${bubbleIndex}`}
              aria-hidden={useStaggeredReveal ? !isVisible : undefined}
              className={`${shouldAnimate ? 'lesson-enter' : ''} ${lessonCardSurfaceClass} overflow-hidden ${cornerClass} ${
                useStaggeredReveal && !isVisible ? 'pointer-events-none opacity-0' : ''
              }`}
              style={
                shouldAnimate
                  ? {
                      animationDelay: useStaggeredReveal ? '0ms' : `${bubbleIndex * 80}ms`,
                      animationDuration: useStaggeredReveal
                        ? `${LESSON_CARD_ENTER_MS}ms`
                        : undefined,
                      animationFillMode: 'both',
                    }
                  : undefined
              }
            >
              <div className="px-3 py-2.5">
                {renderBubbleContent(bubble.content, {
                  emphasizeTaskInstructions: bubble.type === 'task',
                  bulletStyle: 'dot',
                })}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`relative w-full min-w-0 overflow-hidden ${lessonCardSurfaceClass} ${cornerClass}`}>
      {bubbles.map((bubble, bubbleIndex) => {
        const isLast = bubbleIndex === bubbles.length - 1

        return (
          <section
            key={`${bubble.type}-${bubbleIndex}`}
            className={`${animateSections ? 'lesson-enter' : ''} px-3 py-2 ${unifiedSectionClassByType[bubble.type]} ${
              isLast ? '' : 'border-b border-[var(--chat-section-neutral-border)]'
            }`}
            style={
              animateSections
                ? {
                    animationDelay: `${bubbleIndex * 90}ms`,
                    animationFillMode: 'both',
                  }
                : undefined
            }
          >
            {renderBubbleContent(bubble.content, {
              emphasizeTaskInstructions: bubble.type === 'task',
            })}
          </section>
        )
      })}
    </div>
  )
}
