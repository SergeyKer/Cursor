'use client'

import React from 'react'

/** Класс пузыря ассистента (как в приветствии на старте). */
export const HOME_ASSISTANT_BUBBLE_CLASS =
  'min-w-0 max-w-[min(100%,90%)] rounded-[1.2825rem] rounded-bl-md border border-[var(--chat-assistant-border)] bg-[var(--chat-assistant-shell)] px-3 py-2 text-[15px] leading-[1.45] text-[var(--text)] shadow-sm backdrop-blur-[2px]'

type HomeWallpaperBubbleFrameProps = {
  ariaLabel: string
  /** Длинный текст приветствия — внутренняя область со скроллом. */
  scrollable?: boolean
  className?: string
  children: React.ReactNode
}

export function HomeWallpaperBubbleFrame({
  ariaLabel,
  scrollable = false,
  className = '',
  children,
}: HomeWallpaperBubbleFrameProps) {
  return (
    <section className={`w-full max-w-[23.2rem] ${className}`} aria-label={ariaLabel}>
      <div className="overflow-hidden rounded-[1.15rem] border border-white/55 bg-[rgba(255,255,255,0.28)] shadow-sm backdrop-blur-[2px]">
        <div className="bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)] p-2.5 sm:p-3">
          {scrollable ? (
            <div
              className="max-h-[min(52vh,20rem)] overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] pr-0.5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex flex-col gap-2">{children}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">{children}</div>
          )}
        </div>
      </div>
    </section>
  )
}
