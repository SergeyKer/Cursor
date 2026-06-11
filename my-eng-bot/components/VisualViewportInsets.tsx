'use client'

import * as React from 'react'
import {
  isIosWebKitBrowser,
  normalizeIosSafariBottomOverlapPx,
  readIosWebKitVisualBottomOverlapPx,
} from '@/lib/iosSafariViewport'
import {
  isAndroidMobileUserAgent,
  pinAndroidLayoutViewportScroll,
  readVisualViewportHeightPx,
} from '@/lib/mobileViewport'

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

function isComposerDockEditableFocused(): boolean {
  const active = document.activeElement
  if (!isEditableElement(active) || !(active instanceof HTMLElement)) return false
  return Boolean(active.closest('.dialog-composer-dock'))
}

function isComposerDockEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (!isEditableElement(target)) return false
  return Boolean(target.closest('.dialog-composer-dock'))
}

const KEYBOARD_SHRINK_THRESHOLD_PX = 48

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

function computeDialogViewportHeightPx(): number | null {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  if (!isIosWebKitBrowser(ua) && !isAndroidMobileUserAgent(ua)) return null
  return readVisualViewportHeightPx()
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
    let preKeyboardViewportHeightPx = 0
    let preKeyboardInnerHeightPx = 0

    const capturePreKeyboardBaseline = () => {
      const vv = window.visualViewport
      preKeyboardViewportHeightPx = vv?.height ?? window.innerHeight
      preKeyboardInnerHeightPx = window.innerHeight
    }

    const isComposerKeyboardOpen = (bottomInsetPx: number): boolean => {
      if (!isComposerDockEditableFocused()) return false
      const vv = window.visualViewport
      if (!vv) return false
      if (bottomInsetPx > 0) return true
      const baselineVv =
        preKeyboardViewportHeightPx > 0 ? preKeyboardViewportHeightPx : window.innerHeight
      const baselineInner =
        preKeyboardInnerHeightPx > 0 ? preKeyboardInnerHeightPx : window.innerHeight
      return (
        vv.height < baselineVv - KEYBOARD_SHRINK_THRESHOLD_PX ||
        window.innerHeight < baselineInner - KEYBOARD_SHRINK_THRESHOLD_PX
      )
    }

    const applyIosWebKitBottomOverlap = (keyboardInsetPx: number) => {
      if (!isIosWebKitBrowser(navigator.userAgent)) {
        root.style.removeProperty('--ios-safari-vv-bottom-overlap')
        return
      }
      const rawOverlapPx = readIosWebKitVisualBottomOverlapPx()
      const normalizedOverlapPx = normalizeIosSafariBottomOverlapPx(rawOverlapPx, keyboardInsetPx)
      root.style.setProperty('--ios-safari-vv-bottom-overlap', `${normalizedOverlapPx}px`)
    }

    const applyKeyboardInputActive = (bottomInsetPx: number) => {
      if (isComposerKeyboardOpen(bottomInsetPx)) {
        root.setAttribute('data-keyboard-input-active', '')
      } else {
        root.removeAttribute('data-keyboard-input-active')
      }
    }

    const applyInsets = () => {
      const bottomInsetPx = computeBottomInsetPx()
      root.style.setProperty('--vv-bottom-inset', `${bottomInsetPx}px`)
      const sideInsets = computeSideInsetsPx()
      root.style.setProperty('--vv-left-inset', `${sideInsets.left}px`)
      root.style.setProperty('--vv-right-inset', `${sideInsets.right}px`)
      applyIosWebKitBottomOverlap(bottomInsetPx)
      applyKeyboardInputActive(bottomInsetPx)
    }

    const applyDialogViewportHeight = () => {
      const vvHeightPx = computeDialogViewportHeightPx()
      if (vvHeightPx !== null) {
        root.style.setProperty('--app-vv-height', `${vvHeightPx}px`)
        root.style.setProperty('--ios-safari-vv-height', `${vvHeightPx}px`)
      } else {
        root.style.removeProperty('--app-vv-height')
        root.style.removeProperty('--ios-safari-vv-height')
      }
    }

    const applyAll = () => {
      raf = 0
      pinAndroidLayoutViewportScroll()
      applyInsets()
      applyDialogViewportHeight()
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
    const onVisualViewportScroll = () => {
      pinAndroidLayoutViewportScroll()
      scheduleApplyInsets()
    }
    vv?.addEventListener?.('scroll', onVisualViewportScroll, { passive: true })
    const onComposerFocusIn = (event: FocusEvent) => {
      if (!isComposerDockEditableTarget(event.target)) return
      capturePreKeyboardBaseline()
      pinAndroidLayoutViewportScroll()
      scheduleApplyInsets()
    }

    const onComposerFocusOut = (event: FocusEvent) => {
      const related = event.relatedTarget
      if (related instanceof HTMLElement && related.closest('.dialog-composer-dock')) return
      preKeyboardViewportHeightPx = 0
      preKeyboardInnerHeightPx = 0
      scheduleApplyInsets()
    }

    document.addEventListener('focusin', onComposerFocusIn, true)
    document.addEventListener('focusin', scheduleApplyInsets, true)
    document.addEventListener('focusout', onComposerFocusOut, true)
    document.addEventListener('focusout', scheduleApplyInsets, true)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      if (insetRaf) window.cancelAnimationFrame(insetRaf)
      window.removeEventListener('resize', scheduleApplyAll)
      window.removeEventListener('orientationchange', scheduleApplyAll)
      vv?.removeEventListener?.('resize', scheduleApplyAll)
      vv?.removeEventListener?.('scroll', onVisualViewportScroll)
      document.removeEventListener('focusin', onComposerFocusIn, true)
      document.removeEventListener('focusin', scheduleApplyInsets, true)
      document.removeEventListener('focusout', onComposerFocusOut, true)
      document.removeEventListener('focusout', scheduleApplyInsets, true)
      root.style.removeProperty('--app-vv-height')
      root.style.removeProperty('--ios-safari-vv-height')
      root.style.removeProperty('--ios-safari-vv-bottom-overlap')
      root.removeAttribute('data-keyboard-input-active')
    }
  }, [])

  return null
}