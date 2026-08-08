import { describe, expect, it, vi } from 'vitest'
import { generateReferenceSheet } from '@/lib/reference/generateReferenceSheet'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceGenerate: false,
  },
}))

describe('generateReferenceSheet', () => {
  it('rejects generation when the flag is off without calling the network', async () => {
    const fetcher = vi.fn()
    const result = await generateReferenceSheet({
      query: 'present perfect usage',
      fetcher,
    })
    expect(result).toEqual({ kind: 'rejected', reason: 'generate_disabled' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects short tokens before checking the flag', async () => {
    const result = await generateReferenceSheet({ query: 'have' })
    expect(result).toEqual({ kind: 'rejected', reason: 'short_token' })
  })

  it('allows short query when generateQuery override is set (still respects flag)', async () => {
    const fetcher = vi.fn()
    const result = await generateReferenceSheet({
      query: 'get',
      generateQuery: 'get tired — become adjective',
      fetcher,
    })
    expect(result).toEqual({ kind: 'rejected', reason: 'generate_disabled' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
