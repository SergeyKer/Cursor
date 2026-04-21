import { beforeEach, describe, expect, it, vi } from 'vitest'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx] ?? 0
}

describe('POST /api/chat dialogue latency diagnostics', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('keeps single dialogue turn under diagnostic budget', async () => {
    callProviderChatMock.mockImplementationOnce(
      async () =>
        await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                content: 'What do you usually cook after work?',
              }),
            250
          )
        )
    )

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'free_talk',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you usually cook after work?' },
        { role: 'user', content: 'I usually cook pasta after work.' },
      ],
    })

    const startedAt = Date.now()
    const res = await POST(req as never)
    const elapsedMs = Date.now() - startedAt

    expect(res.status).toBe(200)
    expect(elapsedMs).toBeLessThanOrEqual(3000)
  })

  it('reports p50/p95/p99 diagnostic latency on repeat dialogue calls', async () => {
    const delays = [120, 180, 260, 450, 900, 1200]
    const delayQueue = [...delays]
    callProviderChatMock.mockImplementation(
      async () =>
        await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                content: 'How long have you been practicing this week?',
              }),
            delayQueue.shift() ?? 120
          )
        )
    )

    const latencySamples: number[] = []
    for (let i = 0; i < delays.length; i++) {
      const req = makeRequest({
        mode: 'dialogue',
        topic: 'free_talk',
        audience: 'adult',
        level: 'b1',
        tenses: ['present_perfect_continuous'],
        messages: [
          { role: 'assistant', content: 'How long have you been practicing this week?' },
          { role: 'user', content: 'I have been practicing for two hours.' },
        ],
      })
      const startedAt = Date.now()
      const res = await POST(req as never)
      latencySamples.push(Date.now() - startedAt)
      expect(res.status).toBe(200)
    }

    const p50 = percentile(latencySamples, 50)
    const p95 = percentile(latencySamples, 95)
    const p99 = percentile(latencySamples, 99)
    expect(p50).toBeLessThanOrEqual(2500)
    expect(p95).toBeLessThanOrEqual(5000)
    expect(p99).toBeLessThanOrEqual(5000)
  })
})
