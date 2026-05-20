'use client'

import * as React from 'react'

const FULL_BLEED_WIDTH_RATIO = 0.88

export type AppColumnBounds = {
  left: number
  width: number
  /** Левый край контентной области chat-shell-x (оболочка приложения). */
  shellLeft: number
  /** Правый край контентной области chat-shell-x (оболочка приложения). */
  shellRight: number
  isFullBleed: boolean
}

function measureShellContentBox(element: HTMLElement): { shellLeft: number; shellRight: number } {
  const rect = element.getBoundingClientRect()
  const shellEl = element.closest('.chat-shell-x')
  if (!shellEl) {
    return { shellLeft: rect.left, shellRight: rect.right }
  }

  const shellRect = shellEl.getBoundingClientRect()
  const style = getComputedStyle(shellEl)
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0
  const paddingRight = Number.parseFloat(style.paddingRight) || 0
  return {
    shellLeft: shellRect.left + paddingLeft,
    shellRight: shellRect.right - paddingRight,
  }
}

function measureBounds(element: HTMLElement): AppColumnBounds {
  const rect = element.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const widthRatio = viewportWidth > 0 ? rect.width / viewportWidth : 0
  const shell = measureShellContentBox(element)
  return {
    left: rect.left,
    width: rect.width,
    shellLeft: shell.shellLeft,
    shellRight: shell.shellRight,
    // Колонка почти на всю ширину (телефон): для UI-отличий (border-r), не для позиционирования меню.
    isFullBleed: widthRatio >= FULL_BLEED_WIDTH_RATIO,
  }
}

export function useAppColumnBounds(
  columnRef: React.RefObject<HTMLElement | null>,
  options?: { remeasureWhen?: boolean }
): AppColumnBounds | null {
  const [bounds, setBounds] = React.useState<AppColumnBounds | null>(null)
  const remeasureWhen = options?.remeasureWhen

  const updateBounds = React.useCallback(() => {
    const el = columnRef.current
    if (!el) {
      setBounds(null)
      return
    }
    setBounds(measureBounds(el))
  }, [columnRef])

  React.useLayoutEffect(() => {
    updateBounds()
  }, [updateBounds, remeasureWhen])

  React.useEffect(() => {
    const el = columnRef.current
    if (!el) return

    const observer = new ResizeObserver(() => updateBounds())
    observer.observe(el)

    window.addEventListener('resize', updateBounds)
    window.addEventListener('scroll', updateBounds, true)

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', updateBounds)
    viewport?.addEventListener('scroll', updateBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBounds)
      window.removeEventListener('scroll', updateBounds, true)
      viewport?.removeEventListener('resize', updateBounds)
      viewport?.removeEventListener('scroll', updateBounds)
      setBounds(null)
    }
  }, [columnRef, updateBounds])

  return bounds
}
