'use client'

import { LESSON_CARD_RADIUS_CLASS } from '@/components/chat/ChatBubble'
import { TUTOR_CHAT_COPY } from '@/lib/uiCopy/tutorChat'

export type TutorIdleExampleItem = {
  id: string
  questionRu: string
}

export type TutorIdleMenuProps = {
  examples: TutorIdleExampleItem[]
  onExampleSelect: (item: TutorIdleExampleItem) => void
}

/** Same touch/overflow helpers as menu lesson lists (MenuSectionPanels lessonMenuInnerScrollClass). */
const TUTOR_IDLE_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

const IDLE_CARD_SURFACE = `shrink-0 chat-section-surface glass-surface overflow-hidden border border-[var(--chat-section-neutral-border)] bg-white ${LESSON_CARD_RADIUS_CLASS}`

/**
 * First-screen menu content for tutor (not a chat thread).
 */
export default function TutorIdleMenu({ examples, onExampleSelect }: TutorIdleMenuProps) {
  return (
    <div
      className={`flex flex-col gap-2 px-1 pt-1 pb-2 ${TUTOR_IDLE_SCROLL_CLASS}`}
      data-testid="tutor-idle-menu"
    >
      <div className={`${IDLE_CARD_SURFACE} px-3 py-2`}>
        <ul className="m-0 list-none space-y-1 p-0">
          {TUTOR_CHAT_COPY.idleBullets.map((line) => (
            <li key={line} className="text-[15px] leading-snug text-[var(--text)]">
              <span className="text-[var(--text-muted)]" aria-hidden="true">
                -{' '}
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <section className={IDLE_CARD_SURFACE}>
        <div className="px-3 py-2">
          <p className="m-0 text-[15px] font-semibold text-[var(--chat-label-main)]">
            {TUTOR_CHAT_COPY.idleExamplesHeading}
          </p>
        </div>
        <div className="border-t border-[var(--chat-section-card-divider)] px-3 py-2">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {examples.map((example) => (
              <li key={example.id}>
                <button
                  type="button"
                  onClick={() => onExampleSelect(example)}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-[15px] leading-snug text-blue-700 touch-manipulation transition-all duration-200 [@media(hover:hover)]:hover:bg-blue-100 active:opacity-90"
                >
                  {example.questionRu}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
