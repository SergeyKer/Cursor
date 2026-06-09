'use client'

import * as React from 'react'
import { isIosSafariUserAgent, readIosSafariVisualBottomOverlapPx } from '@/lib/iosSafariViewport'

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
  // На десктопных браузерах visualViewport часто меняется из‑за UI,
  // но реальной системной панели снизу нет — инсет нам не нужен.
  if (!isMobile) return 0

  // Практичная оценка перекрытия снизу:
  // - когда адресная строка/интерфейс браузера или системные overlay'и меняют полезную высоту,
  //   это отражается в visualViewport.height/offsetTop.
  const baseViewportHeight = isIosChrome ? document.documentElement.clientHeight || window.innerHeight : window.innerHeight
  const inset = baseViewportHeight - vv.height - vv.offsetTop
  const vvInset = Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0
  const editableFocused = isEditableElement(document.activeElement)

  // Без фокуса в поле ввода vv отражает chrome браузера, а не клавиатуру — не трогаем layout.
  if (!editableFocused) return 0

  return vvInset >= 120 ? vvInset : 0
}

/** Высота видимой области для корня layout — только iOS Safari (см. page.tsx). */
function computeIosSafariViewportHeightPx(): number | null {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  if (!isIosSafariUserAgent(ua)) return null
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

    const applyIosSafariBottomOverlap = () => {
      if (!isIosSafariUserAgent(navigator.userAgent)) {
        root.style.removeProperty('--ios-safari-vv-bottom-overlap')
        return
      }
      root.style.setProperty('--ios-safari-vv-bottom-overlap', `${readIosSafariVisualBottomOverlapPx()}px`)
    }

    const applyInsets = () => {
      root.style.setProperty('--vv-bottom-inset', `${computeBottomInsetPx()}px`)
      const sideInsets = computeSideInsetsPx()
      root.style.setProperty('--vv-left-inset', `${sideInsets.left}px`)
      root.style.setProperty('--vv-right-inset', `${sideInsets.right}px`)
      applyIosSafariBottomOverlap()
    }

    const applyIosSafariViewportHeight = () => {
      const iosSafariH = computeIosSafariViewportHeightPx()
      if (iosSafariH !== null) {
        root.style.setProperty('--ios-safari-vv-height', `${iosSafariH}px`)
      } else {
        root.style.removeProperty('--ios-safari-vv-height')
      }
    }

    const applyAll = () => {
      raf = 0
      applyInsets()
      applyIosSafariViewportHeight()
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
    // scroll visualViewport на iOS Safari совпадает со скрытием адресной строки;
    // не трогаем --ios-safari-vv-height здесь — иначе корень layout «дёргается» и лента замирает.
    vv?.addEventListener?.('scroll', scheduleApplyInsets, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      if (insetRaf) window.cancelAnimationFrame(insetRaf)
      window.removeEventListener('resize', scheduleApplyAll)
      window.removeEventListener('orientationchange', scheduleApplyAll)
      vv?.removeEventListener?.('resize', scheduleApplyAll)
      vv?.removeEventListener?.('scroll', scheduleApplyInsets)
      root.style.removeProperty('--ios-safari-vv-height')
      root.style.removeProperty('--ios-safari-vv-bottom-overlap')
    }
  }, [])

  return null
}

