'use client'

import * as React from 'react'

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

function isIosSafari(ua: string): boolean {
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  if (!isIosDevice) return false
  if (/CriOS\/\d+/i.test(ua)) return false
  if (/FxiOS\/\d+/i.test(ua)) return false
  if (/EdgiOS\/\d+/i.test(ua)) return false
  if (/OPiOS\/\d+/i.test(ua)) return false
  return /Safari\/\d+/i.test(ua)
}

function computeBottomInsetPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0

  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || isIos
  const isIosChrome = isIos && /CriOS\/\d+/i.test(ua)
  const isIosSafariBrowser = isIosSafari(ua)
  // На десктопных браузерах visualViewport часто меняется из‑за UI,
  // но реальной системной панели снизу нет — инсет нам не нужен.
  if (!isMobile) return 0

  // Практичная оценка перекрытия снизу:
  // - когда адресная строка/интерфейс браузера или системные overlay'и меняют полезную высоту,
  //   это отражается в visualViewport.height/offsetTop.
  const baseViewportHeight = isIosChrome ? document.documentElement.clientHeight || window.innerHeight : window.innerHeight
  const inset = baseViewportHeight - vv.height - vv.offsetTop
  const vvInset = Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0

  if (isIosSafariBrowser) {
    const editableFocused = isEditableElement(document.activeElement)
    // На iOS Safari без активного текстового фокуса visualViewport часто отражает
    // chrome браузера, а не клавиатуру. Игнорируем такие значения, чтобы fixed-футер
    // и нижний spacer не раздували первый экран и не перестраивали чат после mount.
    if (!editableFocused) return 0
    return vvInset >= 120 ? vvInset : 0
  }

  return vvInset
}

/** Высота видимой области для корня layout — только iOS Safari (см. page.tsx). */
function computeIosSafariViewportHeightPx(): number | null {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  if (!isIosSafari(ua)) return null
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
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    let raf = 0

    const apply = () => {
      raf = 0
      root.style.setProperty('--vv-bottom-inset', `${computeBottomInsetPx()}px`)
      const sideInsets = computeSideInsetsPx()
      root.style.setProperty('--vv-left-inset', `${sideInsets.left}px`)
      root.style.setProperty('--vv-right-inset', `${sideInsets.right}px`)

      const iosSafariH = computeIosSafariViewportHeightPx()
      if (iosSafariH !== null) {
        root.style.setProperty('--ios-safari-vv-height', `${iosSafariH}px`)
      } else {
        root.style.removeProperty('--ios-safari-vv-height')
      }
    }

    const scheduleApply = () => {
      if (raf) return
      raf = window.requestAnimationFrame(apply)
    }

    scheduleApply()

    window.addEventListener('resize', scheduleApply, { passive: true })
    window.addEventListener('orientationchange', scheduleApply, { passive: true })

    const vv = window.visualViewport
    vv?.addEventListener?.('resize', scheduleApply, { passive: true })
    vv?.addEventListener?.('scroll', scheduleApply, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', scheduleApply)
      window.removeEventListener('orientationchange', scheduleApply)
      vv?.removeEventListener?.('resize', scheduleApply)
      vv?.removeEventListener?.('scroll', scheduleApply)
      root.style.removeProperty('--ios-safari-vv-height')
    }
  }, [])

  return null
}

