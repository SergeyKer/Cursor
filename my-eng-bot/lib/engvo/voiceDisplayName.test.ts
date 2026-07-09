import { describe, expect, it } from 'vitest'
import { formatEngvoVoiceDisplayName } from './voiceDisplayName'

describe('formatEngvoVoiceDisplayName', () => {
  it('capitalizes built-in voice ids', () => {
    expect(formatEngvoVoiceDisplayName('eve')).toBe('Eve')
    expect(formatEngvoVoiceDisplayName('luna')).toBe('Luna')
    expect(formatEngvoVoiceDisplayName('MARIN')).toBe('Marin')
  })

  it('returns empty for blank', () => {
    expect(formatEngvoVoiceDisplayName('')).toBe('')
    expect(formatEngvoVoiceDisplayName('   ')).toBe('')
  })
})
