'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import {
  findLessonFeedScrollViewportFromComposerStack,
  resyncLessonFeedScrollNearTail,
  scheduleScrollAfterLayout,
} from '@/lib/lessonFeedScroll'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'

function writeComposerStackHeightPx(height: number): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--chat-composer-stack-height', `${height}px`)
}

function resolveDialogScrollHost(stack: HTMLElement): HTMLElement | null {
  return stack.closest('.dialog-glass-scroll-host') ?? stack.closest('.glass-surface')
}

function usesFixedDialogComposerScrollInset(root: HTMLElement): boolean {
  return (
    root.hasAttribute('data-ios-safari-dialog') || root.hasAttribute('data-ios-webkit-dialog')
  )
}

function syncDialogScrollBottomInset(stack: HTMLElement, height: number, root: HTMLElement): void {
  if (!usesFixedDialogComposerScrollInset(root)) {
    root.style.removeProperty('--dialog-scroll-bottom-inset')
    return
  }
  const scrollHost = resolveDialogScrollHost(stack)
  if (!scrollHost) {
    root.style.removeProperty('--dialog-scroll-bottom-inset')
    return
  }
  const hostBottom = scrollHost.getBoundingClientRect().bottom
  const composerTop = stack.getBoundingClientRect().top
  const inset = Math.min(height, Math.max(0, Math.round(hostBottom - composerTop)))
  root.style.setProperty('--dialog-scroll-bottom-inset', `${inset}px`)
}

function clearDialogComposerMetrics(root: HTMLElement): void {
  root.style.removeProperty('--chat-composer-stack-height')
  root.style.removeProperty('--chat-composer-top-from-bottom')
  root.style.removeProperty('--dialog-scroll-bottom-inset')
}

function measureAndSyncComposerStack(stack: HTMLElement, root: HTMLElement): {
  height: number
  topFromBottom: number
} {
  const rect = stack.getBoundingClientRect()
  const height = Math.max(0, Math.round(rect.height))
  const vp = window.visualViewport
  const vpHeight = vp != null ? vp.height : window.innerHeight
  const topFromBottom = Math.max(0, Math.round(vpHeight - rect.top))

  writeComposerStackHeightPx(height)
  root.style.setProperty('--chat-composer-top-from-bottom', `${topFromBottom}px`)
  syncDialogScrollBottomInset(stack, height, root)

  return { height, topFromBottom }
}

/** Синхронизирует --chat-composer-stack-height и iOS inset после layout. */
export function syncDialogComposerStackHeight(stack: HTMLElement | null): () => void {
  if (typeof window === 'undefined' || !stack) {
    return () => {}
  }
  return scheduleScrollAfterLayout(() => {
    measureAndSyncComposerStack(stack, document.documentElement)
  })
}

/** iOS WebKit dialog: повторный замер высоты композера после layout (intro/tips, смена чипов). */
export function resyncIosWebKitDialogComposerStackHeight(stack: HTMLElement | null): () => void {
  if (typeof window === 'undefined' || !stack || !isIosWebKitBrowser(navigator.userAgent)) {
    return () => {}
  }
  return syncDialogComposerStackHeight(stack)
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
      root.style.removeProperty('--dialog-scroll-bottom-inset')
      return
    }

    const previousHeight = lastHeightRef.current
    const { height, topFromBottom } = measureAndSyncComposerStack(stack, root)

    if (height !== previousHeight) {
      lastHeightRef.current = height
      if (
        usesFixedDialogComposerScrollInset(root) &&
        !root.hasAttribute('data-lesson-feed-scroll-settle') &&
        previousHeight > 0 &&
        Math.abs(height - previousHeight) >= 12
      ) {
        const viewport = findLessonFeedScrollViewportFromComposerStack(stack)
        resyncLessonFeedScrollNearTail(viewport, 'auto')
      }
    }
    if (topFromBottom !== lastTopFromBottomRef.current) {
      lastTopFromBottomRef.current = topFromBottom
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
    const scrollHost = resolveDialogScrollHost(stack)
    if (scrollHost && observer) {
      observer.observe(scrollHost)
    }

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
      clearDialogComposerMetrics(document.documentElement)
      lastHeightRef.current = 0
      lastTopFromBottomRef.current = -1
    }
  }, [stackRef, sync])
}
