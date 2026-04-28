'use client'

import type { Bubble } from '@/types/lesson'

type UnifiedLessonBubbleProps = {
  bubbles: Bubble[]
}

const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[rgba(236,253,245,0.95)]',
  info: 'bg-white/95',
  task: 'bg-[rgba(239,246,255,0.96)]',
}

export default function UnifiedLessonBubble({ bubbles }: UnifiedLessonBubbleProps) {
  return (
    <div className="chat-section-surface glass-surface overflow-hidden rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/95">
      {bubbles.map((bubble, bubbleIndex) => {
        const isLast = bubbleIndex === bubbles.length - 1

        return (
          <section
            key={`${bubble.type}-${bubbleIndex}`}
            className={`lesson-enter px-3 py-2 ${unifiedSectionClassByType[bubble.type]} ${
              isLast ? '' : 'border-b border-[var(--chat-section-neutral-border)]'
            }`}
            style={{
              animationDelay: `${bubbleIndex * 120}ms`,
              animationFillMode: 'both',
            }}
          >
            <p className="whitespace-pre-line break-words text-[15px] leading-[1.5] text-[var(--text)]">
              {bubble.content}
            </p>
          </section>
        )
      })}
    </div>
  )
}
