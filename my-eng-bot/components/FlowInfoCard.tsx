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
  firstTryLine?: string
  message?: string
  profileLine?: string
  secondaryMessage?: string
  /** Иконка сразу после title в одной строке (экономит высоту). */
  iconAfterTitle?: boolean
  className?: string
}

const MEDAL_VARIANTS = new Set<FlowInfoCardVariant>(['gold', 'silver', 'bronze'])

const MEDAL_REWARD_CLASS: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'medal-reward-card medal-reward-card--gold',
  silver: 'medal-reward-card medal-reward-card--silver',
  bronze: 'medal-reward-card medal-reward-card--bronze',
}

const SURFACE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: MEDAL_REWARD_CLASS.gold,
  silver: MEDAL_REWARD_CLASS.silver,
  bronze: MEDAL_REWARD_CLASS.bronze,
  neutral: 'rounded-2xl border border-[var(--chat-section-neutral-border)] bg-[var(--chat-section-neutral)]',
  info: 'rounded-2xl border border-[var(--chat-section-amber-border)] bg-[var(--chat-section-amber)]',
  praise: 'rounded-2xl border border-[var(--chat-section-praise-border)] bg-[var(--chat-section-praise)]',
}

const TITLE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'text-[var(--medal-gold-text)]',
  silver: 'text-[var(--medal-silver-text)]',
  bronze: 'text-[var(--medal-bronze-text)]',
  neutral: 'text-slate-900',
  info: 'text-slate-900',
  praise: 'text-slate-900',
}

const STATS_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'text-[var(--medal-gold-text-muted)]',
  silver: 'text-[var(--medal-silver-text-muted)]',
  bronze: 'text-[var(--medal-bronze-text-muted)]',
  neutral: 'text-slate-600',
  info: 'text-slate-600',
  praise: 'text-slate-600',
}

const MESSAGE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'text-[var(--medal-gold-message)]',
  silver: 'text-[var(--medal-silver-message)]',
  bronze: 'text-[var(--medal-bronze-message)]',
  neutral: 'text-[var(--chat-label-neutral)]',
  info: 'text-[var(--chat-label-main)]',
  praise: 'text-[var(--chat-label-praise)]',
}

const SECONDARY_MESSAGE_CLASS: Record<FlowInfoCardVariant, string> = {
  gold: 'text-[var(--medal-gold-text-muted)]',
  silver: 'text-[var(--medal-silver-text-muted)]',
  bronze: 'text-[var(--medal-bronze-text-muted)]',
  neutral: 'text-slate-700',
  info: 'text-slate-700',
  praise: 'text-slate-700',
}

const BRAND_LINE_TEXT_CLASS =
  'text-sm font-semibold leading-none tracking-wide text-slate-600 sm:text-base'
const BRAND_LINE_ICON_CLASS =
  'emoji-glyph inline-flex h-[1.35em] w-[1.35em] shrink-0 items-center justify-center self-center text-[1.35em] leading-none'

export default function FlowInfoCard({
  variant = 'neutral',
  icon,
  iconCaption,
  iconBetweenCaption,
  title,
  statsLine,
  firstTryLine,
  message,
  profileLine,
  secondaryMessage,
  iconAfterTitle = false,
  className = '',
}: FlowInfoCardProps) {
  const isMedal = MEDAL_VARIANTS.has(variant)
  const showMedalIconAbove = isMedal && Boolean(icon)
  const showIconAbove = Boolean(icon) && !iconAfterTitle && !showMedalIconAbove

  return (
    <section
      className={`text-center ${isMedal ? 'px-4' : 'rounded-2xl px-4 py-3'} ${SURFACE_CLASS[variant]} ${className}`.trim()}
    >
      {showMedalIconAbove ? (
        <div className="medal-reward-card__icon emoji-glyph" aria-hidden>
          {icon}
        </div>
      ) : null}
      {showIconAbove ? (
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
      <h3
        className={`font-semibold ${isMedal ? 'text-lg' : 'text-base'} ${TITLE_CLASS[variant]} ${
          showIconAbove || showMedalIconAbove ? 'mt-1' : 'mt-0'
        } ${!isMedal && iconAfterTitle && icon ? 'inline-flex items-center justify-center gap-1' : ''}`}
      >
        <span>{title}</span>
        {!isMedal && iconAfterTitle && icon ? (
          <span className={BRAND_LINE_ICON_CLASS} aria-hidden>
            {icon}
          </span>
        ) : null}
      </h3>
      {statsLine ? <p className={`mt-1 text-sm ${STATS_CLASS[variant]}`}>{statsLine}</p> : null}
      {firstTryLine ? (
        <p className={`mt-1 text-sm font-medium ${MESSAGE_CLASS[variant]}`}>{firstTryLine}</p>
      ) : null}
      {message ? (
        <p className={`mt-1 text-sm font-medium ${MESSAGE_CLASS[variant]}`}>{message}</p>
      ) : null}
      {profileLine ? (
        <p className={`mt-1 text-sm ${SECONDARY_MESSAGE_CLASS[variant]}`}>{profileLine}</p>
      ) : null}
      {secondaryMessage ? (
        <p
          className={`text-pretty mt-2 whitespace-pre-line text-[13px] font-medium leading-snug sm:text-sm ${SECONDARY_MESSAGE_CLASS[variant]}`}
        >
          {secondaryMessage}
        </p>
      ) : null}
    </section>
  )
}
