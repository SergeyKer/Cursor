import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import { POST } from './route'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE as MISSING_KEY_MSG } from '@/lib/engvo/errors'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/vocab/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/vocab/tts', () => {
  const fetchMock = fetchWithProxyFallback as unknown as ReturnType<typeof vi.fn>
  const originalKey = process.env.XAI_API_KEY

  beforeEach(() => {
    fetchMock.mockReset()
    process.env.XAI_API_KEY = 'xai-test-secret-key-do-not-leak'
  })

  afterEach(() => {
    process.env.XAI_API_KEY = originalKey
  })

  it('fails when XAI_API_KEY is missing', async () => {
    process.env.XAI_API_KEY = ''
    const res = await POST(makeRequest({ text: 'Eye' }) as never)
    const data = (await res.json()) as { userMessage: string }
    expect(res.status).toBe(500)
    expect(data.userMessage).toBe(MISSING_KEY_MSG)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects empty text', async () => {
    const res = await POST(makeRequest({ text: '  ' }) as never)
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('synthesizes mp3, clamps speed, defaults unknown voice to luna, sends Eye replace', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]).buffer, {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )

    const res = await POST(
      makeRequest({ text: 'Eye', voice_id: 'not-a-voice', speed: 0.6 }) as never
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/mpeg')
    const buf = new Uint8Array(await res.arrayBuffer())
    expect(Array.from(buf)).toEqual([1, 2, 3])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/v1/tts')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer xai-test-secret-key-do-not-leak',
    })
    const body = JSON.parse(String(init.body)) as {
      text: string
      voice_id: string
      speed: number
      replace?: Record<string, string>
    }
    expect(body.text).toBe('Eye')
    expect(body.voice_id).toBe('luna')
    expect(body.speed).toBe(0.7)
    expect(body.replace).toEqual({ Eye: '/aɪ/' })
    expect(JSON.stringify(body)).not.toContain('xai-test-secret')
  })

  it('accepts a valid built-in voice', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([9]).buffer, {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      })
    )
    const res = await POST(makeRequest({ text: 'hello', voice_id: 'eve', speed: 1 }) as never)
    expect(res.status).toBe(200)
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      voice_id: string
      replace?: unknown
    }
    expect(body.voice_id).toBe('eve')
    expect(body.replace).toBeUndefined()
  })
})
