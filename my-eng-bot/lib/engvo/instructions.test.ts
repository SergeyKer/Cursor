import { describe, expect, it } from 'vitest'
import { buildEngvoRealtimeInstructions } from './instructions'
import { buildEngvoRealtimeInstructionsClient } from './instructionsClient'

describe('buildEngvoRealtimeInstructions', () => {
  it('includes safety, english-only rule, CEFR and adult tone', () => {
    const result = buildEngvoRealtimeInstructions({
      audience: 'adult',
      level: 'a2',
    })

    expect(result).toContain('14+')
    expect(result).toContain('always answer in English only')
    expect(result).toContain('Audience style: ADULT.')
    expect(result).toContain('CEFR lexical ceiling (A2)')
    expect(result).toContain('respectful, concise, and calm')
    expect(result).toContain('For short, simple Russian input')
    expect(result).toContain('Do not mention Russian')
  })

  it('includes child tone and child-safe wording guidance', () => {
    const result = buildEngvoRealtimeInstructions({
      audience: 'child',
      level: 'a1',
    })

    expect(result).toContain('Audience style: CHILD.')
    expect(result).toContain('warm, simple, age-appropriate English')
    expect(result).toContain('CEFR lexical ceiling (A1)')
    expect(result).toContain('Avoid bureaucratic, overly formal, or adult business language.')
  })

  it('keeps client and server realtime instructions aligned', () => {
    expect(
      buildEngvoRealtimeInstructionsClient({
        audience: 'adult',
        level: 'b1',
      })
    ).toBe(
      buildEngvoRealtimeInstructions({
        audience: 'adult',
        level: 'b1',
      })
    )
  })
})
