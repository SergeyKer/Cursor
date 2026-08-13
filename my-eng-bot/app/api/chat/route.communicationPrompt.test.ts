import { describe, expect, it } from 'vitest'
import { buildCommunicationMixLearningRule } from '@/lib/communicationMixLearningRule'

describe('buildCommunicationMixLearningRule', () => {
  it('always adds EN-only paraphrase coaching (product lock)', () => {
    for (const mode of ['mix', 'ru', 'en'] as const) {
      const systemPrompt = buildCommunicationMixLearningRule(mode)
      expect(systemPrompt).toContain('ALWAYS reply in English only')
      expect(systemPrompt).toContain('Fully Russian input is valid chat')
      expect(systemPrompt).toContain('one short English gist of the intent')
      expect(systemPrompt).toContain('Safety override')
      expect(systemPrompt).toContain('answers the last assistant question')
      expect(systemPrompt).toContain('Follow-up in an open thread: no gist')
      expect(systemPrompt).toContain('history of that place')
    }
  })
})
