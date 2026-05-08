import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/realtime-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/realtime-session', () => {
  const fetchMock = vi.fn()
  const originalOpenAiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    process.env.OPENAI_API_KEY = 'server-secret-key'
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey
    vi.unstubAllGlobals()
  })

  it('creates a browser-safe realtime session payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'sess_123',
        model: 'gpt-realtime-mini',
        voice: 'alloy',
        client_secret: {
          value: 'ephemeral-token',
          expires_at: 1234567890,
        },
      }),
    })

    const res = await POST(makeRequest({ audience: 'adult', voice: 'alloy', level: 'a2' }) as never)
    const data = (await res.json()) as {
      clientSecret: string
      instructions: string
      voice: string
      model: string
    }

    expect(res.status).toBe(200)
    expect(data.clientSecret).toBe('ephemeral-token')
    expect(data.instructions).toContain('always answer in English only')
    expect(data.model).toBe('gpt-realtime-mini')
    expect(data.voice).toBe('alloy')
    expect(JSON.stringify(data)).not.toContain('server-secret-key')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails fast when OPENAI_API_KEY is missing', async () => {
    process.env.OPENAI_API_KEY = ''

    const res = await POST(makeRequest({}) as never)
    const data = (await res.json()) as { error: string }

    expect(res.status).toBe(500)
    expect(data.error).toContain('OPENAI_API_KEY')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes through upstream errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message: 'rate limited',
        },
      }),
    })

    const res = await POST(makeRequest({ audience: 'child', voice: 'echo', level: 'a1' }) as never)
    const data = (await res.json()) as { error: string }

    expect(res.status).toBe(429)
    expect(data.error).toBe('rate limited')
  })
})
