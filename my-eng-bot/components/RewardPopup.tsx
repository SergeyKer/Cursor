'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  shouldDismissSwipe,
  swipeDragOpacity,
} from '@/lib/rewardPopupSwipe'

type RewardPopupProps = {
  text: string
  visible: boolean
  onDismiss?: () => void
}

type RewardLayerState =
  | 'in'
  | 'shown'
  | 'out'
  | 'swipe-out-left'
  | 'swipe-out-right'

type RewardLayer = { text: string; state: RewardLayerState }

const EXIT_ANIM_MS = 320
const DISMISS_BUTTON_DELAY_MS = 2000

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

export default function RewardPopup({ text, visible, onDismiss }: RewardPopupProps) {
  const [layer, setLayer] = useState<RewardLayer | null>(null)
  const [showClose, setShowClose] = useState(false)
  const [dragX, setDragX] = useState(0)
  const coarsePointer = useCoarsePointer()
  const prefersReducedMotion = usePrefersReducedMotion()
  const swipeRef = useRef<{ startX: number; pointerId: number | null }>({
    startX: 0,
    pointerId: null,
  })

  const dismiss = useCallback(() => {
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    if (visible && text.trim()) {
      setLayer({ text: text.trim(), state: 'in' })
      setDragX(0)
      setShowClose(false)
    }
  }, [visible, text])

  useEffect(() => {
    if (visible) return
    setLayer((prev) => {
      if (!prev) return prev
      if (prev.state === 'swipe-out-left' || prev.state === 'swipe-out-right') return prev
      if (prev.state !== 'out') return { ...prev, state: 'out' }
      return prev
    })
  }, [visible])

  useEffect(() => {
    if (!layer || layer.state !== 'out') return
    const id = window.setTimeout(() => setLayer(null), EXIT_ANIM_MS)
    return () => window.clearTimeout(id)
  }, [layer])

  useEffect(() => {
    if (layer?.state !== 'shown') {
      setShowClose(false)
      return
    }
    const id = window.setTimeout(() => setShowClose(true), DISMISS_BUTTON_DELAY_MS)
    return () => {
      window.clearTimeout(id)
      setShowClose(false)
    }
  }, [layer?.state, layer?.text])

  const finishSwipeDismiss = useCallback(() => {
    dismiss()
    setLayer(null)
    setDragX(0)
  }, [dismiss])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    const name = event.animationName
    if (name === 'rewardPopupIn') {
      setLayer((prev) => (prev && prev.state === 'in' ? { ...prev, state: 'shown' } : prev))
      return
    }
    if (name === 'rewardPopupSwipeOutLeft' || name === 'rewardPopupSwipeOutRight') {
      finishSwipeDismiss()
    }
  }

  const handleCloseClick = () => {
    dismiss()
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!coarsePointer || layer?.state !== 'shown') return
    if ((event.target as HTMLElement).closest('[data-reward-close]')) return
    swipeRef.current = { startX: event.clientX, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return
    if (prefersReducedMotion) return
    const dx = event.clientX - swipeRef.current.startX
    setDragX(dx)
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

    if (!coarsePointer || layer?.state !== 'shown') {
      setDragX(0)
      return
    }

    if (shouldDismissSwipe(dx)) {
      setDragX(0)
      const swipeState: RewardLayerState = dx > 0 ? 'swipe-out-right' : 'swipe-out-left'
      if (prefersReducedMotion) {
        finishSwipeDismiss()
        return
      }
      setLayer((prev) => (prev ? { ...prev, state: swipeState } : prev))
      return
    }

    setDragX(0)
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current.pointerId !== event.pointerId) return
    swipeRef.current.pointerId = null
    setDragX(0)
  }

  if (!layer) return null

  const isDragging = dragX !== 0 && layer.state === 'shown'
  const pillStyle: CSSProperties | undefined = isDragging
    ? {
        transform: `translateX(${dragX}px)`,
        opacity: swipeDragOpacity(dragX),
      }
    : undefined

  const closeVisible = showClose && layer.state === 'shown'

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[70] w-full max-w-[28rem] -translate-x-1/2 px-3"
      style={{
        bottom:
          'calc(var(--chat-composer-top-from-bottom, calc(var(--app-bottom-offset) + var(--chat-composer-stack-height, 0px))) + 0.625rem)',
      }}
    >
      <div
        data-reward-state={layer.state}
        onAnimationEnd={handleAnimationEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={pillStyle}
        className="reward-popup-pill pointer-events-auto relative touch-manipulation rounded-2xl border border-[var(--chat-section-neutral-border)] bg-white/95 py-2 pl-4 pr-11 text-center text-[13px] font-semibold text-[var(--text)] shadow-lg backdrop-blur [touch-action:pan-y]"
      >
        <span className="block line-clamp-2">{layer.text}</span>
        <button
          type="button"
          data-reward-close
          aria-label="Закрыть уведомление"
          onClick={handleCloseClick}
          onPointerDown={(event) => event.stopPropagation()}
          className={`absolute right-0 top-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-[var(--text-muted)] transition-opacity duration-200 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            closeVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="text-lg leading-none" aria-hidden>
            ×
          </span>
        </button>
      </div>
    </div>
  )
}

