'use client'

import type { Bubble } from '@/types/lesson'

type UnifiedLessonBubbleProps = {
  bubbles: Bubble[]
}

function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[rgba(254,249,195,0.98)]',
  info: 'bg-white/95',
  task: 'bg-[rgba(220,252,231,0.98)]',
}

export default function UnifiedLessonBubble({ bubbles }: UnifiedLessonBubbleProps) {
  return (
    <div className="chat-section-surface glass-surface relative overflow-hidden rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/95">
      {bubbles.map((bubble, bubbleIndex) => {
        const isLast = bubbleIndex === bubbles.length - 1

        return (
          <section
            key={`${bubble.type}-${bubbleIndex}`}
            className={`px-3 py-2 ${unifiedSectionClassByType[bubble.type]} ${
              isLast ? '' : 'border-b border-[var(--chat-section-neutral-border)]'
            }`}
          >
            <p className="whitespace-pre-line break-words text-[15px] leading-[1.5] text-[var(--text)]">
              {normalizeTranslatePromptPunctuation(bubble.content)}
            </p>
          </section>
        )
      })}
    </div>
  )
}
