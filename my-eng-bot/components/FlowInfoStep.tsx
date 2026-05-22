'use client'

import FlowInfoCard, { type FlowInfoCardProps } from '@/components/FlowInfoCard'

export type FlowInfoStepProps = FlowInfoCardProps & {
  actionLabel?: string
  onAction: () => void
  ariaLabel?: string
  cardClassName?: string
}

export default function FlowInfoStep({
  actionLabel = 'Далее',
  onAction,
  ariaLabel = 'Информационный шаг',
  cardClassName = 'mb-0 shadow-md',
  className: _unusedClassName,
  ...cardProps
}: FlowInfoStepProps) {
  return (
    <div
      className="animate-fade-in-up mx-auto flex w-full max-w-sm flex-col gap-2.5"
      role="region"
      aria-label={ariaLabel}
    >
      <FlowInfoCard {...cardProps} className={cardClassName} />
      <button
        type="button"
        onClick={onAction}
        className="w-full rounded-xl border border-blue-500 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {actionLabel}
      </button>
    </div>
  )
}
