'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  estimateLessonComposerMinHeight,
  type LessonComposerPanelKind,
} from '@/lib/lessonComposerLayout'

type UseLessonComposerHeightLockParams = {
  stackRef: RefObject<HTMLElement | null>
  transitionKey: string | null
  panelKind: LessonComposerPanelKind
  optionCount: number
  compact: boolean
  /** Только шаги с чипами: не трогаем text/puzzle/translate композер. */
  enabled: boolean
  lockReleased: boolean
}

export function useLessonComposerHeightLock({
  stackRef,
  transitionKey,
  panelKind,
  optionCount,
  compact,
  enabled,
  lockReleased,
}: UseLessonComposerHeightLockParams): number | undefined {
  const [lockedMinHeight, setLockedMinHeight] = useState<number | undefined>(undefined)
  const lastOutgoingHeightRef = useRef(0)
  const prevTransitionKeyRef = useRef<string | null>(null)

  const measureStack = useCallback(() => {
    const stack = stackRef.current
    if (!stack) return 0
    return Math.max(0, Math.round(stack.getBoundingClientRect().height))
  }, [stackRef])

  useLayoutEffect(() => {
    if (!enabled) {
      setLockedMinHeight(undefined)
      lastOutgoingHeightRef.current = 0
      prevTransitionKeyRef.current = null
      return
    }

    if (transitionKey === prevTransitionKeyRef.current) return

    const outgoing = measureStack()
    if (outgoing > 0) {
      lastOutgoingHeightRef.current = outgoing
    }
    prevTransitionKeyRef.current = transitionKey

    const incoming = estimateLessonComposerMinHeight({
      panelKind,
      optionCount,
      compact,
    })
    const nextLock = Math.max(lastOutgoingHeightRef.current, incoming)
    setLockedMinHeight(nextLock > 0 ? nextLock : undefined)
  }, [compact, enabled, measureStack, optionCount, panelKind, transitionKey])

  useLayoutEffect(() => {
    if (!enabled || lockReleased) {
      setLockedMinHeight(undefined)
    }
  }, [enabled, lockReleased])

  useEffect(() => {
    if (!enabled || lockReleased) return

    const stack = stackRef.current
    if (!stack || typeof ResizeObserver === 'undefined') return

    const sync = () => {
      const measured = measureStack()
      if (measured <= 0) return
      setLockedMinHeight((current) => {
        const next = Math.max(current ?? 0, measured, lastOutgoingHeightRef.current)
        return next > 0 ? next : undefined
      })
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(stack)
    return () => observer.disconnect()
  }, [enabled, lockReleased, measureStack, optionCount, panelKind, stackRef, transitionKey])

  return !enabled || lockReleased ? undefined : lockedMinHeight
}
