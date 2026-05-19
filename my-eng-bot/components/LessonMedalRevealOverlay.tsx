'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import LessonMedalReveal from '@/components/LessonMedalReveal'
import { shouldDismissSwipe, swipeDragOpacity } from '@/lib/rewardPopupSwipe'
import type { LessonMedalTierOrNull } from '@/lib/lessonScore'

type LessonMedalRevealOverlayProps = {
  open: boolean
  medal: LessonMedalTierOrNull
  coreXp: number
  comboXp: number
  maxCoreXp: number
  corePercent: number
  onDismiss: () => void
}

type OverlayState = 'in' | 'shown' | 'swipe-out-left' | 'swipe-out-right'

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export default function LessonMedalRevealOverlay({
  open,
  medal,
  coreXp,
  comboXp,
  maxCoreXp,
  corePercent,
  onDismiss,
}: LessonMedalRevealOverlayProps) {
  const [layerState, setLayerState] = useState<OverlayState>('in')
  const [dragX, setDragX] = useState(0)
  const coarsePointer = useCoarsePointer()
  const prefersReducedMotion = usePrefersReducedMotion()
  const swipeRef = useRef<{ startX: number; pointerId: number | null }>({
    startX: 0,
    pointerId: null,
  })

  useEffect(() => {
    if (!open) return
    setLayerState('in')
    setDragX(0)
  }, [open, medal, coreXp, corePercent])

  const finishDismiss = useCallback(() => {
    onDismiss()
    setDragX(0)
  }, [onDismiss])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    const name = event.animationName
    if (name === 'rewardPopupIn') {
      setLayerState((prev) => (prev === 'in' ? 'shown' : prev))
      return
    }
    if (name === 'rewardPopupSwipeOutLeft' || name === 'rewardPopupSwipeOutRight') {
      finishDismiss()
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (layerState !== 'shown') return
    if ((event.target as HTMLElement).closest('[data-medal-overlay-close]')) return
    swipeRef.current = { startX: event.clientX, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return
    if (prefersReducedMotion) return
    setDragX(event.clientX - swipeRef.current.startX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return
    const dx = event.clientX - swipeRef.current.startX
    swipeRef.current.pointerId = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }

    if (layerState !== 'shown') {
      setDragX(0)
      return
    }

    if (coarsePointer && shouldDismissSwipe(dx)) {
      setDragX(0)
      const swipeState: OverlayState = dx > 0 ? 'swipe-out-right' : 'swipe-out-left'
      if (prefersReducedMotion) {
        finishDismiss()
        return
      }
      setLayerState(swipeState)
      return
    }

    setDragX(0)
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return
    swipeRef.current.pointerId = null
    setDragX(0)
  }

  if (!open) return null

  const isDragging = dragX !== 0 && layerState === 'shown'
  const cardStyle: CSSProperties | undefined = isDragging
    ? {
        transform: `translateX(${dragX}px)`,
        opacity: swipeDragOpacity(dragX),
      }
    : undefined

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/15 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Результат урока"
    >
      <div
        data-reward-state={layerState}
        onAnimationEnd={handleAnimationEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={cardStyle}
        className="reward-popup-pill relative w-full max-w-sm touch-manipulation [touch-action:pan-y]"
      >
        <LessonMedalReveal
          medal={medal}
          coreXp={coreXp}
          comboXp={comboXp}
          maxCoreXp={maxCoreXp}
          corePercent={corePercent}
          className="mb-0 shadow-md"
        />
        <button
          type="button"
          data-medal-overlay-close
          aria-label="Закрыть"
          onClick={finishDismiss}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute right-1 top-1 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className="text-xl leading-none" aria-hidden>
            ×
          </span>
        </button>
      </div>
    </div>
  )
}
