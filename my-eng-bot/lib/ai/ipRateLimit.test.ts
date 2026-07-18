import { describe, expect, it } from 'vitest'
import { checkIpRateLimit } from '@/lib/ai/ipRateLimit'

describe('checkIpRateLimit', () => {
  it('allows up to max requests then blocks until window resets', () => {
    const buckets = new Map()
    const base = 1_000_000
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 2, now: base })
    ).toBe(true)
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 2, now: base + 1 })
    ).toBe(true)
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 2, now: base + 2 })
    ).toBe(false)
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 2, now: base + 1001 })
    ).toBe(true)
  })
})
