'use client'

import type { ReactNode } from 'react'
import type { FlowInfoCardVariant } from '@/lib/lessonMedalRevealCopy'

export type FlowInfoCardProps = {
  variant?: FlowInfoCardVariant
  icon?: ReactNode
  /** Текст справа от иконки, если нет iconBetweenCaption. */
  iconCaption?: string
  /** Текст слева и справа от иконки (иконка вместо тире между частями). */
  iconBetweenCaption?: { before: string; after: string }
  title: string
  statsLine?: string
  message?: string
  secondaryMessage?: string
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

const BRAND_LINE_TEXT_CLASS =
  'text-sm font-semibold leading-none tracking-wide text-slate-600 sm:text-base'
const BRAND_LINE_ICON_CLASS =
  'emoji-glyph inline-flex h-[1.35em] w-[1.35em] shrink-0 items-center justify-center self-center text-[1.35em] leading-none'

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
  iconCaption,
  iconBetweenCaption,
  title,
  statsLine,
  message,
  secondaryMessage,
  className = '',
}: FlowInfoCardProps) {
  return (
    <section
      className={`rounded-2xl border px-4 py-3 text-center ${SURFACE_CLASS[variant]} ${className}`.trim()}
    >
      {icon ? (
        iconBetweenCaption ? (
          <div
            className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-1.5 sm:gap-x-2"
            aria-label={`${iconBetweenCaption.before} ${iconBetweenCaption.after}`}
          >
            <span className={`${BRAND_LINE_TEXT_CLASS} text-right`}>{iconBetweenCaption.before}</span>
            <span className={`${BRAND_LINE_ICON_CLASS} justify-self-center`} aria-hidden>
              {icon}
            </span>
            <span className={`${BRAND_LINE_TEXT_CLASS} text-left`}>{iconBetweenCaption.after}</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap">
              <span className={BRAND_LINE_ICON_CLASS} aria-hidden>
                {icon}
              </span>
              {iconCaption ? <span className={BRAND_LINE_TEXT_CLASS}>{iconCaption}</span> : null}
            </div>
          </div>
        )
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
      {statsLine ? <p className="mt-1 text-sm text-slate-600">{statsLine}</p> : null}
      {message ? (
        <p className={`mt-1 text-sm font-medium ${MESSAGE_CLASS[variant]}`}>{message}</p>
      ) : null}
      {secondaryMessage ? (
        <p className="text-pretty mt-2 whitespace-pre-line text-[13px] font-medium leading-snug text-slate-700 sm:text-sm">
          {secondaryMessage}
        </p>
      ) : null}
    </section>
  )
}
