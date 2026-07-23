'use client'

type ProgressNavRowProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
}

export default function ProgressNavRow({
  label,
  onClick,
  disabled = false,
  ariaLabel,
}: ProgressNavRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className="flex w-full min-h-[48px] min-w-0 items-center justify-between gap-2 px-4 py-2.5 text-left touch-manipulation disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-inset"
    >
      <span className="min-w-0 flex-1 line-clamp-2 break-words text-[15px] font-medium leading-snug text-[var(--text)]">
        {label}
      </span>
      <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
        →
      </span>
    </button>
  )
}
