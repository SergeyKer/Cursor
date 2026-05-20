'use client'

import * as React from 'react'

const FULL_BLEED_THRESHOLD_PX = 16

export type AppColumnBounds = {
  left: number
  width: number
  isFullBleed: boolean
}

function measureBounds(element: HTMLElement): AppColumnBounds {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  return {
    left: rect.left,
    width: rect.width,
    isFullBleed: rect.width >= viewportWidth - FULL_BLEED_THRESHOLD_PX,
  }
}

export function useAppColumnBounds(
  columnRef: React.RefObject<HTMLElement | null>,
  options?: { remeasureWhen?: boolean }
): AppColumnBounds | null {
  const [bounds, setBounds] = React.useState<AppColumnBounds | null>(null)
  const remeasureWhen = options?.remeasureWhen

  const updateBounds = React.useCallback(() => {
    const el = columnRef.current
    if (!el) {
      setBounds(null)
      return
    }
    setBounds(measureBounds(el))
  }, [columnRef])

  React.useLayoutEffect(() => {
    updateBounds()
  }, [updateBounds, remeasureWhen])

  React.useEffect(() => {
    const el = columnRef.current
    if (!el) return

    const observer = new ResizeObserver(() => updateBounds())
    observer.observe(el)

    window.addEventListener('resize', updateBounds)
    window.addEventListener('scroll', updateBounds, true)

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', updateBounds)
    viewport?.addEventListener('scroll', updateBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBounds)
      window.removeEventListener('scroll', updateBounds, true)
      viewport?.removeEventListener('resize', updateBounds)
      viewport?.removeEventListener('scroll', updateBounds)
      setBounds(null)
    }
  }, [columnRef, updateBounds])

  return bounds
}
