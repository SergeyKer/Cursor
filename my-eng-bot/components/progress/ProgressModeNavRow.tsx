'use client'

type ProgressModeNavRowProps = {
  title: string
  metric?: string
  ariaLabel: string
  disabled?: boolean
  onClick?: () => void
}

export default function ProgressModeNavRow({
  title,
  metric,
  ariaLabel,
  disabled = false,
  onClick,
}: ProgressModeNavRowProps) {
  const body = (
    <div className="min-w-0 flex-1">
      <p className="break-words text-[15px] font-normal leading-[1.45] text-[var(--text)]">{title}</p>
      {metric?.trim() ? (
        <p className="break-words text-[14px] leading-snug text-[var(--text-muted)]">{metric}</p>
      ) : null}
    </div>
  )

  if (!onClick) {
    return (
      <div
        className="flex w-full min-h-[44px] min-w-0 items-center gap-3 px-4 py-2.5 text-left"
        aria-label={ariaLabel}
      >
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="flex w-full min-h-[44px] min-w-0 items-center gap-3 px-4 py-2.5 text-left touch-manipulation transition-all duration-200 [@media(hover:hover)]:hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
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
    </button>
  )
}
