'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BranchId } from '@/lib/start/branchRegistry'
import { branchLoaders } from '@/lib/start/branchRegistry'

export type BranchLoadState = 'idle' | 'loading' | 'ready' | 'error'

export function useBranchLoader() {
  const [mountedBranches, setMountedBranches] = useState<Set<BranchId>>(() => new Set())
  const [loadStateByBranch, setLoadStateByBranch] = useState<Record<BranchId, BranchLoadState>>({
    hub: 'idle',
    chat: 'idle',
    lesson: 'idle',
    practice: 'idle',
    engvo: 'idle',
    accent: 'idle',
    vocabulary: 'idle',
  })
  const inflightRef = useRef<Set<BranchId>>(new Set())

  const ensureBranchMounted = useCallback(async (branchId: BranchId) => {
    setMountedBranches((prev) => {
      if (prev.has(branchId)) return prev
      const next = new Set(prev)
      next.add(branchId)
      return next
    })

    if (loadStateByBranch[branchId] === 'ready' || inflightRef.current.has(branchId)) {
      return
    }

    inflightRef.current.add(branchId)
    setLoadStateByBranch((prev) => ({ ...prev, [branchId]: 'loading' }))
    try {
      await branchLoaders[branchId]()
      setLoadStateByBranch((prev) => ({ ...prev, [branchId]: 'ready' }))
    } catch {
      setLoadStateByBranch((prev) => ({ ...prev, [branchId]: 'error' }))
    } finally {
      inflightRef.current.delete(branchId)
    }
  }, [loadStateByBranch])

  const isBranchMounted = useCallback(
    (branchId: BranchId) => mountedBranches.has(branchId),
    [mountedBranches]
  )

  const isBranchReady = useCallback(
    (branchId: BranchId) => loadStateByBranch[branchId] === 'ready',
    [loadStateByBranch]
  )

  return {
    mountedBranches,
    loadStateByBranch,
    ensureBranchMounted,
    isBranchMounted,
    isBranchReady,
  }
}

export function usePrefetchBranchesOnIdle(branchIds: BranchId[]) {
  useEffect(() => {
    const run = () => {
      for (const id of branchIds) {
        void branchLoaders[id]()
      }
    }
    if (typeof window === 'undefined') return
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run)
    } else {
      timeoutId = setTimeout(run, 1500)
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
    }
  }, [branchIds])
}
