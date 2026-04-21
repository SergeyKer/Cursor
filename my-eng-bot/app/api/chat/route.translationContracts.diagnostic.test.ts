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

describe('POST /api/chat translation contract diagnostics', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('injects required controls for first sentence generation', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий: Отлично.',
        'Переведи далее: Я не играл в футбол вчера.',
        'Переведи на английский.',
        '__TRAN_REPEAT_REF__: I did not play football yesterday.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'child',
      level: 'a2',
      tenses: ['past_simple'],
      sentenceType: 'negative',
      messages: [{ role: 'user', content: 'start' }],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''

    expect(systemPrompt).toContain('Required tense')
    expect(systemPrompt).toContain('sentence type')
    expect(systemPrompt).toContain('audience-style')
  })

  it('keeps translation controls for next sentence after success', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий: Отлично.',
        'Переведи далее: Когда я готовил ужин, дети играли.',
        'Переведи на английский.',
        '__TRAN_REPEAT_REF__: When I was cooking dinner, the children were playing.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'b1',
      tenses: ['past_continuous'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я читал книгу.\nПереведи на английский язык.' },
        { role: 'user', content: 'I was reading a book.' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''

    expect(systemPrompt).toContain('__TRAN_REPEAT_REF__')
    expect(systemPrompt).toContain('SUCCESS protocol')
    expect(systemPrompt).toContain('Переведи далее')
  })

  it('restores hidden __TRAN_REPEAT_REF__ from fallback when model omits it', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий: Нужен Present Simple.',
        'Скажи: I usually read books before bed.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Я обычно читаю книги перед сном.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I usually read books before bed.',
        },
        { role: 'user', content: 'I usually read book before bed.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Скажи: I usually read books before bed.')
  })

  it('keeps tense and sentence type controls stable across multi-step loop', async () => {
    callProviderChatMock.mockResolvedValue({
      ok: true,
      content: [
        'Комментарий: Отлично.',
        'Переведи далее: Я не готовил ужин, когда она пришла.',
        'Переведи на английский.',
        '__TRAN_REPEAT_REF__: I was not cooking dinner when she came.',
      ].join('\n'),
    })

    const basePayload = {
      mode: 'translation',
      audience: 'adult',
      level: 'b1',
      tenses: ['past_continuous'],
      sentenceType: 'negative',
    }

    const runs = [
      [{ role: 'user', content: 'start' }],
      [
        { role: 'assistant', content: 'Переведи: Я не готовил ужин, когда она пришла.\nПереведи на английский.' },
        { role: 'user', content: 'I was not cooking dinner when she came.' },
      ],
      [
        { role: 'assistant', content: 'Переведи: Я не играл в футбол вчера вечером.\nПереведи на английский.' },
        { role: 'user', content: 'I was not playing football yesterday evening.' },
      ],
    ]

    for (const messages of runs) {
      const req = makeRequest({ ...basePayload, messages })
      const res = await POST(req as never)
      expect(res.status).toBe(200)
    }

    const systemPrompts = callProviderChatMock.mock.calls
      .map((call) => (call[0] as { apiMessages?: Array<{ role: string; content: string }> } | undefined))
      .map((payload) => payload?.apiMessages?.find((m) => m.role === 'system')?.content ?? '')
      .filter((prompt) => prompt.includes('Translation training.'))

    expect(systemPrompts.length).toBeGreaterThanOrEqual(3)
    for (const prompt of systemPrompts) {
      expect(prompt).toContain('Required tense: Past Continuous')
      expect(prompt).toContain('sentence type (negative')
    }
  })
})
