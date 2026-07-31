import { describe, expect, it } from 'vitest'
import { buildCommunicationMixLearningRule } from '@/lib/communicationMixLearningRule'

describe('buildCommunicationMixLearningRule', () => {
  it('always adds EN-only paraphrase coaching (product lock)', () => {
    for (const mode of ['mix', 'ru', 'en'] as const) {
      const systemPrompt = buildCommunicationMixLearningRule(mode)
      expect(systemPrompt).toContain('ALWAYS reply in English only')
      expect(systemPrompt).toContain('For longer or denser Russian input')
      expect(systemPrompt).toContain('one concise natural English paraphrase of the main meaning')
      expect(systemPrompt).toContain('Safety override')
    }
  })
})
