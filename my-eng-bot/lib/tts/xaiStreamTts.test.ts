import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sockets } = vi.hoisted(() => ({
  sockets: [] as Array<{ sent: string[]; emit: (event: string, payload?: string) => void }>,
}))

vi.mock('ws', () => {
  const { EventEmitter } = require('node:events') as typeof import('node:events')
  class MockWs extends EventEmitter {
    static OPEN = 1
    static CONNECTING = 0
    readyState = 0
    sent: string[] = []
    constructor(public url: string) {
      super()
      sockets.push(this)
      queueMicrotask(() => {
        this.readyState = 1
        this.emit('open')
      })
    }
    send(payload: string) {
      this.sent.push(payload)
    }
    close() {
      this.readyState = 3
      this.emit('close')
    }
  }
  return { default: MockWs }
})

import { buildXaiTtsWsUrl, openXaiTtsPcmStream, TTS_PCM_SAMPLE_RATE } from '@/lib/tts/xaiStreamTts'

describe('openXaiTtsPcmStream', () => {
  beforeEach(() => {
    sockets.length = 0
  })

  afterEach(() => {
    sockets.length = 0
  })

  it('builds ws url with pcm latency=2 and speed', () => {
    const url = buildXaiTtsWsUrl('luna', 0.9)
    expect(url).toContain('wss://api.x.ai/v1/tts')
    expect(url).toContain('voice=luna')
    expect(url).toContain('codec=pcm')
    expect(url).toContain(`sample_rate=${TTS_PCM_SAMPLE_RATE}`)
    expect(url).toContain('optimize_streaming_latency=2')
    expect(url).toContain('speed=0.9')
  })

  it('streams audio.delta bytes then closes on audio.done', async () => {
    const stream = openXaiTtsPcmStream({
      apiKey: 'xai-test',
      text: 'Hi',
      voiceId: 'eve',
      speed: 1,
    })
    const reader = stream.getReader()
    await vi.waitFor(() => expect(sockets.length).toBe(1))
    const ws = sockets[0]!
    await vi.waitFor(() => expect(ws.sent.some((s) => s.includes('text.delta'))).toBe(true))
    expect(ws.sent.some((s) => s.includes('session.update'))).toBe(false)

    const pcm = Buffer.from([1, 2, 3, 4])
    ws.emit('message', JSON.stringify({ type: 'audio.delta', delta: pcm.toString('base64') }))
    ws.emit('message', JSON.stringify({ type: 'audio.done' }))

    const first = await reader.read()
    expect(first.done).toBe(false)
    expect(Array.from(first.value ?? [])).toEqual([1, 2, 3, 4])
    const end = await reader.read()
    expect(end.done).toBe(true)
  })

  it('sends replace via session.update before text', async () => {
    const stream = openXaiTtsPcmStream({
      apiKey: 'xai-test',
      text: 'Eye',
      voiceId: 'luna',
      speed: 1,
      replace: { Eye: '/aɪ/' },
    })
    const reader = stream.getReader()
    await vi.waitFor(() => expect(sockets.length).toBe(1))
    const ws = sockets[0]!
    await vi.waitFor(() => expect(ws.sent[0]).toContain('session.update'))
    expect(ws.sent.some((s) => s.includes('text.delta'))).toBe(false)
    ws.emit('message', JSON.stringify({ type: 'session.updated', replace: { Eye: '/aɪ/' } }))
    await vi.waitFor(() => expect(ws.sent.some((s) => s.includes('text.delta'))).toBe(true))
    ws.emit('message', JSON.stringify({ type: 'audio.done' }))
    await reader.read()
  })
})
