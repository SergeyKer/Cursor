'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { APP_BTN_NEUTRAL_WHITE_LARGE, APP_BTN_PRIMARY_LARGE } from '@/lib/homeCtaStyles'
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
        className={`relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-white/90 p-5 shadow-xl backdrop-blur-sm ${cardClass}`}
      >
        <button
          type="button"
          className="footer-sheet__close absolute right-3 top-3 touch-manipulation focus-visible:outline-none"
          onClick={finishStay}
          disabled={leaveBusy || closing}
          aria-label="Закрыть"
        >
          <svg
            className="footer-sheet__close-icon"
            viewBox="0 0 14 14"
            width="14"
            height="14"
            aria-hidden
          >
            <path
              d="M2 2l10 10M12 2L2 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 id={titleId} className="text-center text-base font-semibold text-[var(--text)]">
          {SESSION_EXIT_COPY.confirmTitle}
        </h2>
        <p className="mt-3 text-center text-sm leading-6 text-[var(--text)]">{body}</p>
        <div className="mt-5 flex flex-row gap-2">
          <button
            type="button"
            className={`${APP_BTN_NEUTRAL_WHITE_LARGE} flex-1 !border-[var(--chat-section-neutral-border)]`}
            onClick={onLeave}
            disabled={leaveBusy || closing}
          >
            {SESSION_EXIT_COPY.leave}
          </button>
          <button
            ref={stayRef}
            type="button"
            className={`${APP_BTN_PRIMARY_LARGE} flex-1`}
            onClick={finishStay}
            disabled={leaveBusy || closing}
          >
            {SESSION_EXIT_COPY.stay}
          </button>
        </div>
      </div>
    </div>
  )
}
