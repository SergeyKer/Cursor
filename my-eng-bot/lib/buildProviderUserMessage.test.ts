import { describe, expect, it } from 'vitest'
import { buildProviderUserMessage } from '@/lib/buildProviderUserMessage'

describe('buildProviderUserMessage', () => {
  it('maps OpenAI regional 403 to the chat warning text', () => {
    const errText = JSON.stringify({
      error: { code: 'unsupported_country_region_territory' },
    })
    const { userMessage, errorCode } = buildProviderUserMessage({
      provider: 'openai',
      status: 403,
      errText,
    })
    expect(errorCode).toBe('forbidden')
    expect(userMessage).toContain('unsupported_country_region_territory')
    expect(userMessage).toContain('OpenRouter')
  })

  it('maps 502 network errors to VPN/proxy hint', () => {
    const { userMessage } = buildProviderUserMessage({
      provider: 'openai',
      status: 502,
      errText: 'OpenAI fetch failed: ETIMEDOUT',
    })
    expect(userMessage).toContain('VPN')
  })

  it('uses translate-specific defaults when provided', () => {
    const { userMessage } = buildProviderUserMessage({
      provider: 'openai',
      status: 500,
      errText: 'unknown',
      defaultMessage: 'Не удалось получить перевод.',
      rateLimitMessage: 'Превышен лимит запросов. Попробуйте позже.',
    })
    expect(userMessage).toBe('Не удалось получить перевод.')
  })
})
