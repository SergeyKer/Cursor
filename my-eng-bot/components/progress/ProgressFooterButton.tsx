'use client'

import {
  APP_BTN_CARD_ACTION_FOOTER,
  APP_BTN_CARD_LAUNCH_FOOTER,
} from '@/lib/homeCtaStyles'
import type { ProgressCtaVariant } from '@/lib/progress/progressActions'

type ProgressFooterButtonProps = {
  variant: ProgressCtaVariant
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  /** Bottom corners of the card shell. */
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
  const base = variant === 'launch' ? APP_BTN_CARD_LAUNCH_FOOTER : APP_BTN_CARD_ACTION_FOOTER
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
