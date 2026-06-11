'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { scheduleScrollAfterLayout, scrollLessonFeedTailMessageIntoView } from '@/lib/lessonFeedScroll'

function isComposerTextarea(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLTextAreaElement)) return false
  return Boolean(target.closest('.dialog-composer-dock'))
}

/** Доскролл ленты при фокусе в textarea и открытии клавиатуры — последний пузырь над композером. */
export function useDialogFeedKeyboardScroll(
  scrollContainerRef: RefObject<HTMLElement | null>,
  enabled: boolean
): void {
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const scrollTailMessage = () => {
      scheduleScrollAfterLayout(() => {
        scrollLessonFeedTailMessageIntoView(scrollContainerRef.current, 'auto')
      })
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isComposerTextarea(event.target)) return
      scrollTailMessage()
    }

    const onVisualViewportResize = () => {
      if (!isComposerTextarea(document.activeElement)) return
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
      resizeDebounceRef.current = setTimeout(() => {
        resizeDebounceRef.current = null
        scrollTailMessage()
      }, 80)
    }

    document.addEventListener('focusin', onFocusIn, true)
    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', onVisualViewportResize, { passive: true })

    return () => {
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
      document.removeEventListener('focusin', onFocusIn, true)
      visualViewport?.removeEventListener('resize', onVisualViewportResize)
    }
  }, [enabled, scrollContainerRef])
}
