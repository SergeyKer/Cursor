'use client'

type LessonRunBannerProps = {
  text: string
}

export default function LessonRunBanner({ text }: LessonRunBannerProps) {
  const line = text.trim()
  if (!line) return null

  return (
    <div
      className="shrink-0 border-b border-[var(--chat-shell-border)] bg-[var(--chat-shell-bg)] px-2.5 py-2 sm:px-3"
      role="status"
      aria-live="polite"
    >
      <p className="truncate text-[13px] font-medium leading-snug text-[var(--chat-shell-text)]" title={line}>
        {line}
      </p>
    </div>
  )
}
