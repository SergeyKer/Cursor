'use client'

import type { ReactNode } from 'react'

type DialogGlassScrollHostProps = {
  children: ReactNode
  className?: string
}

export function DialogGlassScrollHost({ children, className = '' }: DialogGlassScrollHostProps) {
  return (
    <div className={`dialog-glass-scroll-host relative flex min-h-0 flex-1 flex-col ${className}`.trim()}>
      <div className="chat-feed-wallpaper chat-feed-wallpaper-backdrop" aria-hidden />
      {children}
    </div>
  )
}
