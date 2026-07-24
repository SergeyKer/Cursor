'use client'

import type { ReactNode } from 'react'

type DialogGlassScrollHostProps = {
  children: ReactNode
  className?: string
  /** When false, keep feed color gradient but skip chat pattern PNG. Default true. */
  showChatWallpaper?: boolean
}

const FEED_PLAIN_GRADIENT_CLASS =
  'bg-[linear-gradient(180deg,var(--chat-message-wallpaper)_0%,var(--chat-message-wallpaper-soft)_100%)]'

export function DialogGlassScrollHost({
  children,
  className = '',
  showChatWallpaper = true,
}: DialogGlassScrollHostProps) {
  return (
    <div className={`dialog-glass-scroll-host relative flex min-h-0 flex-1 flex-col ${className}`.trim()}>
      <div
        className={
          showChatWallpaper
            ? 'chat-feed-wallpaper chat-feed-wallpaper-backdrop'
            : `chat-feed-wallpaper-backdrop ${FEED_PLAIN_GRADIENT_CLASS}`
        }
        aria-hidden
      />
      {children}
    </div>
  )
}
