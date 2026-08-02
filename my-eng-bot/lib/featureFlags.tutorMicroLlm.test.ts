import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('featureFlags.tutorMicroLlmV1', () => {
  const original = process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM
    vi.resetModules()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM
    else process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM = original
    vi.resetModules()
  })

  it('defaults OFF when env unset', async () => {
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorMicroLlmV1).toBe(false)
  })

  it('turns ON only for exact true', async () => {
    process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM = 'true'
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorMicroLlmV1).toBe(true)
  })

  it('stays OFF for false', async () => {
    process.env.NEXT_PUBLIC_FEATURE_TUTOR_MICRO_LLM = 'false'
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorMicroLlmV1).toBe(false)
  })
})
