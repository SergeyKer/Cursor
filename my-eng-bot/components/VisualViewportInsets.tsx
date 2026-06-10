'use client'

import * as React from 'react'
import {
  isIosWebKitBrowser,
  normalizeIosSafariBottomOverlapPx,
  readIosWebKitVisualBottomOverlapPx,
} from '@/lib/iosSafariViewport'

function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false
  if (element.isContentEditable) return true
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLSelectElement) return false
  if (!(element instanceof HTMLInputElement)) return false

  const nonTextInputTypes = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ])
  return !nonTextInputTypes.has(element.type)
}

function computeBottomInsetPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0

  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || isIos
  const isIosChrome = isIos && /CriOS\/\d+/i.test(ua)
  if (!isMobile) return 0

  const baseViewportHeight = isIosChrome ? document.documentElement.clientHeight || window.innerHeight : window.innerHeight
  const inset = baseViewportHeight - vv.height - vv.offsetTop
  const vvInset = Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0
  const editableFocused = isEditableElement(document.activeElement)

  if (!editableFocused) return 0

  return vvInset >= 120 ? vvInset : 0
}

function computeIosWebKitViewportHeightPx(): number | null {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  if (!isIosWebKitBrowser(ua)) return null
  const vv = window.visualViewport
  if (!vv) return null
  const h = vv.height
  return Number.isFinite(h) ? Math.max(1, Math.round(h)) : null
}

function computeSideInsetsPx(): { left: number; right: number } {
  if (typeof window === 'undefined') return { left: 0, right: 0 }
  const vv = window.visualViewport
  if (!vv) return { left: 0, right: 0 }

  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  if (!isMobile) return { left: 0, right: 0 }

  const leftInsetRaw = vv.offsetLeft
  const rightInsetRaw = window.innerWidth - vv.width - vv.offsetLeft
  const vvLeftInset = Number.isFinite(leftInsetRaw) ? Math.max(0, Math.round(leftInsetRaw)) : 0
  const vvRightInset = Number.isFinite(rightInsetRaw) ? Math.max(0, Math.round(rightInsetRaw)) : 0

  return {
    left: vvLeftInset,
    right: vvRightInset,
  }
}

export default function VisualViewportInsets() {
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    let raf = 0

    const applyIosWebKitBottomOverlap = (keyboardInsetPx: number) => {
      if (!isIosWebKitBrowser(navigator.userAgent)) {
        root.style.removeProperty('--ios-safari-vv-bottom-overlap')
        return
      }
      const rawOverlapPx = readIosWebKitVisualBottomOverlapPx()
      const normalizedOverlapPx = normalizeIosSafariBottomOverlapPx(rawOverlapPx, keyboardInsetPx)
      root.style.setProperty('--ios-safari-vv-bottom-overlap', `${normalizedOverlapPx}px`)
    }

    const applyInsets = () => {
      const bottomInsetPx = computeBottomInsetPx()
      root.style.setProperty('--vv-bottom-inset', `${bottomInsetPx}px`)
      const sideInsets = computeSideInsetsPx()
      root.style.setProperty('--vv-left-inset', `${sideInsets.left}px`)
      root.style.setProperty('--vv-right-inset', `${sideInsets.right}px`)
      applyIosWebKitBottomOverlap(bottomInsetPx)
    }

    const applyIosWebKitViewportHeight = () => {
      const iosWebKitH = computeIosWebKitViewportHeightPx()
      if (iosWebKitH !== null) {
        root.style.setProperty('--ios-safari-vv-height', `${iosWebKitH}px`)
      } else {
        root.style.removeProperty('--ios-safari-vv-height')
      }
    }

    const applyAll = () => {
      raf = 0
      applyInsets()
      applyIosWebKitViewportHeight()
    }

    const scheduleApplyAll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(applyAll)
    }

    let insetRaf = 0
    const scheduleApplyInsets = () => {
      if (insetRaf) return
      insetRaf = window.requestAnimationFrame(() => {
        insetRaf = 0
        applyInsets()
      })
    }

    applyAll()

    window.addEventListener('resize', scheduleApplyAll, { passive: true })
    window.addEventListener('orientationchange', scheduleApplyAll, { passive: true })

    const vv = window.visualViewport
    vv?.addEventListener?.('resize', scheduleApplyAll, { passive: true })
    vv?.addEventListener?.('scroll', scheduleApplyInsets, { passive: true })
    document.addEventListener('focusin', scheduleApplyInsets, true)
    document.addEventListener('focusout', scheduleApplyInsets, true)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      if (insetRaf) window.cancelAnimationFrame(insetRaf)
      window.removeEventListener('resize', scheduleApplyAll)
      window.removeEventListener('orientationchange', scheduleApplyAll)
      vv?.removeEventListener?.('resize', scheduleApplyAll)
      vv?.removeEventListener?.('scroll', scheduleApplyInsets)
      document.removeEventListener('focusin', scheduleApplyInsets, true)
      document.removeEventListener('focusout', scheduleApplyInsets, true)
      root.style.removeProperty('--ios-safari-vv-height')
      root.style.removeProperty('--ios-safari-vv-bottom-overlap')
    }
  }, [])

  return null
}