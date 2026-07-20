import { describe, expect, it } from 'vitest'
import { isEngvoAllowedXaiVoice, isEngvoXaiVoice } from '@/lib/engvo/constants'
import { isEngvoCustomVoiceIdFormat } from '@/lib/engvo/voiceLab/customVoicesManifest'

describe('custom voices allowlist', () => {
  it('keeps built-in isEngvoXaiVoice to 26 roster only', () => {
    expect(isEngvoXaiVoice('luna')).toBe(true)
    expect(isEngvoXaiVoice('nlbqfwie')).toBe(false)
  })

  it('validates custom id format', () => {
    expect(isEngvoCustomVoiceIdFormat('nlbqfwie')).toBe(true)
    expect(isEngvoCustomVoiceIdFormat('vhui8mnvu0yd')).toBe(true)
    expect(isEngvoCustomVoiceIdFormat('LUNA')).toBe(false)
    expect(isEngvoCustomVoiceIdFormat('short')).toBe(false)
    expect(isEngvoCustomVoiceIdFormat('toolongvoiceidxxx')).toBe(false)
  })

  it('allows built-in via isEngvoAllowedXaiVoice; unknown custom not in empty manifest', () => {
    expect(isEngvoAllowedXaiVoice('eve')).toBe(true)
    expect(isEngvoAllowedXaiVoice('nlbqfwie')).toBe(false)
  })
})
