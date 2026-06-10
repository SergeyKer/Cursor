function isIosDeviceUserAgent(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
}

/** iOS Chrome (CriOS). */
export function isIosChromeUserAgent(ua: string): boolean {
  return isIosDeviceUserAgent(ua) && /CriOS\/\d+/i.test(ua)
}

/** iOS Safari (не Chrome/Firefox/Edge на iOS). */
export function isIosSafariUserAgent(ua: string): boolean {
  if (!isIosDeviceUserAgent(ua)) return false
  if (/CriOS\/\d+/i.test(ua)) return false
  if (/FxiOS\/\d+/i.test(ua)) return false
  if (/EdgiOS\/\d+/i.test(ua)) return false
  if (/OPiOS\/\d+/i.test(ua)) return false
  return /Safari\/\d+/i.test(ua)
}

/** iOS Safari + Chrome (CriOS) — общая WebKit-ветка dialog layout. */
export function isIosWebKitBrowser(ua: string): boolean {
  return isIosSafariUserAgent(ua) || isIosChromeUserAgent(ua)
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

/**
 * Для iOS Safari при открытой клавиатуре overlap уже включает keyboard inset.
 * Чтобы не считать клавиатуру дважды (overlap + vv-bottom-inset), вычитаем её из overlap.
 */
export function normalizeIosSafariBottomOverlapPx(rawOverlapPx: number, keyboardInsetPx: number): number {
  if (!Number.isFinite(rawOverlapPx)) return 0
  if (!Number.isFinite(keyboardInsetPx) || keyboardInsetPx <= 0) return Math.max(0, Math.round(rawOverlapPx))
  return Math.max(0, Math.round(rawOverlapPx - keyboardInsetPx))
}

export function readIosSafariVisualBottomOverlapPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return computeIosSafariVisualBottomOverlapPx(window.innerHeight, vv.height, vv.offsetTop)
}

/** Overlap нижнего chrome для Safari и CriOS (у CriOS — через clientHeight). */
export function readIosWebKitVisualBottomOverlapPx(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  const ua = navigator.userAgent
  const baseHeight = isIosChromeUserAgent(ua)
    ? document.documentElement.clientHeight || window.innerHeight
    : window.innerHeight
  return computeIosSafariVisualBottomOverlapPx(baseHeight, vv.height, vv.offsetTop)
}