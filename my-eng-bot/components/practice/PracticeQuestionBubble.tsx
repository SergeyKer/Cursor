'use client'

import { useEffect, useState } from 'react'
import TypingText from '@/components/TypingText'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { practiceTypewriterSpeedForSection } from '@/lib/practice/practiceRevealTiming'
import { LESSON_HIGHLIGHT_EXACT_REGEX, LESSON_HIGHLIGHT_SPLIT_REGEX } from '@/lib/lessonHighlightPhrases'
import type { Bubble } from '@/types/lesson'

type PracticeQuestionBubbleProps = {
  bubbles: Bubble[]
  visibleSectionCount: number
  typingSectionIndex: number | null
  animateSections?: boolean
  onSectionTypewriterComplete?: (sectionIndex: number) => void
}

function normalizeTranslatePromptPunctuation(text: string): string {
  return text.replace(/(Переведите на английский:\s*"[^"\n]*")([.!?…]+)/g, '$1')
}

const unifiedSectionClassByType: Record<Bubble['type'], string> = {
  positive: 'bg-[#FFFBEB]',
  info: 'bg-[#FFFFFF]',
  task: 'bg-[#F0FDF4]',
}

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-white/95'

function splitLabel(line: string): { label: string; rest: string } | null {
  const match = /^([^:]{2,28}):\s*(.+)$/.exec(line)
  if (!match) return null
  return { label: match[1], rest: match[2] }
}

function renderHighlightedCorePhrases(text: string) {
  const parts = text.split(LESSON_HIGHLIGHT_SPLIT_REGEX)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    LESSON_HIGHLIGHT_EXACT_REGEX.test(part) ? (
      <strong key={`${part}-${index}`} className="font-semibold text-slate-700">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
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
      {marker ? (
        <span className="emoji-glyph mt-[0.15rem] inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-[12px] shadow-sm">
          {marker}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {label ? (
          <>
            <span className="font-semibold text-slate-700">{label.label}:</span> {label.rest}
          </>
        ) : (
          renderHighlightedCorePhrases(text)
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
      <div className="space-y-1.5">{body.map((line, i) => renderBodyLine(line, i))}</div>
    </div>
  )
}

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
    return renderBubbleContent(content)
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

export default function PracticeQuestionBubble({
  bubbles,
  visibleSectionCount,
  typingSectionIndex,
  animateSections = true,
  onSectionTypewriterComplete,
}: PracticeQuestionBubbleProps) {
  const cornerClass = LESSON_CARD_RADIUS_CLASS
  const visibleBubbles = bubbles.slice(0, Math.max(0, visibleSectionCount))

  if (visibleBubbles.length === 0) {
    return null
  }

  return (
    <div className={`relative w-full min-w-0 overflow-hidden ${lessonCardSurfaceClass} ${cornerClass}`}>
      {visibleBubbles.map((bubble, bubbleIndex) => {
        const isLastVisible = bubbleIndex === visibleBubbles.length - 1
        const useTypewriter =
          animateSections &&
          typingSectionIndex !== null &&
          bubbleIndex === typingSectionIndex

        return (
          <section
            key={`${bubble.type}-${bubbleIndex}`}
            className={`${useTypewriter ? 'practice-section-appear' : ''} px-3 py-2 ${unifiedSectionClassByType[bubble.type]} ${
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
            ) : (
              renderBubbleContent(bubble.content)
            )}
          </section>
        )
      })}
    </div>
  )
}
