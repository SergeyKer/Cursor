'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { APP_BTN_PRIMARY_COMPACT, POST_LESSON_NEUTRAL_BUTTON_CLASS } from '@/lib/homeCtaStyles'
import {
  SESSION_EXIT_COPY,
  sessionExitConfirmBody,
  type SessionExitKind,
} from '@/lib/uiCopy/sessionExit'

export type SessionExitConfirmProps = {
  kind: SessionExitKind
  onStay: () => void
  onLeave: () => void
  leaveBusy?: boolean
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

export default function SessionExitConfirm({
  kind,
  onStay,
  onLeave,
  leaveBusy = false,
}: SessionExitConfirmProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  const stayRef = useRef<HTMLButtonElement>(null)
  const body = sessionExitConfirmBody(kind)

  const finishStay = useCallback(() => {
    if (closing || leaveBusy) return
    if (prefersReducedMotion) {
      onStay()
      return
    }
    setClosing(true)
  }, [closing, leaveBusy, onStay, prefersReducedMotion])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (!closing || event.target !== event.currentTarget) return
    if (event.animationName !== 'infoOverlayOut') return
    onStay()
  }

  useEffect(() => {
    stayRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      finishStay()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [finishStay])

  const backdropClass = prefersReducedMotion
    ? 'bg-black/15'
    : closing
      ? 'animate-info-overlay-out bg-black/15'
      : 'animate-fade-in bg-black/15'
  const cardClass = prefersReducedMotion ? '' : closing ? '' : 'animate-fade-in-up'

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${backdropClass}`}
      onAnimationEnd={handleAnimationEnd}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) finishStay()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={SESSION_EXIT_COPY.dialogAriaLabel}
        className={`w-full max-w-md rounded-2xl border border-[var(--border)] bg-[#f9fafb] p-5 shadow-xl ${cardClass}`}
      >
        <h2 id={titleId} className="text-base font-semibold text-[var(--text)]">
          {SESSION_EXIT_COPY.confirmTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text)]">{body}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            ref={stayRef}
            type="button"
            className={APP_BTN_PRIMARY_COMPACT}
            onClick={finishStay}
            disabled={leaveBusy || closing}
          >
            {SESSION_EXIT_COPY.stay}
          </button>
          <button
            type="button"
            className={POST_LESSON_NEUTRAL_BUTTON_CLASS}
            onClick={onLeave}
            disabled={leaveBusy || closing}
          >
            {SESSION_EXIT_COPY.leave}
          </button>
        </div>
      </div>
    </div>
  )
}
