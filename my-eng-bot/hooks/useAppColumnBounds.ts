'use client'

import * as React from 'react'

const FULL_BLEED_WIDTH_RATIO = 0.82
const PHONE_VIEWPORT_MAX_WIDTH_PX = 640

export type AppColumnBounds = {
  left: number
  width: number
  /** Левый край контентной области chat-shell-x (оболочка приложения). */
  shellLeft: number
  /** Правый край контентной области chat-shell-x (оболочка приложения). */
  shellRight: number
  isFullBleed: boolean
  /** Viewport уже телефона — меню на всю ширину экрана. */
  isPhoneViewport: boolean
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
    isFullBleed: widthRatio >= FULL_BLEED_WIDTH_RATIO,
    isPhoneViewport: viewportWidth < PHONE_VIEWPORT_MAX_WIDTH_PX,
  }
}

function boundsEqual(a: AppColumnBounds | null, b: AppColumnBounds | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.left === b.left &&
    a.width === b.width &&
    a.shellLeft === b.shellLeft &&
    a.shellRight === b.shellRight &&
    a.isFullBleed === b.isFullBleed &&
    a.isPhoneViewport === b.isPhoneViewport
  )
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
      setBounds((prev) => (prev === null ? prev : null))
      return
    }
    const next = measureBounds(el)
    setBounds((prev) => (boundsEqual(prev, next) ? prev : next))
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

    const viewport = window.visualViewport
    viewport?.addEventListener('resize', updateBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBounds)
      viewport?.removeEventListener('resize', updateBounds)
    }
  }, [columnRef, updateBounds, remeasureWhen])

  return bounds
}

