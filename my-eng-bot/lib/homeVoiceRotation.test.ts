import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import { HOME_VOICE_LINES } from '@/lib/homeVoiceRotation'

describe('HOME_VOICE_LINES', () => {
  it('fits footer dynamic line limit without ellipsis', () => {
    for (const line of HOME_VOICE_LINES) {
      expect(line.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
    }
  })
})
