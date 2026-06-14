'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  LESSON_TEXT_FADE_MS,
  resolveLessonSectionRevealPauseMs,
} from '@/lib/lessonRevealTiming'
import {
  isPracticeQuestionRevealed,
  markPracticeQuestionRevealed,
} from '@/lib/practice/practiceRevealStorage'

type LessonRevealPhase = 'shell' | 'text' | 'done'

type UseLessonSectionRevealParams = {
  sessionId: string
  revealKey: string | null
  enabled: boolean
  sectionCount: number
  prefersReducedMotion?: boolean
  /** Индекс секции, перед которой нужна удлинённая пауза (например task). */
  extraPauseBeforeIndex?: number
  extraPauseMs?: number
}

type UseLessonSectionRevealResult = {
  isShellEnterActive: boolean
  isTextRevealActive: boolean
  textRevealedThroughIndex: number
  textAnimatingIndex: number | null
  isRevealInProgress: boolean
  /** false на кадр после смены revealKey — пока layout-effect не инициализировал сессию. */
  isRevealInitializedForKey: boolean
  onShellScrollComplete: () => void
  onTextSectionRevealComplete: (sectionIndex: number) => void
}

function createDoneState(sectionCount: number) {
  return {
    revealPhase: 'done' as LessonRevealPhase,
    textRevealedThroughIndex: Math.max(-1, sectionCount - 1),
    textAnimatingIndex: null as number | null,
  }
}

function createShellStartState() {
  return {
    revealPhase: 'shell' as LessonRevealPhase,
    textRevealedThroughIndex: -1,
    textAnimatingIndex: null as number | null,
  }
}

export function getRevealPauseAfterSectionComplete(
  completedSectionIndex: number,
  options?: Pick<UseLessonSectionRevealParams, 'extraPauseBeforeIndex' | 'extraPauseMs'>
): number {
  return resolveLessonSectionRevealPauseMs({
    completedSectionIndex,
    extraPauseBeforeIndex: options?.extraPauseBeforeIndex,
    extraPauseMs: options?.extraPauseMs,
  })
}

export function useLessonSectionReveal({
  sessionId,
  revealKey,
  enabled,
  sectionCount,
  prefersReducedMotion = false,
  extraPauseBeforeIndex,
  extraPauseMs,
}: UseLessonSectionRevealParams): UseLessonSectionRevealResult {
  const [revealPhase, setRevealPhase] = useState<LessonRevealPhase>('done')
  const [textRevealedThroughIndex, setTextRevealedThroughIndex] = useState(-1)
  const [textAnimatingIndex, setTextAnimatingIndex] = useState<number | null>(null)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionRef = useRef(0)
  const completingIndexRef = useRef<number | null>(null)
  const initializedRevealKeyRef = useRef<string | null>(null)
  const revealPhaseRef = useRef(revealPhase)

  revealPhaseRef.current = revealPhase

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }, [])

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  const finishReveal = useCallback(() => {
    if (revealKey) {
      markPracticeQuestionRevealed(sessionId, revealKey)
    }
    const done = createDoneState(sectionCount)
    setRevealPhase(done.revealPhase)
    setTextRevealedThroughIndex(done.textRevealedThroughIndex)
    setTextAnimatingIndex(done.textAnimatingIndex)
    completingIndexRef.current = null
  }, [revealKey, sectionCount, sessionId])

  const beginTextReveal = useCallback(() => {
    if (revealPhaseRef.current !== 'shell') return
    setRevealPhase('text')
    setTextAnimatingIndex(0)
  }, [])

  useLayoutEffect(() => {
    const session = sessionRef.current + 1
    sessionRef.current = session
    clearPauseTimer()
    clearFallbackTimer()
    completingIndexRef.current = null

    if (!enabled || !revealKey || sectionCount <= 0) {
      const done = createDoneState(sectionCount)
      setRevealPhase(done.revealPhase)
      setTextRevealedThroughIndex(done.textRevealedThroughIndex)
      setTextAnimatingIndex(done.textAnimatingIndex)
      initializedRevealKeyRef.current = revealKey
      return
    }

    if (prefersReducedMotion || isPracticeQuestionRevealed(sessionId, revealKey)) {
      finishReveal()
      initializedRevealKeyRef.current = revealKey
      return
    }

    const start = createShellStartState()
    setRevealPhase(start.revealPhase)
    setTextRevealedThroughIndex(start.textRevealedThroughIndex)
    setTextAnimatingIndex(start.textAnimatingIndex)
    initializedRevealKeyRef.current = revealKey
  }, [
    clearFallbackTimer,
    clearPauseTimer,
    enabled,
    finishReveal,
    prefersReducedMotion,
    revealKey,
    sectionCount,
    sessionId,
  ])

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      clearPauseTimer()
      clearFallbackTimer()
    }
  }, [clearFallbackTimer, clearPauseTimer])

  useEffect(() => {
    if (textAnimatingIndex === null || revealPhase !== 'text' || !enabled || sectionCount <= 0) {
      clearFallbackTimer()
      return
    }

    clearFallbackTimer()
    fallbackTimerRef.current = setTimeout(() => {
      if (completingIndexRef.current === textAnimatingIndex) return
      completingIndexRef.current = textAnimatingIndex
      setTextRevealedThroughIndex(textAnimatingIndex)
      if (textAnimatingIndex >= sectionCount - 1) {
        finishReveal()
        return
      }
      setTextAnimatingIndex(null)
      pauseTimerRef.current = setTimeout(() => {
        setTextAnimatingIndex(textAnimatingIndex + 1)
        completingIndexRef.current = null
      }, getRevealPauseAfterSectionComplete(textAnimatingIndex, {
        extraPauseBeforeIndex,
        extraPauseMs,
      }))
    }, LESSON_TEXT_FADE_MS + 40)

    return clearFallbackTimer
  }, [
    clearFallbackTimer,
    enabled,
    extraPauseBeforeIndex,
    extraPauseMs,
    finishReveal,
    revealPhase,
    sectionCount,
    textAnimatingIndex,
  ])

  const onShellScrollComplete = useCallback(() => {
    beginTextReveal()
  }, [beginTextReveal])

  const onTextSectionRevealComplete = useCallback(
    (sectionIndex: number) => {
      if (!enabled || sectionCount <= 0 || revealPhase !== 'text') return
      if (textAnimatingIndex !== sectionIndex) return
      if (completingIndexRef.current === sectionIndex) return

      completingIndexRef.current = sectionIndex
      clearFallbackTimer()
      clearPauseTimer()
      setTextRevealedThroughIndex(sectionIndex)

      if (sectionIndex >= sectionCount - 1) {
        finishReveal()
        return
      }

      setTextAnimatingIndex(null)
      pauseTimerRef.current = setTimeout(() => {
        completingIndexRef.current = null
        setTextAnimatingIndex(sectionIndex + 1)
      }, getRevealPauseAfterSectionComplete(sectionIndex, {
        extraPauseBeforeIndex,
        extraPauseMs,
      }))
    },
    [
      clearFallbackTimer,
      clearPauseTimer,
      enabled,
      extraPauseBeforeIndex,
      extraPauseMs,
      finishReveal,
      revealPhase,
      sectionCount,
      textAnimatingIndex,
    ]
  )

  const isShellEnterActive = enabled && sectionCount > 0 && revealPhase === 'shell'
  const isTextRevealActive = enabled && sectionCount > 0 && revealPhase === 'text'
  const isRevealInProgress =
    enabled && sectionCount > 0 && revealPhase !== 'done'
  const isRevealInitializedForKey =
    revealKey != null && initializedRevealKeyRef.current === revealKey

  return {
    isShellEnterActive,
    isTextRevealActive,
    textRevealedThroughIndex,
    textAnimatingIndex,
    isRevealInProgress,
    isRevealInitializedForKey,
    onShellScrollComplete,
    onTextSectionRevealComplete,
  }
}
