'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import {
  completePrepareProgress,
  computePrepareProgress,
  computeWaitPrepareProgress,
  LESSON_PREPARE_DEFAULT_DURATION_MS,
  LESSON_PREPARE_PHASE1_DURATION_MS,
  LESSON_PREPARE_PHASE1_PROGRESS_CAP,
  LESSON_PREPARE_START_PROGRESS,
  LESSON_PREPARE_TICK_MS,
  resolveEffectivePrepareMilestoneFloor,
  resolveMilestoneFloor,
  resolvePrepareLabel,
  resolvePrepareWaitCap,
  toPrepareBarProgress,
  type LessonPreparePhase,
  type PrepareLabelProfile,
  type PrepareMilestone,
} from '@/lib/lessonPrepareProgress'

export type UseLessonPrepareProgressOptions = {
  active: boolean
  expectedDurationMs?: number
  labelProfile?: PrepareLabelProfile
}

export type UseLessonPrepareProgressResult = {
  phase: LessonPreparePhase
  /** Ширина полосы на кнопке (визуальный %). */
  progress: number
  /** Синхронное визуальное значение для async-колбэков вне React render. */
  progressRef: MutableRefObject<number>
  label: string
  reportMilestone: (milestone: PrepareMilestone) => void
  completePrepareProgress: (shouldCancel?: () => boolean) => Promise<boolean>
  /** @deprecated Используйте completePrepareProgress */
  completeBriefingLaunchProgress: (shouldCancel?: () => boolean) => Promise<boolean>
  reset: () => void
}

export function useLessonPrepareProgress(
  options: UseLessonPrepareProgressOptions
): UseLessonPrepareProgressResult {
  const labelProfile = options.labelProfile ?? 'intro'
  const expectedDurationMs = options.expectedDurationMs ?? LESSON_PREPARE_DEFAULT_DURATION_MS

  const [phase, setPhase] = useState<LessonPreparePhase>('idle')
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState(resolvePrepareLabel(0, labelProfile))

  const logicalProgressRef = useRef(0)
  const progressRef = useRef(0)
  const milestoneFloorRef = useRef(LESSON_PREPARE_START_PROGRESS)
  const preparingStartedAtRef = useRef<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const phaseRef = useRef<LessonPreparePhase>('idle')
  const labelProfileRef = useRef(labelProfile)

  useEffect(() => {
    labelProfileRef.current = labelProfile
  }, [labelProfile])

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const applyLogicalProgress = useCallback((nextLogical: number) => {
    const profile = labelProfileRef.current
    const roundedLogical = Math.round(nextLogical)
    const roundedVisual = Math.round(toPrepareBarProgress(roundedLogical, profile))
    logicalProgressRef.current = roundedLogical
    progressRef.current = roundedVisual
    setProgress(roundedVisual)
    setLabel(resolvePrepareLabel(roundedLogical, profile))
  }, [])

  const setPhaseState = useCallback((next: LessonPreparePhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const tickProgress = useCallback(() => {
    const startedAt = preparingStartedAtRef.current
    if (startedAt === null || phaseRef.current !== 'preparing') return

    const profile = labelProfileRef.current
    const waitCap = resolvePrepareWaitCap(profile)
    const elapsed = Date.now() - startedAt
    const simulated = computeWaitPrepareProgress(elapsed, waitCap, expectedDurationMs, profile)
    const effectiveFloor = resolveEffectivePrepareMilestoneFloor(
      milestoneFloorRef.current,
      elapsed
    )
    let nextLogical = computePrepareProgress({
      simulatedProgress: simulated,
      milestoneFloor: effectiveFloor,
      cap: waitCap,
    })
    if (elapsed < LESSON_PREPARE_PHASE1_DURATION_MS) {
      nextLogical = Math.min(nextLogical, LESSON_PREPARE_PHASE1_PROGRESS_CAP[profile])
    }
    applyLogicalProgress(nextLogical)
  }, [applyLogicalProgress, expectedDurationMs])

  const startPreparingTick = useCallback(() => {
    clearTick()
    tickRef.current = setInterval(tickProgress, LESSON_PREPARE_TICK_MS)
  }, [clearTick, tickProgress])

  const reset = useCallback(() => {
    clearTick()
    cancelAnimation()
    milestoneFloorRef.current = LESSON_PREPARE_START_PROGRESS
    preparingStartedAtRef.current = null
    logicalProgressRef.current = 0
    progressRef.current = 0
    setPhaseState('idle')
    setProgress(0)
    setLabel(resolvePrepareLabel(0, labelProfileRef.current))
  }, [cancelAnimation, clearTick, setPhaseState])

  const reportMilestone = useCallback(
    (milestone: PrepareMilestone) => {
      if (phaseRef.current !== 'preparing') return

      const floor = resolveMilestoneFloor(milestone, labelProfileRef.current)
      if (floor !== null) {
        milestoneFloorRef.current = Math.max(milestoneFloorRef.current, floor)
      }

      tickProgress()
    },
    [tickProgress]
  )

  const completePrepareProgressFn = useCallback(
    async (shouldCancel?: () => boolean) => {
      if (phaseRef.current !== 'preparing') return false
      clearTick()
      cancelAnimation()
      return completePrepareProgress(() => logicalProgressRef.current, applyLogicalProgress, {
        shouldCancel,
      })
    },
    [applyLogicalProgress, cancelAnimation, clearTick]
  )

  useEffect(() => {
    if (options.active) {
      cancelAnimation()
      milestoneFloorRef.current = LESSON_PREPARE_START_PROGRESS
      preparingStartedAtRef.current = Date.now()
      setPhaseState('preparing')
      applyLogicalProgress(LESSON_PREPARE_START_PROGRESS)
      startPreparingTick()
      return () => {
        clearTick()
        cancelAnimation()
      }
    }

    if (phaseRef.current === 'preparing') {
      clearTick()
      cancelAnimation()
      milestoneFloorRef.current = LESSON_PREPARE_START_PROGRESS
      preparingStartedAtRef.current = null
      logicalProgressRef.current = 0
      progressRef.current = 0
      setPhaseState('idle')
      setProgress(0)
      setLabel(resolvePrepareLabel(0, labelProfile))
    }

    return undefined
  }, [
    options.active,
    applyLogicalProgress,
    cancelAnimation,
    clearTick,
    labelProfile,
    setPhaseState,
    startPreparingTick,
  ])

  return {
    phase,
    progress,
    progressRef,
    label,
    reportMilestone,
    completePrepareProgress: completePrepareProgressFn,
    completeBriefingLaunchProgress: completePrepareProgressFn,
    reset,
  }
}
