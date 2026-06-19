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
  choiceOptions?: string[]
  containerWidthPx?: number
  puzzleWords?: string[]
  puzzleHasInstruction?: boolean
  compact: boolean
  /** Только шаги с чипами: не трогаем text/puzzle/translate композер. */
  enabled: boolean
  lockReleased: boolean
}

function resolveIncomingComposerMinHeight(params: {
  panelKind: LessonComposerPanelKind
  optionCount: number
  choiceOptions?: string[]
  containerWidthPx?: number
  puzzleWords?: string[]
  puzzleHasInstruction?: boolean
  compact: boolean
}): number {
  return estimateLessonComposerMinHeight({
    panelKind: params.panelKind,
    optionCount: params.optionCount,
    choiceOptions: params.choiceOptions,
    containerWidthPx: params.containerWidthPx,
    puzzleWords: params.puzzleWords,
    puzzleHasInstruction: params.puzzleHasInstruction,
    compact: params.compact,
  })
}

export function useLessonComposerHeightLock({
  stackRef,
  transitionKey,
  panelKind,
  optionCount,
  choiceOptions,
  containerWidthPx,
  puzzleWords,
  puzzleHasInstruction,
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

  const incomingParams = {
    panelKind,
    optionCount,
    choiceOptions,
    containerWidthPx,
    puzzleWords,
    puzzleHasInstruction,
    compact,
  }

  useLayoutEffect(() => {
    if (!enabled) {
      setLockedMinHeight(undefined)
      lastOutgoingHeightRef.current = 0
      prevTransitionKeyRef.current = null
      return
    }

    const isStepTransition = transitionKey !== prevTransitionKeyRef.current

    if (isStepTransition) {
      const outgoing = measureStack()
      if (outgoing > 0) {
        lastOutgoingHeightRef.current = outgoing
      }
      prevTransitionKeyRef.current = transitionKey
    }

    const incoming = resolveIncomingComposerMinHeight(incomingParams)
    const nextLock = Math.max(lastOutgoingHeightRef.current, incoming)
    setLockedMinHeight((current) => {
      const next = nextLock > 0 ? nextLock : undefined
      if (next == null) return undefined
      if (current == null) return next
      return Math.max(current, next)
    })
  }, [
    compact,
    containerWidthPx,
    choiceOptions,
    enabled,
    measureStack,
    optionCount,
    panelKind,
    puzzleHasInstruction,
    puzzleWords,
    transitionKey,
  ])

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
  }, [
    enabled,
    lockReleased,
    measureStack,
    optionCount,
    choiceOptions,
    containerWidthPx,
    panelKind,
    puzzleHasInstruction,
    puzzleWords,
    stackRef,
    transitionKey,
  ])

  return !enabled || lockReleased ? undefined : lockedMinHeight
}
