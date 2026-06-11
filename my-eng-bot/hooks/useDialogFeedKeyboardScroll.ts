'use client'

import { useEffect, type RefObject } from 'react'
import { scheduleScrollAfterLayout, scrollLessonFeedToMax } from '@/lib/lessonFeedScroll'

function isComposerTextarea(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLTextAreaElement)) return false
  return Boolean(target.closest('.dialog-composer-dock'))
}

/** Доскролл ленты при фокусе в textarea и открытии клавиатуры (Android). */
export function useDialogFeedKeyboardScroll(
  scrollContainerRef: RefObject<HTMLElement | null>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const scrollToTail = () => {
      scheduleScrollAfterLayout(() => {
        scrollLessonFeedToMax(scrollContainerRef.current, 'auto')
      })
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isComposerTextarea(event.target)) return
      scrollToTail()
    }

    const onVisualViewportResize = () => {
      if (!isComposerTextarea(document.activeElement)) return
      scrollToTail()
    }

    document.addEventListener('focusin', onFocusIn, true)
    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', onVisualViewportResize, { passive: true })

    return () => {
      document.removeEventListener('focusin', onFocusIn, true)
      visualViewport?.removeEventListener('resize', onVisualViewportResize)
    }
  }, [enabled, scrollContainerRef])
}
