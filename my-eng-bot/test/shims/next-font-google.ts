/** Vitest shim: `next/font/google` is unavailable outside the Next.js compiler. */
type FontOptions = Record<string, unknown>

function createFontStub(_options?: FontOptions) {
  return {
    className: 'font-manrope-home-stub',
    style: { fontFamily: 'Manrope, sans-serif' },
    variable: '--font-manrope-home-stub',
  }
}

export const Manrope = createFontStub
export const Inter = createFontStub
export const Roboto = createFontStub
