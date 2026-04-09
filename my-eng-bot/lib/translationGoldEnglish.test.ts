import { describe, expect, it, vi, beforeEach } from 'vitest'

const callProviderChatMock = vi.fn()

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: (...args: unknown[]) => callProviderChatMock(...args),
}))

describe('translationGoldEnglish', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('normalizeGoldEnglishSentence добавляет точку', async () => {
    const { normalizeGoldEnglishSentence } = await import('./translationGoldEnglish')
    expect(normalizeGoldEnglishSentence('Hello world')).toBe('Hello world.')
  })

  it('translateRussianPromptToGoldEnglish возвращает нормализованную строку', async () => {
    callProviderChatMock.mockResolvedValueOnce({ ok: true, content: 'I often cook for my friends.' })
    const { translateRussianPromptToGoldEnglish } = await import('./translationGoldEnglish')
    const req = {} as import('next/server').NextRequest
    const out = await translateRussianPromptToGoldEnglish({
      ruSentence: 'Я часто готовлю для своих друзей.',
      level: 'a2',
      audience: 'adult',
      provider: 'openai',
      req,
    })
    expect(out).toBe('I often cook for my friends.')
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
    const arg = callProviderChatMock.mock.calls[0]![0] as { maxTokens?: number }
    expect(arg.maxTokens).toBe(64)
  })

  it('при ошибке провайдера возвращает null', async () => {
    callProviderChatMock.mockResolvedValueOnce({ ok: false, status: 500, errText: 'x' })
    const { translateRussianPromptToGoldEnglish } = await import('./translationGoldEnglish')
    const req = {} as import('next/server').NextRequest
    const out = await translateRussianPromptToGoldEnglish({
      ruSentence: 'Привет.',
      level: 'a1',
      audience: 'child',
      provider: 'openai',
      req,
    })
    expect(out).toBeNull()
  })

  it('без кириллицы в строке возвращает null', async () => {
    const { translateRussianPromptToGoldEnglish } = await import('./translationGoldEnglish')
    const req = {} as import('next/server').NextRequest
    const out = await translateRussianPromptToGoldEnglish({
      ruSentence: '   ',
      level: 'a1',
      audience: 'adult',
      provider: 'openai',
      req,
    })
    expect(out).toBeNull()
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })
})
