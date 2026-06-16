'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Защита от «сквозного» тапа: кнопка в том же месте не срабатывает сразу после mount. */
export const MOUNT_TAP_GUARD_MS = 400

export function useMountTapGuard(
  resetKey: string | null | undefined,
  guardMs = MOUNT_TAP_GUARD_MS
): {
  isActionReady: boolean
  guardAction: (action: () => void) => void
} {
  const enabled = Boolean(resetKey)
  const readyRef = useRef(!enabled)
  const [isActionReady, setIsActionReady] = useState(!enabled)

  useEffect(() => {
    if (!enabled || !resetKey) {
      readyRef.current = true
      setIsActionReady(true)
      return
    }

    readyRef.current = false
    setIsActionReady(false)
    const timer = window.setTimeout(() => {
      readyRef.current = true
      setIsActionReady(true)
    }, guardMs)

    return () => window.clearTimeout(timer)
  }, [enabled, guardMs, resetKey])

  const guardAction = useCallback((action: () => void) => {
    if (!readyRef.current) return
    action()
  }, [])

  return { isActionReady, guardAction }
}
