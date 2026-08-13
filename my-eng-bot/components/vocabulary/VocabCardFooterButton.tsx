'use client'

import {
  VOCAB_CARD_FOOTER_ACTION,
  VOCAB_CARD_FOOTER_EXPAND,
  VOCAB_CARD_FOOTER_LAUNCH,
  VOCAB_INSET_EXPAND_BTN,
  VOCAB_INSET_EXPAND_BTN_FLUSH,
  VOCAB_INSET_LAUNCH_BTN,
  VOCAB_INSET_LAUNCH_BTN_FLUSH,
} from '@/lib/vocabulary/cardStyles'

export type VocabCardFooterVariant = 'launch' | 'expand' | 'action'
export type VocabCardFooterPlacement = 'flush' | 'inset'

type Props = {
  variant: VocabCardFooterVariant
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  roundBottom?: boolean
  /** Default flush. Action always uses the action layout (ignores placement). */
  placement?: VocabCardFooterPlacement
  /** Drop mt-3 on inset buttons (pair in a grid). */
  flushTop?: boolean
}

export default function VocabCardFooterButton({
  variant,
  label,
  onClick,
  disabled = false,
  ariaLabel,
  roundBottom = true,
  placement = 'flush',
  flushTop = false,
}: Props) {
  if (variant === 'action') {
    const actionInset = roundBottom ? 'mx-3 mb-3 mt-2 rounded-xl' : 'mt-1 rounded-xl'
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
        className={`${VOCAB_CARD_FOOTER_ACTION} ${actionInset}`}
      >
        <span className="min-w-0 break-words">{label}</span>
      </button>
    )
  }

  if (placement === 'inset') {
    const insetClass =
      variant === 'launch'
        ? flushTop
          ? VOCAB_INSET_LAUNCH_BTN_FLUSH
          : VOCAB_INSET_LAUNCH_BTN
        : flushTop
          ? VOCAB_INSET_EXPAND_BTN_FLUSH
          : VOCAB_INSET_EXPAND_BTN
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onClick={onClick}
        className={insetClass}
      >
        <span className="min-w-0 break-words">{label}</span>
      </button>
    )
  }

  const base = variant === 'launch' ? VOCAB_CARD_FOOTER_LAUNCH : VOCAB_CARD_FOOTER_EXPAND
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
