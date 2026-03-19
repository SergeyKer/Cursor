'use client'

import * as React from 'react'

function computeBottomInsetPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0

  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
  // На десктопных браузерах visualViewport часто меняется из‑за UI,
  // но реальной системной панели снизу нет — инсет нам не нужен.
  if (!isMobile) return 0

  // Практичная оценка перекрытия снизу:
  // - когда адресная строка/интерфейс браузера или системные overlay'и меняют полезную высоту,
  //   это отражается в visualViewport.height/offsetTop.
  const inset = window.innerHeight - vv.height - vv.offsetTop
  const vvInset = Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0

  // Android (3-button navigation) может перекрывать web-контент снизу,
  // при этом safe-area и VisualViewport часто возвращают 0 (когда клавиатура закрыта).
  // Даем минимальный запас, чтобы поле ввода не уходило под системные кнопки.
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isLandscape = window.innerWidth > window.innerHeight
  const androidMinInset = isAndroid ? (isLandscape ? 76 : 88) : 0

  return Math.max(vvInset, androidMinInset)
}

function computeSideInsetsPx(): { left: number; right: number } {
  if (typeof window === 'undefined') return { left: 0, right: 0 }
  const vv = window.visualViewport
  if (!vv) return { left: 0, right: 0 }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (!isMobile) return { left: 0, right: 0 }

  const leftInsetRaw = vv.offsetLeft
  const rightInsetRaw = window.innerWidth - vv.width - vv.offsetLeft
  const vvLeftInset = Number.isFinite(leftInsetRaw) ? Math.max(0, Math.round(leftInsetRaw)) : 0
  const vvRightInset = Number.isFinite(rightInsetRaw) ? Math.max(0, Math.round(rightInsetRaw)) : 0

  // Android в landscape может рисовать системную 3-button навигацию сбоку,
  // но VisualViewport иногда отдаёт нули. Добавляем минимальный боковой запас.
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isLandscape = window.innerWidth > window.innerHeight
  const androidSideMinInset = isAndroid && isLandscape ? 64 : 0

  return {
    left: Math.max(vvLeftInset, androidSideMinInset),
    right: Math.max(vvRightInset, androidSideMinInset),
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
    }
  }, [])

  return null
}

