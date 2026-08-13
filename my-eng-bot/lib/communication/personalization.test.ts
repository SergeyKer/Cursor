import { describe, expect, it } from 'vitest'
import { buildCommunicationPersonalizationRule } from '@/lib/communication/personalization'

describe('buildCommunicationPersonalizationRule', () => {
  it('seeds open thread from last assistant content words, not stopwords', () => {
    const rule = buildCommunicationPersonalizationRule({
      audience: 'adult',
      level: 'a1',
      lastUserText: 'history',
      lastAssistantText: 'Do you want to know about the towers or the inside?',
    })
    expect(rule).toContain('Open thread')
    expect(rule).toMatch(/towers|inside/)
    expect(rule).toContain('history')
    expect(rule).not.toMatch(/asked about want/)
  })

  it('omits Open thread when there is no last assistant text', () => {
    const rule = buildCommunicationPersonalizationRule({
      audience: 'adult',
      level: 'a1',
      lastUserText: 'history',
    })
    expect(rule).not.toContain('Open thread')
    expect(rule).toContain('history')
  })
})
