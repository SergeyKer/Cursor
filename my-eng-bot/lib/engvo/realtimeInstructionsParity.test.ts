import { describe, expect, it } from 'vitest'
import { buildEngvoRealtimeInstructions } from '@/lib/engvo/instructions'
import { resolveEngvoRealtimeInstructionParams } from '@/lib/engvo/resolveRealtimeInstructionParams'
import { AI_SAFETY_MARKERS } from '@/lib/ai/safetyPolicy'
import { buildEngvoClientSessionUpdate } from '@/lib/engvo/realtimeSession'

describe('realtime instructions API parity', () => {
  it('resolve + build matches direct builder and includes safety', () => {
    const params = resolveEngvoRealtimeInstructionParams({
      audience: 'adult',
      level: 'b1',
      topic: 'food',
      kind: 'free_call',
      speed: 1,
    })
    const fromResolved = buildEngvoRealtimeInstructions(params)
    const direct = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'b1',
      topic: 'food',
      kind: 'free_call',
      speechSpeed: 1,
    })
    expect(fromResolved).toBe(direct)
    expect(fromResolved).toContain(AI_SAFETY_MARKERS.antiExfil)
  })
})

describe('buildEngvoClientSessionUpdate instructions omit', () => {
  it('omits instructions when not provided', () => {
    const session = buildEngvoClientSessionUpdate({
      model: 'gpt-realtime-mini',
      voice: 'marin',
      speed: 1,
    })
    expect(session).not.toHaveProperty('instructions')
  })

  it('includes instructions when provided', () => {
    const session = buildEngvoClientSessionUpdate({
      model: 'gpt-realtime-mini',
      voice: 'marin',
      speed: 1,
      instructions: 'test instructions',
    })
    expect(session.instructions).toBe('test instructions')
  })
})
