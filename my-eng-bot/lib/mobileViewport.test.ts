import { describe, expect, it } from 'vitest'
import { isAndroidMobileUserAgent } from '@/lib/mobileViewport'

describe('isAndroidMobileUserAgent', () => {
  it('detects Android Chrome', () => {
    expect(
      isAndroidMobileUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
      )
    ).toBe(true)
  })

  it('returns false for desktop Chrome', () => {
    expect(
      isAndroidMobileUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      )
    ).toBe(false)
  })
})
