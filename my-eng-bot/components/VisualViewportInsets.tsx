'use client'

import * as React from 'react'

function computeBottomInsetPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0

  // Практичная оценка перекрытия снизу:
  // - когда адресная строка/интерфейс браузера или системные overlay'и меняют полезную высоту,
  //   это отражается в visualViewport.height/offsetTop.
  const inset = window.innerHeight - vv.height - vv.offsetTop
  return Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0
}

export default function VisualViewportInsets() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    let raf = 0

    const apply = () => {
      raf = 0
      root.style.setProperty('--vv-bottom-inset', `${computeBottomInsetPx()}px`)
    }

    const scheduleApply = () => {
      if (raf) return
      raf = window.requestAnimationFrame(apply)
    }

    scheduleApply()

    window.addEventListener('resize', scheduleApply, { passive: true })
    window.addEventListener('orientationchange', scheduleApply, { passive: true })

    const vv = window.visualViewport
    vv?.addEventListener('resize', scheduleApply, { passive: true })
    vv?.addEventListener('scroll', scheduleApply, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', scheduleApply)
      window.removeEventListener('orientationchange', scheduleApply)
      vv?.removeEventListener('resize', scheduleApply)
      vv?.removeEventListener('scroll', scheduleApply)
    }
  }, [])

  return null
}

