'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { AppIconFrame } from '@/components/AppIconFrame'
import {
  LanguageNoteSheetError,
  LanguageNoteSheetLoading,
  LanguageNoteSheetReady,
} from '@/components/chat/LanguageNoteSheetBody'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import { resolveAppPanelHorizontalStyle } from '@/lib/appPanelLayout'
import {
  FOOTER_SHEET_PLACEHOLDER_TEXT,
  type FooterSheetContext,
} from '@/lib/footerSheet'
import type { LanguageNote, LanguageNoteReviewTopic } from '@/lib/languageNote/types'
import {
  readFooterSheetBodyScrollMetrics,
  shouldDelegateFooterSheetTouchToBodyScroll,
} from '@/lib/footerSheetScroll'
import {
  clampFooterSheetDragDelta,
  footerSheetBackdropOpacity,
  isFooterSheetSwipeOwned,
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
  onLanguageNoteRetry?: (messageIndex: number, originalText: string) => void
  onLanguageNoteReviewTopicPress?: (topic: LanguageNoteReviewTopic, note: LanguageNote) => void
  languageNoteReviewTopicsDisabled?: boolean
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
  function FooterDetailSheet(
    {
      context,
      columnBounds = null,
      onClose,
      onLanguageNoteRetry,
      onLanguageNoteReviewTopicPress,
      languageNoteReviewTopicsDisabled = false,
    },
    ref
  ) {
    const prefersReducedMotion = usePrefersReducedMotion()
    const [open, setOpen] = useState(false)
    const [closing, setClosing] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLButtonElement>(null)
    const swipeStartYRef = useRef<number | null>(null)
    const swipeActiveRef = useRef(false)
    const dragDeltaRef = useRef(0)
    const hadContextRef = useRef(false)
    const closingRef = useRef(closing)
    const contextRef = useRef(context)
    const bodyOverflowRef = useRef<string | null>(null)
    const bodyTouchActionRef = useRef<string | null>(null)

    closingRef.current = closing
    contextRef.current = context

    const unlockBodyScroll = useCallback(() => {
      if (bodyOverflowRef.current === null) return
      const body = bodyRef.current
      if (body) {
        body.style.overflow = bodyOverflowRef.current
        body.style.touchAction = bodyTouchActionRef.current ?? ''
      }
      bodyOverflowRef.current = null
      bodyTouchActionRef.current = null
    }, [])

    const lockBodyScroll = useCallback(() => {
      const body = bodyRef.current
      if (!body || bodyOverflowRef.current !== null) return
      bodyOverflowRef.current = body.style.overflow
      bodyTouchActionRef.current = body.style.touchAction
      body.style.overflow = 'hidden'
      body.style.touchAction = 'none'
    }, [])

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
      unlockBodyScroll()
      swipeActiveRef.current = false
      dragDeltaRef.current = 0
      swipeStartYRef.current = null
    }, [unlockBodyScroll])

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
        hadContextRef.current = false
        setOpen(false)
        setClosing(false)
        unlockBodyScroll()
        return
      }

      const isFirstOpen = !hadContextRef.current
      hadContextRef.current = true

      if (!isFirstOpen) {
        setClosing(false)
        return
      }

      setClosing(false)
      setOpen(false)
      const frame = requestAnimationFrame(() => {
        setOpen(true)
      })
      return () => cancelAnimationFrame(frame)
    }, [context, unlockBodyScroll])

    useEffect(() => {
      if (!context) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') handleClose()
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [context, handleClose])

    const applyDragStyles = useCallback((clampedDelta: number) => {
      const panel = panelRef.current
      const backdrop = backdropRef.current
      if (panel) {
        panel.style.transition = 'none'
        panel.style.transform = `translateY(${clampedDelta}px)`
      }
      if (backdrop) {
        backdrop.style.opacity = String(footerSheetBackdropOpacity(clampedDelta))
      }
    }, [])

    const processTouchMove = useCallback(
      (touchY: number, target: EventTarget | null, event: { preventDefault: () => void }) => {
        if (!contextRef.current || closingRef.current || swipeStartYRef.current === null) return

        const deltaY = touchY - swipeStartYRef.current
        const swipeOwned = isFooterSheetSwipeOwned(swipeActiveRef.current)
        const startedFromBody = bodyRef.current?.contains(target as Node) ?? false
        const metrics = readFooterSheetBodyScrollMetrics(bodyRef.current)

        if (
          !swipeOwned &&
          shouldDelegateFooterSheetTouchToBodyScroll({ startedFromBody, deltaY, metrics })
        ) {
          swipeStartYRef.current = null
          return
        }

        if (!swipeOwned) {
          if (deltaY <= 0) return
          if (!shouldStartFooterSheetSwipe(deltaY)) return
          swipeActiveRef.current = true
          lockBodyScroll()
        }

        const clampedDelta = clampFooterSheetDragDelta(deltaY)
        dragDeltaRef.current = clampedDelta
        event.preventDefault()
        applyDragStyles(clampedDelta)
      },
      [applyDragStyles, lockBodyScroll]
    )

    useEffect(() => {
      if (!context) {
        unlockBodyScroll()
        return
      }

      const panel = panelRef.current
      if (!panel) return

      const onTouchMove = (event: TouchEvent) => {
        const touchY = event.touches[0]?.clientY
        if (touchY == null) return
        processTouchMove(touchY, event.target, event)
      }

      panel.addEventListener('touchmove', onTouchMove, { passive: false })
      return () => {
        panel.removeEventListener('touchmove', onTouchMove)
        unlockBodyScroll()
      }
    }, [context, processTouchMove, unlockBodyScroll])

    const handlePanelTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName !== 'transform') return
      if (!closing) return
      onClose()
    }

    const handleTouchStart = (event: React.TouchEvent) => {
      if (!context || closing) return
      swipeStartYRef.current = event.touches[0]?.clientY ?? null
      swipeActiveRef.current = false
      dragDeltaRef.current = 0
    }

    const handleTouchEnd = () => {
      if (!context || swipeStartYRef.current === null) return
      const deltaY = dragDeltaRef.current
      const wasSwipeActive = isFooterSheetSwipeOwned(swipeActiveRef.current)
      swipeStartYRef.current = null

      if (wasSwipeActive && shouldDismissFooterSheet(deltaY)) {
        handleClose()
        return
      }

      resetInlineSwipeStyles()
    }

    if (!context) return null

    const isLanguageNote = context.source === 'language-note'
    const panelClassName = [
      'footer-sheet-panel',
      isLanguageNote ? 'footer-sheet-panel--language-note' : '',
      open && !closing ? 'footer-sheet-panel--open' : '',
      closing ? 'footer-sheet-panel--closing' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const bodyClassName = [
      'footer-sheet__body',
      isLanguageNote ? 'footer-sheet__body--language-note' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const panelHorizontalStyle = resolveAppPanelHorizontalStyle(columnBounds)

    const renderBody = () => {
      if (context.mode === 'placeholder') {
        return <p className="footer-sheet__placeholder">{FOOTER_SHEET_PLACEHOLDER_TEXT}</p>
      }
      if (context.source !== 'language-note') return null

      const status = context.languageNoteStatus ?? 'loading'
      if (status === 'loading') return <LanguageNoteSheetLoading />
      if (status === 'error') {
        return (
          <LanguageNoteSheetError
            message={context.languageNoteError ?? 'Не удалось загрузить подсказку.'}
            onRetry={() => {
              const index = context.languageNoteMessageIndex
              const original = context.languageNoteOriginalText
              if (index == null || !original || !onLanguageNoteRetry) return
              onLanguageNoteRetry(index, original)
            }}
          />
        )
      }
      if (context.languageNote) {
        return (
          <LanguageNoteSheetReady
            note={context.languageNote}
            onReviewTopicPress={onLanguageNoteReviewTopicPress}
            reviewTopicsDisabled={languageNoteReviewTopicsDisabled}
          />
        )
      }
      return <LanguageNoteSheetLoading />
    }

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
          aria-busy={isLanguageNote && context.languageNoteStatus === 'loading' ? true : undefined}
          onTransitionEnd={handlePanelTransitionEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="footer-sheet__grab">
            <div className="footer-sheet__handle" aria-hidden />
            <div className="footer-sheet__head">
              <h2 id="footer-sheet-title" className="footer-sheet__title">
                <span className="footer-sheet__title-row">
                  <AppIconFrame
                    variant="header"
                    src="/engvo-logo-1024-plus5-eqletters.png"
                    alt=""
                    className="footer-sheet__title-icon"
                    sizes="40px"
                  />
                  <span className="footer-sheet__title-text">{context.title}</span>
                </span>
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
          <div ref={bodyRef} className={bodyClassName}>
            {renderBody()}
          </div>
        </div>
      </>
    )
  }
)

FooterDetailSheet.displayName = 'FooterDetailSheet'

export default FooterDetailSheet
