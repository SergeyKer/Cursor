'use client'

import type { CSSProperties, ReactNode } from 'react'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'

const lessonCardSurfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]'

const readingHeaderClass = 'bg-[var(--chat-section-amber)] px-4 py-2'

const readingHeaderTitleClass =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

const readingBodyBaseClass =
  'border-t border-[var(--chat-section-neutral-border)] bg-white px-4 py-3'

type ReadingDetachedCardProps = {
  label: string
  children?: ReactNode
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean | 'true' | 'false'
  /** Extra classes on the white body (e.g. `space-y-1.5` for reading lines). */
  bodyClassName?: string
}

export default function ReadingDetachedCard({
  label,
  children,
  className = '',
  style,
  'aria-hidden': ariaHidden,
  bodyClassName = '',
}: ReadingDetachedCardProps) {
  return (
    <section
      aria-hidden={ariaHidden}
      className={`${lessonCardSurfaceClass} overflow-hidden ${LESSON_CARD_RADIUS_CLASS} ${className}`.trim()}
      style={style}
    >
      <div className={readingHeaderClass}>
        <p className={readingHeaderTitleClass}>{label}</p>
      </div>
      {children != null ? (
        <div className={`${readingBodyBaseClass} ${bodyClassName}`.trim()}>{children}</div>
      ) : null}
    </section>
  )
}
