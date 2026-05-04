import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callProviderChat } from '@/lib/callProviderChat'
import { fetchWithProxyFallback } from '@/lib/proxyFetch'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
  buildProxyFetchExtra: vi.fn(),
}))

describe('callProviderChat proxy behavior', () => {
  const mockedFetchWithProxyFallback = vi.mocked(fetchWithProxyFallback)

  beforeEach(() => {
    mockedFetchWithProxyFallback.mockReset()
    process.env.OPENAI_API_KEY = 'openai-key'
    process.env.OPENROUTER_API_KEY = 'openrouter-key'
    delete process.env.LESSON_PROVIDER_FETCH_TIMEOUT_MS
    process.env.HTTPS_PROXY = ''
    process.env.https_proxy = ''
    process.env.HTTP_PROXY = ''
    process.env.http_proxy = ''
    process.env.ALL_PROXY = ''
    process.env.all_proxy = ''
  })

  it('uses direct-first strategy for OpenRouter without system proxy dependency', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hello from openrouter' } }],
        }),
        { status: 200 }
      )
    )

    const req = { nextUrl: { origin: 'http://localhost:3007' } } as unknown as Parameters<typeof callProviderChat>[0]['req']
    const result = await callProviderChat({
      provider: 'openrouter',
      req,
      apiMessages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.ok).toBe(true)
    expect(mockedFetchWithProxyFallback).toHaveBeenCalledTimes(1)
    const thirdArg = mockedFetchWithProxyFallback.mock.calls[0]?.[2]
    expect(thirdArg).toMatchObject({
      includeSystemProxy: false,
      directFirst: true,
    })
  })

  it('returns structured 502 when OpenRouter fetch throws', async () => {
    mockedFetchWithProxyFallback.mockRejectedValueOnce(new Error('socket hang up'))

    const req = { nextUrl: { origin: 'http://localhost:3007' } } as unknown as Parameters<typeof callProviderChat>[0]['req']
    const result = await callProviderChat({
      provider: 'openrouter',
      req,
      apiMessages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.errText).toContain('OpenRouter fetch failed')
    }
  })

  it('treats empty OpenRouter content as a provider failure', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '' } }],
        }),
        { status: 200 }
      )
    )

    const req = { nextUrl: { origin: 'http://localhost:3007' } } as unknown as Parameters<typeof callProviderChat>[0]['req']
    const result = await callProviderChat({
      provider: 'openrouter',
      req,
      apiMessages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.errText).toContain('empty content')
    }
  })

  it('uses direct-first strategy for OpenAI when proxy is not configured', async () => {
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hello from openai' } }],
        }),
        { status: 200 }
      )
    )

    const req = { nextUrl: { origin: 'http://localhost:3007' } } as unknown as Parameters<typeof callProviderChat>[0]['req']
    const result = await callProviderChat({
      provider: 'openai',
      req,
      apiMessages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.ok).toBe(true)
    expect(mockedFetchWithProxyFallback).toHaveBeenCalledTimes(1)
    expect(mockedFetchWithProxyFallback.mock.calls[0]?.[0]).toContain('api.openai.com')
    expect(mockedFetchWithProxyFallback.mock.calls[0]?.[2]).toMatchObject({
      directFirst: true,
    })
  })

  it('prefers proxy for OpenAI when explicit env proxy is configured', async () => {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:10801'
    mockedFetchWithProxyFallback.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hello from openai via proxy' } }],
        }),
        { status: 200 }
      )
    )

    const req = { nextUrl: { origin: 'http://localhost:3007' } } as unknown as Parameters<typeof callProviderChat>[0]['req']
    const result = await callProviderChat({
      provider: 'openai',
      req,
      apiMessages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.ok).toBe(true)
    expect(mockedFetchWithProxyFallback).toHaveBeenCalledTimes(1)
    expect(mockedFetchWithProxyFallback.mock.calls[0]?.[2]).toBeUndefined()
  })
})
