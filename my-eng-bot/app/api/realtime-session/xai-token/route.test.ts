import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/proxyFetch', () => ({
  fetchWithProxyFallback: vi.fn(),
}))

import { fetchWithProxyFallback } from '@/lib/proxyFetch'
import { POST } from './route'
import { ENGVO_XAI_MODEL } from '@/lib/engvo/constants'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE as MISSING_KEY_MSG } from '@/lib/engvo/errors'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/realtime-session/xai-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/realtime-session/xai-token', () => {
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
    const res = await POST(makeRequest({}) as never)
    const data = (await res.json()) as { error: string; userMessage: string }
    expect(res.status).toBe(500)
    expect(data.userMessage).toBe(MISSING_KEY_MSG)
    expect(JSON.stringify(data)).not.toContain('xai-test-secret')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mints token via fetchWithProxyFallback and does not leak API key', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          client_secret: { value: 'ephemeral-token-abc', expires_at: 1_700_000_000 },
        }),
        { status: 200 }
      )
    )

    const res = await POST(
      makeRequest({ voice: 'not-a-voice', speed: 0.5, audience: 'adult', topic: 'free_talk' }) as never
    )
    const data = (await res.json()) as {
      token: string
      expiresAt: number
      model: string
      voice: string
    }

    expect(res.status).toBe(200)
    expect(data.token).toBe('ephemeral-token-abc')
    expect(data.model).toBe(ENGVO_XAI_MODEL)
    expect(data.voice).toBe('luna')
    expect(data.expiresAt).toBe(1_700_000_000)
    expect(JSON.stringify(data)).not.toContain('xai-test-secret-key-do-not-leak')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/v1/realtime/client_secrets')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer xai-test-secret-key-do-not-leak',
    })
    const body = JSON.parse(String(init.body)) as { expires_after?: { seconds?: number }; session?: unknown }
    expect(body.expires_after?.seconds).toBe(300)
    expect(body.session).toBeUndefined()
  })

  it('clamps invalid speed and accepts valid xAI voice', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ value: 'tok', expires_at: 99 }), { status: 200 })
    )
    const res = await POST(makeRequest({ voice: 'carina', speed: 2 }) as never)
    const data = (await res.json()) as { voice: string; token: string }
    expect(res.status).toBe(200)
    expect(data.voice).toBe('carina')
    expect(data.token).toBe('tok')
  })

  it('maps upstream 401 to userMessage without leaking key', async () => {
    fetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }))
    const res = await POST(makeRequest({}) as never)
    const data = (await res.json()) as { userMessage?: string; error?: string }
    expect(res.status).toBe(401)
    expect(data.userMessage).toBeTruthy()
    expect(JSON.stringify(data)).not.toContain('xai-test-secret-key-do-not-leak')
  })

  it('blocks custom voice when API key does not own it (404)', async () => {
    const manifest = await import('@/data/engvo-custom-voices.json')
    const customId = manifest.voices[0]?.voiceId
    expect(customId).toMatch(/^[a-z0-9]{8,16}$/)

    fetchMock.mockResolvedValue(new Response('{"error":"not found"}', { status: 404 }))
    const res = await POST(makeRequest({ voice: customId }) as never)
    const data = (await res.json()) as { error?: string; userMessage?: string }
    expect(res.status).toBe(403)
    expect(data.error).toBe('custom_voice_unavailable_for_api_key')
    expect(data.userMessage).toMatch(/XAI_API_KEY/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain(`/v1/custom-voices/${customId}`)
  })
})
