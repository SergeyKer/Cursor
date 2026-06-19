import { describe, expect, it } from 'vitest'
import { createEmptyBridge, serializeBridgeForHydration } from '@/lib/start/startBridge'

describe('hydrationSafety', () => {
  it('empty bridge serializes without client-only fields', () => {
    const serialized = serializeBridgeForHydration(createEmptyBridge())
    expect(serialized).not.toMatch(/undefined/)
    expect(JSON.parse(serialized)).toEqual({
      audience: null,
      audienceChosen: false,
      branchIntent: null,
      runtimeLoading: false,
    })
  })

  it('round-trip preserves bridge shape', () => {
    const bridge = {
      audience: 'adult' as const,
      audienceChosen: true,
      branchIntent: 'chat' as const,
      runtimeLoading: false,
    }
    expect(JSON.parse(serializeBridgeForHydration(bridge))).toEqual(bridge)
  })
})
