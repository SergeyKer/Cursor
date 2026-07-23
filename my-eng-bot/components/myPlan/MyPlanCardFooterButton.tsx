'use client'

import {
  MY_PLAN_CARD_FOOTER_ACTION,
  MY_PLAN_CARD_FOOTER_LAUNCH,
} from '@/lib/myPlan/cardStyles'

type MyPlanCardFooterButtonProps = {
  variant: 'launch' | 'action'
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
}

/** Visual parity with Progress footer; styles from lib/myPlan/cardStyles only. */
export default function MyPlanCardFooterButton({
  variant,
  label,
  onClick,
  disabled = false,
  ariaLabel,
}: MyPlanCardFooterButtonProps) {
  const className = variant === 'launch' ? MY_PLAN_CARD_FOOTER_LAUNCH : MY_PLAN_CARD_FOOTER_ACTION
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={className}
    >
      <span className="min-w-0 break-words">{label}</span>
    </button>
  )
}
