'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { resolveAppPanelHorizontalStyle } from '@/lib/appPanelLayout'
import {
  FOOTER_SHEET_PLACEHOLDER_TEXT,
  type FooterSheetContext,
} from '@/lib/footerSheet'
import {
  footerSheetBackdropOpacity,
  shouldDismissFooterSheet,
  shouldStartFooterSheetSwipe,
} from '@/lib/footerSheetSwipe'

export type FooterDetailSheetHandle = {
  close: () => void
}

export type FooterDetailSheetProps = {
  context: FooterSheetContext | null
  columnBounds?: AppColumnBounds | null
  onClose: () => void
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

const FooterDetailSheet = forwardRef<FooterDetailSheetHandle, FooterDetailSheetProps>(
  function FooterDetailSheet({ context, columnBounds = null, onClose }, ref) {
    const prefersReducedMotion = usePrefersReducedMotion()
    const [open, setOpen] = useState(false)
    const [closing, setClosing] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLButtonElement>(null)
    const swipeStartYRef = useRef<number | null>(null)
    const swipeActiveRef = useRef(false)
    const dragDeltaRef = useRef(0)

    const resetInlineSwipeStyles = useCallback(() => {
      const panel = panelRef.current
      const backdrop = backdropRef.current
      if (panel) {
        panel.style.transition = ''
        panel.style.transform = ''
      }
      if (backdrop) {
        backdrop.style.opacity = ''
      }
      swipeActiveRef.current = false
      dragDeltaRef.current = 0
      swipeStartYRef.current = null
    }, [])

    const handleClose = useCallback(() => {
      if (!context || closing) return
      resetInlineSwipeStyles()
      if (prefersReducedMotion) {
        onClose()
        return
      }
      setClosing(true)
      setOpen(false)
    }, [closing, context, onClose, prefersReducedMotion, resetInlineSwipeStyles])

    useImperativeHandle(
      ref,
      () => ({
        close: handleClose,
      }),
      [handleClose]
    )

    useEffect(() => {
      if (!context) {
        setOpen(false)
        setClosing(false)
        return
      }
      setClosing(false)
      setOpen(false)
      const frame = requestAnimationFrame(() => {
        setOpen(true)
      })
      return () => cancelAnimationFrame(frame)
    }, [context])

    useEffect(() => {
      if (!context) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') handleClose()
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [context, handleClose])

    const handlePanelTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName !== 'transform') return
      if (!closing) return
      onClose()
    }

    const isBodyScrollAtTop = () => (bodyRef.current?.scrollTop ?? 0) <= 0

    const handleTouchStart = (event: React.TouchEvent) => {
      if (!context || closing) return
      swipeStartYRef.current = event.touches[0]?.clientY ?? null
      swipeActiveRef.current = false
    }

    const handleTouchMove = (event: React.TouchEvent) => {
      if (!context || closing || swipeStartYRef.current === null) return
      const touchY = event.touches[0]?.clientY
      if (touchY == null) return

      const deltaY = touchY - swipeStartYRef.current
      const startedFromBody = bodyRef.current?.contains(event.target as Node) ?? false

      if (!swipeActiveRef.current && startedFromBody && !isBodyScrollAtTop() && deltaY < 0) {
        swipeStartYRef.current = null
        return
      }
      if (deltaY <= 0) return
      if (!swipeActiveRef.current && !shouldStartFooterSheetSwipe(deltaY)) return

      swipeActiveRef.current = true
      dragDeltaRef.current = deltaY
      const panel = panelRef.current
      const backdrop = backdropRef.current
      if (panel) {
        panel.style.transition = 'none'
        panel.style.transform = `translateY(${deltaY}px)`
      }
      if (backdrop) {
        backdrop.style.opacity = String(footerSheetBackdropOpacity(deltaY))
      }
    }

    const handleTouchEnd = () => {
      if (!context || swipeStartYRef.current === null) return
      const deltaY = dragDeltaRef.current
      swipeStartYRef.current = null

      if (swipeActiveRef.current && shouldDismissFooterSheet(deltaY)) {
        handleClose()
        return
      }

      resetInlineSwipeStyles()
    }

    if (!context) return null

    const panelClassName = [
      'footer-sheet-panel',
      open && !closing ? 'footer-sheet-panel--open' : '',
      closing ? 'footer-sheet-panel--closing' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const panelHorizontalStyle = resolveAppPanelHorizontalStyle(columnBounds)

    return (
      <>
        <button
          type="button"
          ref={backdropRef}
          className={`footer-sheet-backdrop ${open && !closing ? 'footer-sheet-backdrop--open' : ''}`}
          aria-label="Закрыть панель"
          onClick={handleClose}
        />
        <div
          ref={panelRef}
          className={panelClassName}
          style={panelHorizontalStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-sheet-title"
          onTransitionEnd={handlePanelTransitionEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="footer-sheet__grab">
            <div className="footer-sheet__handle" aria-hidden />
            <div className="footer-sheet__head">
              <h2 id="footer-sheet-title" className="footer-sheet__title">
                {context.title}
              </h2>
              <button
                type="button"
                className="footer-sheet__close touch-manipulation focus-visible:outline-none"
                onClick={handleClose}
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
            </div>
          </div>
          <div ref={bodyRef} className="footer-sheet__body">
            {context.mode === 'placeholder' ? (
              <p className="footer-sheet__placeholder">{FOOTER_SHEET_PLACEHOLDER_TEXT}</p>
            ) : null}
          </div>
        </div>
      </>
    )
  }
)

FooterDetailSheet.displayName = 'FooterDetailSheet'

export default FooterDetailSheet
