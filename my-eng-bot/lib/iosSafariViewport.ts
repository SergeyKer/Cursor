/** iOS Safari (не Chrome/Firefox/Edge на iOS). */
export function isIosSafariUserAgent(ua: string): boolean {
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  if (!isIosDevice) return false
  if (/CriOS\/\d+/i.test(ua)) return false
  if (/FxiOS\/\d+/i.test(ua)) return false
  if (/EdgiOS\/\d+/i.test(ua)) return false
  if (/OPiOS\/\d+/i.test(ua)) return false
  return /Safari\/\d+/i.test(ua)
}

/**
 * Перекрытие нижнего chrome Safari: layout viewport минус visual viewport.
 * Используется для подъёма fixed-футера и композера к видимому краю экрана.
 */
export function computeIosSafariVisualBottomOverlapPx(
  innerHeight: number,
  vvHeight: number,
  vvOffsetTop: number
): number {
  const inset = innerHeight - vvHeight - vvOffsetTop
  return Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0
}

export function readIosSafariVisualBottomOverlapPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return computeIosSafariVisualBottomOverlapPx(window.innerHeight, vv.height, vv.offsetTop)
}
