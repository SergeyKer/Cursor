import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/tts/xaiStreamTts', () => ({
  TTS_PCM_CONTENT_TYPE: 'audio/L16;rate=24000;channels=1',
  openXaiTtsPcmStream: vi.fn(),
}))

vi.mock('@/lib/tts/xaiHttpTts', () => ({
  fetchXaiTtsPcmBytes: vi.fn(),
}))

import { TTS_PCM_CONTENT_TYPE } from '@/lib/tts/xaiStreamTts'
import { fetchXaiTtsPcmBytes } from '@/lib/tts/xaiHttpTts'
import { POST } from './route'
import { ENGVO_XAI_MISSING_KEY_USER_MESSAGE as MISSING_KEY_MSG } from '@/lib/engvo/errors'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/communication/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/communication/tts', () => {
  const streamMock = fetchXaiTtsPcmBytes as unknown as ReturnType<typeof vi.fn>
  const originalKey = process.env.XAI_API_KEY
  const originalProxy = process.env.HTTPS_PROXY

  beforeEach(() => {
    streamMock.mockReset()
    streamMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    process.env.XAI_API_KEY = 'xai-test-secret-key-do-not-leak'
    process.env.HTTPS_PROXY = 'http://127.0.0.1:10809'
  })

  afterEach(() => {
    process.env.XAI_API_KEY = originalKey
    process.env.HTTPS_PROXY = originalProxy
  })

  it('fails when XAI_API_KEY is missing', async () => {
    process.env.XAI_API_KEY = ''
    const res = await POST(makeRequest({ text: 'Hello' }) as never)
    const data = (await res.json()) as { userMessage: string }
    expect(res.status).toBe(500)
    expect(data.userMessage).toBe(MISSING_KEY_MSG)
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('rejects empty text', async () => {
    const res = await POST(makeRequest({ text: '  ' }) as never)
    expect(res.status).toBe(400)
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('rejects text over 1200 chars', async () => {
    const res = await POST(makeRequest({ text: 'a'.repeat(1201) }) as never)
    expect(res.status).toBe(400)
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('defaults unknown voice to luna and does not send vocab replace', async () => {
    const res = await POST(makeRequest({ text: 'Hello there', voice_id: 'not-a-voice', speed: 0.6 }) as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(TTS_PCM_CONTENT_TYPE)
    const arg = streamMock.mock.calls[0]![0] as {
      voiceId: string
      speed: number
      replace?: unknown
    }
    expect(arg.voiceId).toBe('luna')
    expect(arg.speed).toBe(0.7)
    expect(arg.replace).toBeUndefined()
    expect(res.headers.get('X-Engvo-Tts-Mode')).toBe('unary')
  })
})
