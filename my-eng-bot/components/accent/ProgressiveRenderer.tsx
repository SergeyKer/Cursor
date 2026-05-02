'use client'

interface ProgressiveRendererProps {
  lines: string[]
}

export default function ProgressiveRenderer({ lines }: ProgressiveRendererProps) {
  return (
    <ol className="space-y-2">
      {lines.map((line, index) => (
        <li
          key={`${line}-${index}`}
          className="lesson-enter rounded-xl border border-[var(--chat-section-neutral-border)] bg-white/80 px-3 py-2 text-[15px] leading-[1.45] text-[var(--text)]"
          style={{ animationDelay: `${index * 55}ms` }}
        >
          <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{index + 1}</span>
          {line}
        </li>
      ))}
    </ol>
  )
}
