'use client'

import { useCallback, useEffect, useRef, useState, type AnimationEventHandler } from 'react'
import {
  LESSON_BRIEFING_ACTIONS_PAUSE_MS,
  LESSON_BRIEFING_CARD_PAUSE_MS,
  LESSON_BRIEFING_COMPOSER_REVEAL_MS,
  LESSON_TEXT_FADE_MS,
} from '@/lib/lessonRevealTiming'

type BriefingComposerPhase = 'bubble' | 'pause' | 'card' | 'ctaPause' | 'done'

export type UseBriefingComposerEnterParams = {
  resetKey: string
  prefersReducedMotion: boolean
  /** Inline briefing без lesson-enter на пузыре — сразу fade карточки. */
  skipBubbleWait?: boolean
}

export type UseBriefingComposerEnterResult = {
  cardEnterClassName: string
  actionsReady: boolean
  onBubbleAnimationEnd: AnimationEventHandler<HTMLDivElement>
  onCardAnimationEnd: AnimationEventHandler<HTMLDivElement>
}

function resolveCardClassName(phase: BriefingComposerPhase): string {
  if (phase === 'card') return 'lesson-text-soft-enter'
  if (phase === 'bubble' || phase === 'pause') return 'opacity-0'
  return ''
}

export function resolveBriefingCardEnterClassName(
  phase: BriefingComposerPhase,
  prefersReducedMotion: boolean
): string {
  if (prefersReducedMotion) return ''
  return resolveCardClassName(phase)
}

export function isBriefingComposerActionsReady(phase: BriefingComposerPhase): boolean {
  return phase === 'done'
}

export function useBriefingComposerEnter({
  resetKey,
  prefersReducedMotion,
  skipBubbleWait = false,
}: UseBriefingComposerEnterParams): UseBriefingComposerEnterResult {
  const [phase, setPhase] = useState<BriefingComposerPhase>(() =>
    prefersReducedMotion ? 'done' : skipBubbleWait ? 'card' : 'bubble'
  )
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (pauseTimerRef.current != null) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
    if (cardTimerRef.current != null) {
      clearTimeout(cardTimerRef.current)
      cardTimerRef.current = null
    }
    if (chainTimerRef.current != null) {
      clearTimeout(chainTimerRef.current)
      chainTimerRef.current = null
    }
  }, [])

  const markDone = useCallback(() => {
    clearTimers()
    setPhase('done')
  }, [clearTimers])

  const startCtaPausePhase = useCallback(() => {
    clearTimers()
    setPhase('ctaPause')
    pauseTimerRef.current = setTimeout(() => {
      pauseTimerRef.current = null
      markDone()
    }, LESSON_BRIEFING_ACTIONS_PAUSE_MS)
  }, [clearTimers, markDone])

  const startCardPhase = useCallback(() => {
    clearTimers()
    setPhase('card')
    cardTimerRef.current = setTimeout(() => {
      cardTimerRef.current = null
      startCtaPausePhase()
    }, LESSON_TEXT_FADE_MS)
  }, [clearTimers, startCtaPausePhase])

  const startPausePhase = useCallback(() => {
    clearTimers()
    setPhase('pause')
    pauseTimerRef.current = setTimeout(() => {
      pauseTimerRef.current = null
      startCardPhase()
    }, LESSON_BRIEFING_CARD_PAUSE_MS)
  }, [clearTimers, startCardPhase])

  useEffect(() => {
    clearTimers()

    if (prefersReducedMotion) {
      setPhase('done')
      return
    }

    if (skipBubbleWait) {
      setPhase('card')
      cardTimerRef.current = setTimeout(() => {
        cardTimerRef.current = null
        startCtaPausePhase()
      }, LESSON_TEXT_FADE_MS)
      return clearTimers
    }

    setPhase('bubble')
    chainTimerRef.current = setTimeout(() => {
      chainTimerRef.current = null
      markDone()
    }, LESSON_BRIEFING_COMPOSER_REVEAL_MS)

    return clearTimers
  }, [resetKey, prefersReducedMotion, skipBubbleWait, clearTimers, markDone, startCtaPausePhase])

  const onBubbleAnimationEnd = useCallback<AnimationEventHandler<HTMLDivElement>>(
    (event) => {
      if (prefersReducedMotion || skipBubbleWait) return
      if (event.animationName !== 'lessonSlideIn') return
      startPausePhase()
    },
    [prefersReducedMotion, skipBubbleWait, startPausePhase]
  )

  const onCardAnimationEnd = useCallback<AnimationEventHandler<HTMLDivElement>>(
    (event) => {
      if (prefersReducedMotion) return
      if (event.animationName !== 'lessonTextSoftIn') return
      startCtaPausePhase()
    },
    [prefersReducedMotion, startCtaPausePhase]
  )

  const actionsReady = isBriefingComposerActionsReady(phase)
  const cardEnterClassName = resolveBriefingCardEnterClassName(phase, prefersReducedMotion)

  return {
    cardEnterClassName,
    actionsReady,
    onBubbleAnimationEnd,
    onCardAnimationEnd,
  }
}
