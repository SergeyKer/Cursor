import { describe, expect, it } from 'vitest'
import { buildEngvoRealtimeInstructions } from './instructions'

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
})
