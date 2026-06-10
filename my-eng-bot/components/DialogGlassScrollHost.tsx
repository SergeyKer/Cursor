'use client'

import type { ReactNode } from 'react'

type DialogGlassScrollHostProps = {
  children: ReactNode
  className?: string
}

export function DialogGlassScrollHost({ children, className = '' }: DialogGlassScrollHostProps) {
  return (
    <div className={`dialog-glass-scroll-host relative min-h-0 flex-1 ${className}`.trim()}>
      {children}
    </div>
  )
}
