import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/realtime-session/sdp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return (input as Request).url
}

/** Debug ingest не должен потреблять `mockResolvedValueOnce` из тестов OpenAI. */
function stubFetchWithDebugPassthrough(
  fetchMock: ReturnType<typeof vi.fn>,
  handler: (url: string) => Promise<Response>
) {
  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = getFetchUrl(input)
    if (url.includes('127.0.0.1:7359')) {
      return Promise.resolve(new Response('{}', { status: 200 }))
    }
    return handler(url)
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

  it('returns SDP answer from OpenAI /v1/realtime/calls (GA)', async () => {
    const answerSdp = 'v=0\r\no=- 2 2 IN IP4 127.0.0.1'
    stubFetchWithDebugPassthrough(fetchMock, async (url) => {
      if (url.includes('/v1/realtime/calls')) {
        return new Response(answerSdp, { status: 200 })
      }
      throw new Error(`Unexpected fetch URL in test: ${url}`)
    })

    const offerSdp = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1'
    const res = await POST(makeRequest({ sdp: offerSdp }) as never)
    const data = (await res.json()) as { sdp: string }

    expect(res.status).toBe(200)
    expect(data.sdp).toBe(answerSdp)

    const openAiCalls = fetchMock.mock.calls.filter(
      (c) => !getFetchUrl(c[0] as RequestInfo | URL).includes('127.0.0.1:7359')
    )
    expect(openAiCalls.length).toBeGreaterThanOrEqual(1)
    const [callsUrl, callsInit] = openAiCalls[0] as [string, RequestInit]
    expect(callsUrl).toContain('/v1/realtime/calls')
    expect(callsInit.headers).toMatchObject({
      Authorization: 'Bearer server-secret-key',
    })
    expect(callsInit.body).toBeInstanceOf(FormData)
    const form = callsInit.body as FormData
    expect(form.get('sdp')).toBe(offerSdp)
    const sessionRaw = form.get('session')
    expect(typeof sessionRaw).toBe('string')
    const session = JSON.parse(sessionRaw as string) as {
      type?: string
      model?: string
      voice?: unknown
      audio?: { output?: { voice?: string } }
    }
    expect(session.type).toBe('realtime')
    expect(session.model).toBeTruthy()
    expect(session.voice).toBeUndefined()
    expect(session.audio?.output?.voice).toBeTruthy()
  })

  it('returns userMessage for session.type API errors', async () => {
    stubFetchWithDebugPassthrough(fetchMock, async (url) => {
      if (url.includes('/v1/realtime/calls')) {
        return new Response("Missing required parameter: 'session.type'.", { status: 400 })
      }
      if (url.includes('ipify')) {
        return Response.json({ ip: '203.0.113.10' })
      }
      if (url.includes('ip-api')) {
        return Response.json({ status: 'fail' })
      }
      throw new Error(`Unexpected fetch URL in test: ${url}`)
    })

    const res = await POST(makeRequest({ sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1' }) as never)
    const data = (await res.json()) as { error: string; userMessage?: string }

    expect(res.status).toBe(400)
    expect(data.userMessage).toContain('голосовую сессию')
    expect(data.error).toContain('session.type')
  })

  it('returns upstream error and diagnostics status', async () => {
    stubFetchWithDebugPassthrough(fetchMock, async (url) => {
      if (url.includes('/v1/realtime/calls')) {
        return new Response('rate limited', { status: 429 })
      }
      if (url.includes('ipify')) {
        return Response.json({ ip: '203.0.113.10' })
      }
      if (url.includes('ip-api')) {
        return Response.json({
          status: 'success',
          country: 'US',
          regionName: 'Virginia',
          city: 'Ashburn',
          isp: 'Example ISP',
        })
      }
      throw new Error(`Unexpected fetch URL in test: ${url}`)
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
