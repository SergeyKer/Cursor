import { describe, expect, it } from 'vitest'
import type { AppColumnBounds } from '@/hooks/useAppColumnBounds'
import {
  resolveAppPanelHorizontalLayout,
  resolveAppPanelHorizontalStyle,
  shouldUseFullWidthAppPanel,
} from '@/lib/appPanelLayout'

function bounds(overrides: Partial<AppColumnBounds> = {}): AppColumnBounds {
  return {
    left: 400,
    width: 371,
    shellLeft: 380,
    shellRight: 800,
    isFullBleed: false,
    isPhoneViewport: false,
    ...overrides,
  }
}

describe('appPanelLayout', () => {
  it('uses full width on phone viewport', () => {
    const phone = bounds({ isPhoneViewport: true })
    expect(shouldUseFullWidthAppPanel(phone)).toBe(true)
    expect(resolveAppPanelHorizontalLayout(phone)).toEqual({ left: 0, right: 0 })
  })

  it('uses full width when column fills shell', () => {
    const wide = bounds({ left: 390, width: 390, shellLeft: 380, shellRight: 800 })
    expect(shouldUseFullWidthAppPanel(wide)).toBe(true)
    expect(resolveAppPanelHorizontalLayout(wide)).toEqual({ left: 0, right: 0 })
  })

  it('uses column left and width on desktop narrow column', () => {
    const desktop = bounds({ left: 500, width: 300, shellLeft: 380, shellRight: 1200 })
    expect(shouldUseFullWidthAppPanel(desktop)).toBe(false)
    expect(resolveAppPanelHorizontalLayout(desktop)).toEqual({ left: 500, width: 300 })
  })

  it('falls back to full bleed style when bounds are missing', () => {
    expect(resolveAppPanelHorizontalLayout(null)).toBeUndefined()
    expect(resolveAppPanelHorizontalStyle(null)).toEqual({ left: 0, right: 0 })
  })
})
