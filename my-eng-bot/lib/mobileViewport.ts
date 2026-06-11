export function isAndroidMobileUserAgent(ua: string): boolean {
  return /Android/i.test(ua)
}

export function readVisualViewportHeightPx(): number | null {
  if (typeof window === 'undefined') return null
  const vv = window.visualViewport
  if (!vv) return null
  const h = vv.height
  return Number.isFinite(h) && h > 0 ? Math.max(1, Math.round(h)) : null
}

/** Сброс сдвига layout viewport на Android при фокусе в поле ввода. */
export function pinAndroidLayoutViewportScroll(): void {
  if (typeof window === 'undefined') return
  if (!isAndroidMobileUserAgent(navigator.userAgent)) return
  if (window.scrollY === 0 && document.documentElement.scrollTop === 0 && document.body.scrollTop === 0) {
    return
  }
  window.scrollTo(0, 0)
}
