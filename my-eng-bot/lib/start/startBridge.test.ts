import { describe, expect, it } from 'vitest'
import {
  bridgeForBranchActivation,
  createEmptyBridge,
  mergeBridgeState,
  resolveHomeMenuViewFromIntent,
  serializeBridgeForHydration,
} from '@/lib/start/startBridge'

describe('startBridge', () => {
  it('createEmptyBridge returns stable defaults', () => {
    expect(createEmptyBridge()).toEqual({
      audience: null,
      audienceChosen: false,
      branchIntent: null,
      runtimeLoading: false,
    })
  })

  it('mergeBridgeState patches audience child/adult', () => {
    const base = createEmptyBridge()
    expect(mergeBridgeState(base, { audience: 'child', audienceChosen: true })).toEqual({
      audience: 'child',
      audienceChosen: true,
      branchIntent: null,
      runtimeLoading: false,
    })
    expect(mergeBridgeState(base, { audience: 'adult', audienceChosen: true }).audience).toBe('adult')
  })

  it('bridgeForBranchActivation sets loading and intent', () => {
    expect(bridgeForBranchActivation('adult', 'chat')).toEqual({
      audience: 'adult',
      audienceChosen: true,
      branchIntent: 'chat',
      runtimeLoading: true,
    })
  })

  it('resolveHomeMenuViewFromIntent maps chat and hub', () => {
    expect(resolveHomeMenuViewFromIntent('chat')).toBe('aiChat')
    expect(resolveHomeMenuViewFromIntent('hub')).toBe('lessons')
    expect(resolveHomeMenuViewFromIntent(null)).toBe('root')
  })

  it('serializeBridgeForHydration is deterministic', () => {
    const bridge = bridgeForBranchActivation('child', 'hub')
    expect(serializeBridgeForHydration(bridge)).toBe(
      '{"audience":"child","audienceChosen":true,"branchIntent":"hub","runtimeLoading":true}'
    )
  })
})
