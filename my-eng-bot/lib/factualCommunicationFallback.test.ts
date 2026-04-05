import { describe, expect, it } from 'vitest'
import {
  buildSimpleNewsFactualFallback,
  isGenericEnglishClarification,
} from '@/lib/factualCommunicationFallback'

describe('factualCommunicationFallback', () => {
  it('detects generic clarification phrases', () => {
    expect(isGenericEnglishClarification('Could you explain what you mean?')).toBe(true)
    expect(isGenericEnglishClarification('Could you clarify what you mean?')).toBe(true)
    expect(isGenericEnglishClarification('Here are two updates about games today.')).toBe(false)
  })

  it('keeps short factual sentences from draft when available', () => {
    const out = buildSimpleNewsFactualFallback({
      draft: 'Game X update 1.2 came out today. Players got two new maps. This part is very long and hard and should not be used in low level output.',
      audience: 'adult',
      level: 'a2',
    })
    expect(out).toContain('Game X update 1.2 came out today.')
  })

  it('returns safe default factual fallback when no facts found', () => {
    const out = buildSimpleNewsFactualFallback({
      draft: 'Could you explain what you mean?',
      audience: 'adult',
      level: 'a2',
    })
    expect(out).toContain('I found game news.')
    expect(out).not.toContain('clarify')
  })

})
