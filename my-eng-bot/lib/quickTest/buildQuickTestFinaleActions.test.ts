import { describe, expect, it } from 'vitest'
import { buildQuickTestFinaleActions } from '@/lib/quickTest/buildQuickTestFinaleActions'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'

describe('buildQuickTestFinaleActions', () => {
  it('start band: variant + other test secondary, share tertiary', () => {
    const result = buildQuickTestFinaleActions({ band: 'start', nextVariantId: 'variant-2' })
    expect(result.primary.ctaPosition).toBe('finale_primary')
    expect(result.secondary.map((a) => a.id)).toEqual(['another_variant', 'other_test'])
    expect(result.tertiary.id).toBe('share')
    expect(result.tertiary.ctaPosition).toBe('finale_tertiary')
  })

  it('start band without variant fills grid without hole', () => {
    const result = buildQuickTestFinaleActions({ band: 'start', nextVariantId: null })
    expect(result.secondary).toHaveLength(1)
    expect(result.secondary[0]?.id).toBe('other_test')
    expect(result.secondary[0]?.spanFull).toBe(true)
  })

  it('strong band puts share in secondary', () => {
    const result = buildQuickTestFinaleActions({ band: 'strong', nextVariantId: 'variant-2' })
    expect(result.secondary.map((a) => a.id)).toEqual(['another_variant', 'share'])
    expect(result.tertiary.id).toBe('other_test')
  })

  it('perfect band puts share first in secondary', () => {
    const result = buildQuickTestFinaleActions({ band: 'perfect', nextVariantId: null })
    expect(result.secondary[0]?.id).toBe('share')
    expect(result.secondary[1]?.id).toBe('other_test')
    expect(result.primary.label).toBe(QUICK_TEST_COPY.finaleCtaPerfect)
  })
})
