import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callOpenAiWebSearchAnswer } from '@/lib/openAiWebSearch'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

describe('callOpenAiWebSearchAnswer', () => {
  const mockedFetchWithProxyFallback = vi.mocked(fetchWithProxyFallback)

  beforeEach(() => {
    mockedFetchWithProxyFallback.mockReset()
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  it('returns plain answer text and normalized sources', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          output_text: 'В Токио сейчас около 12 °C.',
          output: [
            {
              type: 'web_search_call',
              action: {
                sources: [
                  {
                    title: 'Weather example',
                    url: 'https://example.com/weather?utm_source=openai',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      )
    )

    const result = await callOpenAiWebSearchAnswer({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'Какая сейчас погода в Токио?' }],
      language: 'ru',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('(i) В Токио сейчас около 12 °C.')
    expect(result.content).toContain('Источник:')
    expect(result.content).toContain('https://example.com/weather')
    expect(result.sources).toEqual([
      {
        title: 'Weather example',
        url: 'https://example.com/weather',
      },
    ])
  })
})
