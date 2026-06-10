'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { scheduleScrollAfterLayout } from '@/lib/lessonFeedScroll'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'

function writeComposerStackHeightPx(height: number): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--chat-composer-stack-height', `${height}px`)
}

/** iOS WebKit dialog: повторный замер высоты композера после layout (intro/tips, смена чипов). */
export function resyncIosWebKitDialogComposerStackHeight(stack: HTMLElement | null): () => void {
  if (typeof window === 'undefined' || !stack || !isIosWebKitBrowser(navigator.userAgent)) {
    return () => {}
  }
  return scheduleScrollAfterLayout(() => {
    const height = Math.max(0, Math.round(stack.getBoundingClientRect().height))
    writeComposerStackHeightPx(height)
  })
}

/** Синхронизирует высоту композера для scroll-padding и RewardPopup. */
export function useDialogComposerStackHeight(stackRef: RefObject<HTMLElement | null>): void {
  const lastHeightRef = useRef(0)
  const lastTopFromBottomRef = useRef(-1)

  const sync = useCallback(() => {
    const stack = stackRef.current
    const root = document.documentElement
    if (typeof window === 'undefined') return
    if (!stack) {
      if (lastHeightRef.current !== 0) {
        lastHeightRef.current = 0
        root.style.setProperty('--chat-composer-stack-height', '0px')
      }
      if (lastTopFromBottomRef.current !== -1) {
        lastTopFromBottomRef.current = -1
        root.style.removeProperty('--chat-composer-top-from-bottom')
      }
      return
    }
    const rect = stack.getBoundingClientRect()
    const height = Math.max(0, Math.round(rect.height))
    const vp = window.visualViewport
    const vpHeight = vp != null ? vp.height : window.innerHeight
    const topFromBottom = Math.max(0, Math.round(vpHeight - rect.top))

    if (height !== lastHeightRef.current) {
      lastHeightRef.current = height
      writeComposerStackHeightPx(height)
    }
    if (topFromBottom !== lastTopFromBottomRef.current) {
      lastTopFromBottomRef.current = topFromBottom
      root.style.setProperty('--chat-composer-top-from-bottom', `${topFromBottom}px`)
    }
  }, [stackRef])

  useLayoutEffect(() => {
    sync()
  }, [sync])

  useEffect(() => {
    sync()
    const stack = stackRef.current
    if (!stack || typeof window === 'undefined') return

    let raf = 0
    const scheduleSync = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        sync()
      })
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleSync) : null
    observer?.observe(stack)

    window.addEventListener('resize', scheduleSync, { passive: true })
    window.addEventListener('orientationchange', scheduleSync, { passive: true })
    const vv = window.visualViewport
    vv?.addEventListener('resize', scheduleSync)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('orientationchange', scheduleSync)
      vv?.removeEventListener('resize', scheduleSync)
      document.documentElement.style.removeProperty('--chat-composer-stack-height')
      document.documentElement.style.removeProperty('--chat-composer-top-from-bottom')
      lastHeightRef.current = 0
      lastTopFromBottomRef.current = -1
    }
  }, [stackRef, sync])
}
