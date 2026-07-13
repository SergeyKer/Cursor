'use client'

import { useEffect } from 'react'
import { applyThemeToDocument, readStoredTheme } from '@/lib/theme'

/** Force Bubble2 for /test without writing myeng_theme; restore on leave. */
export function QuickTestThemeGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyThemeToDocument('bubble2')
    return () => {
      applyThemeToDocument(readStoredTheme())
    }
  }, [])

  return <>{children}</>
}
