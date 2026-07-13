'use client'

type QuickTestProgressBarProps = {
  current: number
  total: number
  label: string
}

export function QuickTestProgressBar({ current, total, label }: QuickTestProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)))
  return (
    <div className="mx-auto w-full max-w-xl px-3 pt-3">
      <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-[var(--text-secondary,var(--text))]">
        <span>{label}</span>
        <span className="tabular-nums">
          {current}/{total}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-black/10"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[var(--text-accent,#4f8fe8)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
