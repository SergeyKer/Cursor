import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestPhraseTranslation } from '@/lib/client/requestPhraseTranslation'

describe('requestPhraseTranslation', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: 'Какая погода на улице?' }),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns translation for english phrase', async () => {
    const result = await requestPhraseTranslation({
      text: 'What is it like outside?',
      provider: 'openrouter',
      audience: 'adult',
    })

    expect(result).toEqual({ ok: true, translation: 'Какая погода на улице?' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/translate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'What is it like outside?',
          provider: 'openrouter',
          audience: 'adult',
        }),
      })
    )
  })

  it('returns error for empty text', async () => {
    const result = await requestPhraseTranslation({
      text: '   ',
      provider: 'openai',
      audience: 'adult',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Не удалось загрузить перевод')
    }
  })
})
