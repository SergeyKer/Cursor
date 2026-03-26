'use client'

import React from 'react'
import { splitGreetingIntoBlocks } from '@/lib/homeGreeting'

type HomeWelcomeBubbleProps = {
  /** Текст: блоки через \\n\\n — приветствие, факт, приглашение (или 2 блока в компактном режиме) */
  text: string
  className?: string
  actions?: React.ReactNode
}

const bubbleClass =
  'min-w-0 max-w-[min(100%,90%)] rounded-[1.2825rem] rounded-bl-md border border-[var(--chat-assistant-border)] bg-[var(--chat-assistant-shell)] px-3 py-2 text-[15px] leading-[1.45] text-[var(--text)] shadow-sm backdrop-blur-[2px]'

/**
 * Отдельные пузыри для каждого блока текста (полный режим: приветствие → факт → приглашение).
 */
export default function HomeWelcomeBubble({ text, className = '', actions }: HomeWelcomeBubbleProps) {
  const blocks = React.useMemo(() => splitGreetingIntoBlocks(text), [text])

  return (
    <section
      className={`w-full max-w-[23.2rem] ${className}`}
      aria-label="Приветствие MyEng"
    >
      <div className="overflow-hidden rounded-[1.15rem] border border-white/55 bg-[rgba(255,255,255,0.28)] shadow-sm backdrop-blur-[2px]">
        <div className="bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3">
          <div
            className="max-h-[min(52vh,20rem)] overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] pr-0.5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-col gap-2">
              {blocks.map((block, i) => (
                <div key={`${i}-${block.slice(0, 32)}`} className="flex justify-start">
                  <div className={bubbleClass}>
                    <p className="break-words font-normal">{block}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {actions && <div className="pt-3">{actions}</div>}
        </div>
      </div>
    </section>
  )
}
