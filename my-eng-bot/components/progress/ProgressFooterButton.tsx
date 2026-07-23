'use client'

import {
  APP_BTN_CARD_ACTION_FOOTER,
  APP_BTN_CARD_EXPAND_FOOTER,
  APP_BTN_CARD_LAUNCH_FOOTER,
} from '@/lib/homeCtaStyles'
import type { ProgressCtaVariant } from '@/lib/progress/progressActions'

type ProgressFooterButtonProps = {
  variant: ProgressCtaVariant
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  /**
   * Launch/expand: round bottom corners of flush card strip.
   * Action: when true (card footer), add inset margin; when false (in-body list), no extra mx.
   */
  roundBottom?: boolean
}

export default function ProgressFooterButton({
  variant,
  label,
  onClick,
  disabled = false,
  ariaLabel,
  roundBottom = true,
}: ProgressFooterButtonProps) {
  if (variant === 'action') {
    // Card footer needs inset so rounded-xl does not kiss the shell edge.
    // In-body lists (zones) already have parent px-4 — skip horizontal margin.
    const inset = roundBottom ? 'mx-3 mb-3 mt-2' : 'mt-1'
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
        className={`${APP_BTN_CARD_ACTION_FOOTER} ${inset}`}
      >
        <span className="min-w-0 break-words">{label}</span>
      </button>
    )
  }

  const base = variant === 'launch' ? APP_BTN_CARD_LAUNCH_FOOTER : APP_BTN_CARD_EXPAND_FOOTER
  const round = roundBottom ? 'rounded-b-[var(--bubble-radius-assistant,1rem)]' : ''
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={`${base} ${round}`}
    >
      <span className="min-w-0 break-words">{label}</span>
    </button>
  )
}
