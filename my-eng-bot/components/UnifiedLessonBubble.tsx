'use client'

import type { Bubble } from '@/types/lesson'

type UnifiedLessonBubbleProps = {
  bubbles: Bubble[]
  animateSections?: boolean
}

function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

/** Фоны горизонтальных полос внутри одной карточки урока (positive / info / task). */
const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[#FFFBEB]',
  info: 'bg-[#FFFFFF]',
  task: 'bg-[#F0FDF4]',
}

function splitLabel(line: string): { label: string; rest: string } | null {
  const match = /^([^:]{2,28}):\s*(.+)$/.exec(line)
  if (!match) return null
  return { label: match[1], rest: match[2] }
}

function renderBodyLine(line: string, index: number) {
  if (!line.trim()) {
    return <div key={index} className="h-1" aria-hidden />
  }

  const markerMatch = /^(•|✓|🎯|🧭|⚠️)\s*(.+)$/.exec(line)
  const marker = markerMatch?.[1]
  const text = markerMatch?.[2] ?? line
  const label = splitLabel(text)

  return (
    <div key={index} className="flex gap-2 text-[15px] leading-[1.45] text-[var(--text)]">
      {marker && (
        <span className="mt-[0.15rem] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 text-[12px] shadow-sm">
          {marker}
        </span>
      )}
      <span className="min-w-0 flex-1">
        {label ? (
          <>
            <span className="font-semibold text-slate-700">{label.label}:</span> {label.rest}
          </>
        ) : (
          text
        )}
      </span>
    </div>
  )
}

function renderBubbleContent(content: string) {
  const [title, ...body] = normalizeTranslatePromptPunctuation(content).split('\n')

  if (body.length === 0) {
    return <div className="break-words text-[15px] leading-[1.45] text-[var(--text)]">{title}</div>
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-700">{title}</div>
      <div className="space-y-1.5">{body.map(renderBodyLine)}</div>
    </div>
  )
}

export default function UnifiedLessonBubble({ bubbles, animateSections = true }: UnifiedLessonBubbleProps) {
  return (
    <div className="chat-section-surface glass-surface relative w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-white/95">
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
            {renderBubbleContent(bubble.content)}
          </section>
        )
      })}
    </div>
  )
}
