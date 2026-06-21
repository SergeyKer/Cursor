/**
 * iOS-style squircle mask (superellipse approximation).
 * Shared by favicon build (sharp) and AppIconFrame (CSS mask).
 */

/** Corner radius ratio used by iOS app icons (~22.37% of side). */
export const IOS_SQUIRCLE_RADIUS_RATIO = 0.2237

export function iosSquircleBorderRadiusPercent(): string {
  return `${(IOS_SQUIRCLE_RADIUS_RATIO * 100).toFixed(2)}%`
}

/**
 * SVG mask: white squircle on black - use with mask-image / sharp dest-in.
 */
export function squircleMaskSvg(size: number): string {
  const s = Math.max(1, Math.round(size))
  const r = Math.min(
    Math.round(s * IOS_SQUIRCLE_RADIUS_RATIO),
    Math.max(0, Math.floor(s / 2) - 1)
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect x="0" y="0" width="${s}" height="${s}" rx="${r}" ry="${r}" fill="white"/>
</svg>`
}

export function squircleMaskDataUrl(size: number): string {
  const svg = squircleMaskSvg(size)
  const encoded =
    typeof Buffer !== 'undefined'
      ? Buffer.from(svg).toString('base64')
      : btoa(svg)
  return `url("data:image/svg+xml;base64,${encoded}")`
}
