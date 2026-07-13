import { describe, expect, it } from 'vitest'
import { buildLessonRouteCacheKey } from '@/lib/lessonRouteRuntime'

describe('buildLessonRouteCacheKey', () => {
  it('includes generationNonce when provided', () => {
    const withoutNonce = buildLessonRouteCacheKey({
      mode: 'generate',
      lessonId: '1',
      selectedVariantId: 'evening-dark',
      audience: 'adult',
      provider: 'openai',
      openAiChatPreset: 'gpt-4o-mini',
    })
    const withNonce = buildLessonRouteCacheKey({
      mode: 'generate',
      lessonId: '1',
      selectedVariantId: 'evening-dark',
      audience: 'adult',
      provider: 'openai',
      openAiChatPreset: 'gpt-4o-mini',
      generationNonce: 'nonce-abc',
    })
    expect(withoutNonce).toContain('no-nonce')
    expect(withNonce).toContain('nonce-abc')
    expect(withNonce).not.toBe(withoutNonce)
  })
})
