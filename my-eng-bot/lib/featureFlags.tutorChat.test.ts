import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('featureFlags.tutorChatV1', () => {
  const original = process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1
    vi.resetModules()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1
    else process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1 = original
    vi.resetModules()
  })

  it('defaults ON when env unset (Phase 6 rollout)', async () => {
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorChatV1).toBe(true)
  })

  it('stays ON for true', async () => {
    process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1 = 'true'
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorChatV1).toBe(true)
  })

  it('turns OFF only for exact false (rollback)', async () => {
    process.env.NEXT_PUBLIC_FEATURE_TUTOR_CHAT_V1 = 'false'
    const { featureFlags } = await import('@/lib/featureFlags')
    expect(featureFlags.tutorChatV1).toBe(false)
  })
})
