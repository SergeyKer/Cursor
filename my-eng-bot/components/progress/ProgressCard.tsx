'use client'

import type { ReactNode } from 'react'
import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'

const surfaceClass =
  'chat-section-surface glass-surface border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)]'

const headerClass =
  'bg-[var(--chat-section-slate)] px-4 py-3'

const headerTitleClass =
  'break-words text-[15px] font-semibold uppercase tracking-[0.02em] text-[var(--chat-label-main)]'

type ProgressCardProps = {
  title: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  /** Warning tint for streak-at-risk status card shell. */
  tone?: 'default' | 'warning'
}

export default function ProgressCard({
  title,
  children,
  footer,
  className = '',
  tone = 'default',
}: ProgressCardProps) {
  const toneBorder =
    tone === 'warning'
      ? 'border-[var(--status-warning-border)]'
      : 'border-[var(--chat-section-neutral-border)]'
  return (
    <section className={`${surfaceClass} ${LESSON_CARD_RADIUS_CLASS} overflow-hidden ${toneBorder} ${className}`}>
      <div className={headerClass}>
        <p className={headerTitleClass}>{title}</p>
      </div>
      {children != null ? (
        <div className="space-y-1.5 border-t border-[var(--chat-section-neutral-border)] bg-white px-4 py-2.5">
          {children}
        </div>
      ) : null}
      {footer != null ? (
        <div className="border-t border-[var(--chat-section-neutral-border)] bg-white">{footer}</div>
      ) : null}
    </section>
  )
}
