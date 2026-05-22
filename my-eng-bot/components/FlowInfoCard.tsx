'use client'

import type { ReactNode } from 'react'
import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'

export type FlowInfoCardProps = {
  variant?: FlowInfoCardVariant
  icon?: ReactNode
  title: string
  statsLine?: string
  message?: string
  className?: string
}

const SURFACE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]',
  silver: 'border-[var(--chat-section-slate-border)] bg-[var(--chat-section-slate)]',
  bronze: 'border-[var(--status-warning-border)] bg-[var(--chat-control-active-bg)]',
  neutral: 'border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)]',
  info: 'border-[var(--chat-section-amber-border)] bg-[var(--chat-section-amber)]',
  praise: 'border-[var(--chat-section-praise-border)] bg-[var(--chat-section-praise)]',
}

const MESSAGE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'text-[var(--status-warning-text)]',
  silver: 'text-[var(--chat-label-slate)]',
  bronze: 'text-[var(--chat-control-active-text)]',
  neutral: 'text-[var(--chat-label-neutral)]',
  info: 'text-[var(--chat-label-main)]',
  praise: 'text-[var(--chat-label-praise)]',
}

export default function FlowInfoCard({
  variant = 'neutral',
  icon,
  title,
  statsLine,
  message,
  className = '',
}: FlowInfoCardProps) {
  return (
    <section
      className={`rounded-2xl border px-4 py-3 text-center ${SURFACE_CLASS[variant]} ${className}`.trim()}
    >
      {icon ? (
        <p className="emoji-glyph text-2xl leading-none" aria-hidden>
          {icon}
        </p>
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      {statsLine ? <p className="mt-1 text-sm text-slate-600">{statsLine}</p> : null}
      {message ? (
        <p className={`mt-1 text-sm font-medium ${MESSAGE_CLASS[variant]}`}>{message}</p>
      ) : null}
    </section>
  )
}
