'use client'

import { useCallback, useEffect, useState } from 'react'

export type CenterMessageOverlayProps = {
  title: string
  lines: string[]
  onClose: () => void
  closeLabel?: string
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

export default function CenterMessageOverlay({
  title,
  lines,
  onClose,
  closeLabel = 'Закрыть',
}: CenterMessageOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => {
    if (closing) return
    if (prefersReducedMotion) {
      onClose()
      return
    }
    setClosing(true)
  }, [closing, onClose, prefersReducedMotion])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (!closing || event.target !== event.currentTarget) return
    if (event.animationName !== 'infoOverlayOut') return
    onClose()
  }

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
    >
      <div
        className={`w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--chat-assistant-shell)] p-5 shadow-xl backdrop-blur-sm ${cardClass}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/70"
          >
            {closeLabel}
          </button>
        </div>
        <div className="space-y-2 text-sm leading-6 text-[var(--text)]">
          {lines.map((line, index) => (
            <p key={`${title}-${index}`}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
