'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PRACTICE_SECTION_PAUSE_MS } from '@/lib/practice/practiceRevealTiming'
import {
  applySectionPauseComplete,
  applySectionTypewriterComplete,
  createDoneRevealState,
  createInitialRevealState,
  isPracticeRevealInProgress,
  type PracticeRevealPhase,
  type PracticeRevealState,
} from '@/lib/practice/practiceRevealMachine'
import {
  isPracticeQuestionRevealed,
  markPracticeQuestionRevealed,
} from '@/lib/practice/practiceRevealStorage'

type UsePracticeQuestionRevealParams = {
  sessionId: string
  revealKey: string | null
  enabled: boolean
  sectionCount: number
  prefersReducedMotion?: boolean
}

type UsePracticeQuestionRevealResult = {
  phase: PracticeRevealPhase
  visibleSectionCount: number
  typingSectionIndex: number | null
  isRevealInProgress: boolean
  onSectionTypewriterComplete: (sectionIndex: number) => void
}

export function usePracticeQuestionReveal({
  sessionId,
  revealKey,
  enabled,
  sectionCount,
  prefersReducedMotion = false,
}: UsePracticeQuestionRevealParams): UsePracticeQuestionRevealResult {
  const [revealState, setRevealState] = useState<PracticeRevealState>({
    phase: 'done',
    visibleSectionCount: 0,
    typingSectionIndex: null,
    sectionCount: 0,
    pendingSectionIndex: null,
  })
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }, [])

  const finishReveal = useCallback(() => {
    if (revealKey) {
      markPracticeQuestionRevealed(sessionId, revealKey)
    }
    setRevealState(createDoneRevealState(sectionCount))
  }, [revealKey, sectionCount, sessionId])

  useEffect(() => {
    clearPauseTimer()

    if (!enabled || !revealKey || sectionCount <= 0) {
      setRevealState((current) =>
        current.phase === 'done' &&
        current.visibleSectionCount === sectionCount &&
        current.sectionCount === sectionCount
          ? current
          : createDoneRevealState(sectionCount)
      )
      return
    }

    if (prefersReducedMotion || isPracticeQuestionRevealed(sessionId, revealKey)) {
      finishReveal()
      return
    }

    setRevealState((current) => {
      if (
        current.phase !== 'done' &&
        current.sectionCount === sectionCount &&
        isPracticeRevealInProgress(current)
      ) {
        return current
      }
      return createInitialRevealState(sectionCount)
    })

    return clearPauseTimer
  }, [
    clearPauseTimer,
    enabled,
    finishReveal,
    prefersReducedMotion,
    revealKey,
    sectionCount,
    sessionId,
  ])

  const onSectionTypewriterComplete = useCallback(
    (sectionIndex: number) => {
      setRevealState((current) => {
        const next = applySectionTypewriterComplete(current, sectionIndex)
        if (next.phase === 'done') {
          if (revealKey) {
            markPracticeQuestionRevealed(sessionId, revealKey)
          }
          return next
        }

        if (next.phase === 'pause') {
          clearPauseTimer()
          pauseTimerRef.current = setTimeout(() => {
            setRevealState((paused) => applySectionPauseComplete(paused))
          }, PRACTICE_SECTION_PAUSE_MS)
        }

        return next
      })
    },
    [clearPauseTimer, revealKey, sessionId]
  )

  useEffect(() => () => clearPauseTimer(), [clearPauseTimer])

  return {
    phase: revealState.phase,
    visibleSectionCount: revealState.visibleSectionCount,
    typingSectionIndex: revealState.typingSectionIndex,
    isRevealInProgress: isPracticeRevealInProgress(revealState),
    onSectionTypewriterComplete,
  }
}
