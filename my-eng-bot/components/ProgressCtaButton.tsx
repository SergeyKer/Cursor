'use client'

import type { ReactNode } from 'react'
import { APP_BTN_PRIMARY_LESSON_START } from '@/lib/homeCtaStyles'
import { LESSON_PREPARE_GHOST_LABEL } from '@/lib/lessonPrepareProgressCopy'

type ProgressCtaButtonProps = {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  progress?: number | null
  ghostLabel?: string
  className?: string
}

export default function ProgressCtaButton({
  children,
  onClick,
  disabled = false,
  busy = false,
  progress = null,
  ghostLabel = LESSON_PREPARE_GHOST_LABEL,
  className = APP_BTN_PRIMARY_LESSON_START,
}: ProgressCtaButtonProps) {
  const showProgress = busy && typeof progress === 'number'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      aria-busy={busy || undefined}
      {...(showProgress
        ? {
            role: 'progressbar',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round(progress),
          }
        : {})}
    >
      {showProgress ? (
        <span
          className={`absolute inset-y-0 left-0 bg-white/25 ${busy ? '' : 'transition-[width] duration-300 ease-out'}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          aria-hidden
        />
      ) : null}
      <span className="relative z-10 inline-grid justify-items-center whitespace-nowrap">
        <span className="invisible col-start-1 row-start-1" aria-hidden>
          {ghostLabel}
        </span>
        <span className="col-start-1 row-start-1">{children}</span>
      </span>
    </button>
  )
}
