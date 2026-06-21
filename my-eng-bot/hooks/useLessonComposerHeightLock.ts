'use client'

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
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

/** Высота по контенту, без учёта minHeight оболочки композера. */
function measureComposerContentHeight(stack: HTMLElement): number {
  const inner = stack.querySelector('.dialog-composer-dock-inner')
  if (!(inner instanceof HTMLElement)) {
    return Math.max(0, Math.round(stack.getBoundingClientRect().height))
  }

  let contentHeight = 0
  for (const child of inner.children) {
    if (!(child instanceof HTMLElement)) continue
    contentHeight = Math.max(contentHeight, child.getBoundingClientRect().height)
  }

  const stackStyle = getComputedStyle(stack)
  const paddingY =
    parseFloat(stackStyle.paddingTop || '0') + parseFloat(stackStyle.paddingBottom || '0')

  return Math.max(0, Math.round(contentHeight + paddingY))
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
  const prevTransitionKeyRef = useRef<string | null>(null)

  const measureStack = useCallback(() => {
    const stack = stackRef.current
    if (!stack) return 0
    return measureComposerContentHeight(stack)
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
      prevTransitionKeyRef.current = null
      return
    }

    const isStepTransition = transitionKey !== prevTransitionKeyRef.current
    const incoming = resolveIncomingComposerMinHeight(incomingParams)

    if (isStepTransition) {
      prevTransitionKeyRef.current = transitionKey
      setLockedMinHeight(incoming > 0 ? incoming : undefined)
      return
    }

    setLockedMinHeight((current) => {
      const next = incoming > 0 ? incoming : undefined
      if (next == null) return undefined
      if (current == null) return next
      if (next < current) {
        const stack = stackRef.current
        const contentHeight = stack ? measureComposerContentHeight(stack) : 0
        if (contentHeight > 0 && contentHeight <= next) {
          return next
        }
        return current
      }
      return Math.max(current, next)
    })
  }, [
    compact,
    containerWidthPx,
    choiceOptions,
    enabled,
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

  useLayoutEffect(() => {
    if (!enabled || lockReleased) return

    const stack = stackRef.current
    if (!stack) return

    const sync = () => {
      const measuredContent = measureStack()
      if (measuredContent <= 0) return
      const incoming = resolveIncomingComposerMinHeight(incomingParams)
      setLockedMinHeight((current) => {
        const baseline = current ?? incoming
        const next = measuredContent > baseline ? measuredContent : baseline
        return next > 0 ? next : undefined
      })
    }

    sync()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(sync)
    observer.observe(stack)
    return () => observer.disconnect()
  }, [
    compact,
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
