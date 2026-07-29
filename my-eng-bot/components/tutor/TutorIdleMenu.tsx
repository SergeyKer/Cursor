'use client'

import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorIdleMenuProps = {
  examples: string[]
  onExampleSelect: (text: string) => void
}

/**
 * First-screen menu content for tutor (not a chat thread).
 */
export default function TutorIdleMenu({ examples, onExampleSelect }: TutorIdleMenuProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1" data-testid="tutor-idle-menu">
      <ul className="m-0 list-none space-y-2 p-0">
        {TUTOR_CHAT_COPY.idleBullets.map((line) => (
          <li key={line} className="text-[15px] leading-[1.45] text-[var(--text)]">
            <span className="text-[var(--text-muted)]" aria-hidden="true">
              -{' '}
            </span>
            {line}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-[13px] font-medium leading-snug text-[var(--text-muted)]">
          {TUTOR_CHAT_COPY.idleExamplesHeading}
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onExampleSelect(example)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5 text-left text-[14px] leading-snug text-[var(--text)] shadow-[0_1px_4px_rgba(0,0,0,0.07)] transition-opacity hover:opacity-90 active:opacity-80"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
