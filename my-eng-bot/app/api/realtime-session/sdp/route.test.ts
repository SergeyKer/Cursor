import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/realtime-session/sdp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/realtime-session/sdp', () => {
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

  it('returns 400 when sdp offer is missing', async () => {
    const res = await POST(makeRequest({}) as never)
    const data = (await res.json()) as { error: string }

    expect(res.status).toBe(400)
    expect(data.error).toContain('SDP offer')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails fast when OPENAI_API_KEY is missing', async () => {
    process.env.OPENAI_API_KEY = ''

    const res = await POST(makeRequest({ sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1' }) as never)
    const data = (await res.json()) as { error: string }

    expect(res.status).toBe(500)
    expect(data.error).toContain('OPENAI_API_KEY')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns SDP answer from upstream', async () => {
    const answerSdp = 'v=0\r\no=- 2 2 IN IP4 127.0.0.1'
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'primary failed',
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => answerSdp,
      })

    const offerSdp = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1'
    const res = await POST(makeRequest({ sdp: offerSdp }) as never)
    const data = (await res.json()) as { sdp: string }

    expect(res.status).toBe(200)
    expect(data.sdp).toBe(answerSdp)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [primaryUrl, primaryInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(primaryUrl).toContain('/v1/realtime?model=')
    expect(primaryInit.headers).toMatchObject({
      Authorization: 'Bearer server-secret-key',
      'Content-Type': 'application/sdp',
    })
    expect(primaryInit.body).toBe(offerSdp)

    const [fallbackUrl, fallbackInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(fallbackUrl).toContain('/v1/realtime/calls')
    expect(fallbackInit.headers).toMatchObject({
      Authorization: 'Bearer server-secret-key',
    })
    expect(fallbackInit.body).toBeInstanceOf(FormData)
    const form = fallbackInit.body as FormData
    expect(form.get('sdp')).toBe(offerSdp)
    const sessionRaw = form.get('session')
    expect(typeof sessionRaw).toBe('string')
  })

  it('returns upstream error and diagnostics status', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'primary failed',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ip: '203.0.113.10' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'US',
          regionName: 'Virginia',
          city: 'Ashburn',
          isp: 'Example ISP',
        }),
      })

    const res = await POST(makeRequest({ sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1' }) as never)
    const data = (await res.json()) as {
      error: string
      diagnostics?: { openAiStatus?: number }
    }

    expect(res.status).toBe(429)
    expect(data.error).toBe('rate limited')
    expect(data.diagnostics?.openAiStatus).toBe(429)
  })
})
