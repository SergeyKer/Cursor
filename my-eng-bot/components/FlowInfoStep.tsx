'use client'

import FlowInfoCard, { type FlowInfoCardProps } from '@/components/FlowInfoCard'
import { APP_BTN_PRIMARY_LARGE } from '@/lib/homeCtaStyles'

export type FlowInfoStepProps = FlowInfoCardProps & {
  actionLabel?: string
  onAction: () => void
  ariaLabel?: string
  cardClassName?: string
  /** Класс анимации только карточки. Кнопка остаётся на месте. */
  enterClassName?: string
}

export default function FlowInfoStep({
  actionLabel = 'Далее',
  onAction,
  ariaLabel = 'Информационный шаг',
  cardClassName = 'mb-0 shadow-md',
  enterClassName = 'animate-fade-in-up',
  className: _unusedClassName,
  ...cardProps
}: FlowInfoStepProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col gap-2.5"
      role="region"
      aria-label={ariaLabel}
    >
      <div className={enterClassName}>
        <FlowInfoCard {...cardProps} className={cardClassName} />
      </div>
      <button
        type="button"
        onClick={onAction}
        className={`${APP_BTN_PRIMARY_LARGE} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]`}
      >
        {actionLabel}
      </button>
    </div>
  )
}
