'use client'

import type { ReactNode } from 'react'
import { VOCAB_CARD_SURFACE, VOCAB_NAV_TITLE, VOCAB_TAP_INTERACTION } from '@/lib/ui/navCardStyles'

export function HubNavStack({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2">{children}</div>
}

export default function HubNavCard({
  title,
  ariaLabel,
  onClick,
  children,
  disabled = false,
}: {
  title: string
  ariaLabel: string
  onClick?: () => void
  children?: ReactNode
  disabled?: boolean
}) {
  const padClass = children ? 'pl-6 pr-4 py-2.5' : 'px-4 py-2.5'
  const tapClass = disabled ? 'cursor-not-allowed opacity-60' : VOCAB_TAP_INTERACTION
  return (
    <button
      type="button"
      className={`${VOCAB_CARD_SURFACE} ${tapClass} flex w-full min-w-0 items-center gap-3 ${padClass} text-left`}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={VOCAB_NAV_TITLE}>{title}</p>
        {children}
      </div>
      {disabled ? null : (
        <span
          className="pointer-events-none inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)]"
          aria-hidden
        >
          <svg className="h-full w-full rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M6 14.5 12 8.5l6 6"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
