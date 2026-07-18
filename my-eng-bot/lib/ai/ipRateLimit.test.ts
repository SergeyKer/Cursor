import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkIpRateLimit } from '@/lib/ai/ipRateLimit'

describe('checkIpRateLimit', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VITEST', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

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

  it('is disabled under vitest so route suites are not throttled', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VITEST', 'true')

    const buckets = new Map()
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 1, now: 1 })
    ).toBe(true)
    expect(
      checkIpRateLimit({ buckets, ip: '1.1.1.1', windowMs: 1000, max: 1, now: 2 })
    ).toBe(true)
    expect(buckets.size).toBe(0)
  })
})
