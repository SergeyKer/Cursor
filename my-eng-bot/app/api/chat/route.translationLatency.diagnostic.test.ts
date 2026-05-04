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

describe('POST /api/chat translation latency diagnostics', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('keeps single translation turn under diagnostic budget', async () => {
    callProviderChatMock.mockImplementationOnce(
      async () =>
        await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                content: [
                  'Комментарий: Отлично.',
                  'Переведи далее: Я обычно читаю перед сном.',
                  'Переведи на английский.',
                  '__TRAN_REPEAT_REF__: I usually read before bed.',
                ].join('\n'),
              }),
            250
          )
        )
    )

    const req = makeRequest({
      mode: 'translation',
      audience: 'child',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я обычно читаю книги.\nПереведи на английский язык.' },
        { role: 'user', content: 'I usually read books.' },
      ],
    })

    const startedAt = Date.now()
    const res = await POST(req as never)
    const elapsedMs = Date.now() - startedAt

    expect(res.status).toBe(200)
    expect(elapsedMs).toBeLessThanOrEqual(3000)
  })

  it('reports p50/p95/p99 diagnostic latency on repeat calls', async () => {
    const delays = [120, 180, 260, 450, 900, 1200]
    const delayQueue = [...delays]
    callProviderChatMock.mockImplementation(
      async () =>
        await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                content: [
                  'Комментарий: Отлично.',
                  'Переведи далее: Я готовил блины, когда жена пришла.',
                  'Переведи на английский.',
                  '__TRAN_REPEAT_REF__: I was cooking pancakes when my wife came.',
                ].join('\n'),
              }),
            delayQueue.shift() ?? 120
          )
        )
    )

    const latencySamples: number[] = []
    for (let i = 0; i < delays.length; i++) {
      const req = makeRequest({
        mode: 'translation',
        audience: 'adult',
        level: 'b1',
        tenses: ['past_continuous'],
        sentenceType: 'affirmative',
        messages: [
          { role: 'assistant', content: 'Переведи: Я готовил блины, когда жена пришла.\nПереведи на английский язык.' },
          { role: 'user', content: 'I was cooking pancakes when my wife came.' },
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
  }, 15_000)
})
