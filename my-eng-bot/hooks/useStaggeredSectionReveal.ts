'use client'

import { useEffect, useRef, useState } from 'react'

export type StaggeredRevealTarget = {
  id: string
  sectionCount: number
}

export const DEFAULT_STAGGERED_REVEAL_INTERVAL_MS = 450

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearTimerList(timers: ReturnType<typeof setTimeout>[]) {
  timers.forEach(clearTimeout)
  timers.length = 0
}

function buildTargetsSignature(targets: StaggeredRevealTarget[]): string {
  return targets.map((target) => `${target.id}:${target.sectionCount}`).join('|')
}

export function useStaggeredSectionRevealMap(
  targets: StaggeredRevealTarget[],
  resetKey: string,
  intervalMs = DEFAULT_STAGGERED_REVEAL_INTERVAL_MS
): Record<string, number> {
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})
  const timersByIdRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map())
  const visibleCountsRef = useRef(visibleCounts)
  const sessionRef = useRef(0)
  const resetKeyRef = useRef(resetKey)
  const targetsRef = useRef(targets)

  visibleCountsRef.current = visibleCounts
  targetsRef.current = targets

  const targetsSignature = buildTargetsSignature(targets)

  useEffect(() => {
    const timersById = timersByIdRef.current
    const session = sessionRef.current + 1
    sessionRef.current = session

    if (resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey
      setVisibleCounts({})
      visibleCountsRef.current = {}
    }

    timersById.forEach((timers) => clearTimerList(timers))
    timersById.clear()

    const activeTargets = targetsRef.current

    const scheduleReveal = (id: string, sectionCount: number, fromVisible: number) => {
      if (sectionCount <= 0) {
        setVisibleCounts((prev) => ({ ...prev, [id]: 0 }))
        return
      }

      if (prefersReducedMotion()) {
        setVisibleCounts((prev) => ({ ...prev, [id]: sectionCount }))
        return
      }

      const startVisible = Math.max(1, fromVisible)
      const timers: ReturnType<typeof setTimeout>[] = []
      timersById.set(id, timers)

      setVisibleCounts((prev) => ({ ...prev, [id]: Math.max(prev[id] ?? 0, startVisible) }))

      for (let section = startVisible + 1; section <= sectionCount; section += 1) {
        const timer = setTimeout(() => {
          if (session !== sessionRef.current) return
          setVisibleCounts((prev) => ({ ...prev, [id]: section }))
        }, intervalMs * (section - startVisible))
        timers.push(timer)
      }
    }

    for (const target of activeTargets) {
      const currentVisible = visibleCountsRef.current[target.id] ?? 0
      if (currentVisible >= target.sectionCount) continue
      scheduleReveal(target.id, target.sectionCount, currentVisible)
    }

    return () => {
      sessionRef.current += 1
    }
  }, [targetsSignature, resetKey, intervalMs])

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      const timersById = timersByIdRef.current
      timersById.forEach((timers) => clearTimerList(timers))
      timersById.clear()
    }
  }, [])

  return visibleCounts
}
