'use client'

type QuickTestNoticeProps = {
  message: string | null
}

export function QuickTestNotice({ message }: QuickTestNoticeProps) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mt-2 max-w-xl rounded-lg border border-[var(--border-subtle,rgba(0,0,0,0.12))] bg-[var(--surface-card,rgba(255,255,255,0.5))] px-3 py-2 text-[13px] text-[var(--text)]"
    >
      {message}
    </div>
  )
}
