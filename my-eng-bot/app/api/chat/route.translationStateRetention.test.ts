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

describe('POST /api/chat translation state retention', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('keeps success shape for correct translation answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий: Отлично! Верно передано действие.',
        'Переведи далее: Я обычно готовлю ужин по вечерам.',
        'Переведи на английский.',
        '__TRAN_REPEAT_REF__: I usually cook dinner in the evenings.',
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
        { role: 'user', content: 'I usually read books before bed.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).toContain('__TRAN_REPEAT_REF__:')
    expect(data.content).not.toContain('Комментарий_перевод:')
  })

  it('keeps error_repeat shape for meaningful but wrong answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_перевод: Хорошее начало, но есть ошибка формы.',
        'Ошибки:',
        '🔤 "go" → "went"',
        'Скажи: I went to the park yesterday.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      sentenceType: 'affirmative',
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Я ходил в парк вчера.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I went to the park yesterday.',
        },
        { role: 'user', content: 'I go to the park yesterday.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Ошибки:')
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('routes junk input to junk/error repeat and never marks it as success', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_мусор: Ответ должен быть на английском.',
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
        { role: 'user', content: 'ываыва' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    expect(res.status).toBe(200)
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('keeps active task in error_repeat until corrected, then switches to success', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий_перевод: Хорошая попытка, но нужен Past Simple.',
          'Ошибки:',
          '🔤 "go" → "went"',
          'Скажи: I went to the park yesterday.',
        ].join('\n'),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий: Отлично! Это корректный Past Simple.',
          'Переведи далее: Я не готовил ужин вчера.',
          'Переведи на английский.',
          '__TRAN_REPEAT_REF__: I did not cook dinner yesterday.',
        ].join('\n'),
      })
      .mockResolvedValueOnce({ ok: true, content: 'I did not cook dinner yesterday.' })

    const base = {
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      sentenceType: 'affirmative',
    }

    const firstReq = makeRequest({
      ...base,
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Я ходил в парк вчера.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I went to the park yesterday.',
        },
        { role: 'user', content: 'I go to the park yesterday.' },
      ],
    })
    const firstRes = await POST(firstReq as never)
    const firstData = (await firstRes.json()) as { content: string }
    expect(firstRes.status).toBe(200)
    expect(firstData.content).toContain('Комментарий_перевод:')
    expect(firstData.content).toContain('Скажи: I went to the park yesterday.')

    const secondReq = makeRequest({
      ...base,
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Я ходил в парк вчера.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I went to the park yesterday.',
        },
        { role: 'user', content: 'I go to the park yesterday.' },
        {
          role: 'assistant',
          content:
            'Комментарий_перевод: Хорошая попытка, но нужен Past Simple.\nОшибки:\n🔤 "go" → "went"\nСкажи: I went to the park yesterday.\n__TRAN_REPEAT_REF__: I went to the park yesterday.',
        },
        { role: 'user', content: 'I went to the park yesterday.' },
      ],
    })
    const secondRes = await POST(secondReq as never)
    const secondData = (await secondRes.json()) as { content: string }
    expect(secondRes.status).toBe(200)
    expect(secondData.content).toContain('Комментарий:')
    expect(secondData.content).toContain('Переведи далее:')
    expect(secondData.content).not.toContain('Комментарий_перевод:')
  })

  it('adds hidden ref fallback when model omits __TRAN_REPEAT_REF__ in error flow', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_перевод: Исправь время.',
        'Ошибки:',
        '🔤 "go" → "went"',
        'Скажи: I went to the park yesterday.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      sentenceType: 'affirmative',
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Я ходил в парк вчера.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I went to the park yesterday.',
        },
        { role: 'user', content: 'I go to the park yesterday.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    expect(res.status).toBe(200)
    expect(data.content).toContain('Скажи: I went to the park yesterday.')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('keeps canonical Say for drifted answers (I->we, typo, semantic replacement)', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий_перевод: Исправь фразу по образцу.',
          'Ошибки:',
          '🔤 Есть неточности.',
          'Скажи: We cook in the kitchin.',
        ].join('\n'),
      })
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий_перевод: Исправь смысл фразы.',
          'Ошибки:',
          '🔤 Есть смысловая замена.',
          'Скажи: I sweem in the kitchen.',
        ].join('\n'),
      })

    const base = {
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        {
          role: 'assistant' as const,
          content:
            'Переведи: Я готовлю на кухне.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I cook in the kitchen.',
        },
      ],
    }

    const firstReq = makeRequest({
      ...base,
      messages: [...base.messages, { role: 'user', content: 'We cook in the kitchin.' }],
    })
    const firstRes = await POST(firstReq as never)
    const firstData = (await firstRes.json()) as { content: string }
    expect(firstRes.status).toBe(200)
    expect(firstData.content).toContain('Скажи: I cook in the kitchen.')
    expect(firstData.content).not.toContain('Переведи далее:')

    const secondReq = makeRequest({
      ...base,
      messages: [...base.messages, { role: 'user', content: 'I sweem in the kitchen.' }],
    })
    const secondRes = await POST(secondReq as never)
    const secondData = (await secondRes.json()) as { content: string }
    expect(secondRes.status).toBe(200)
    expect(secondData.content).toContain('Скажи: I cook in the kitchen.')
    expect(secondData.content).not.toContain('Переведи далее:')
  })

  it('keeps canonical Say in junk flow when words are removed or extra words are added', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий_мусор: Нужен полный ответ на английском.\nСкажи: I cook dinner.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий_перевод: Есть лишние слова.\nОшибки:\n🔤 Убери лишние слова.\nСкажи: I cook quickly in the beautiful kitchen every day.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I usually cook dinner in the kitchen.' })

    const baseMessages = [
      {
        role: 'assistant' as const,
        content:
          'Переведи: Я обычно готовлю ужин на кухне.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I usually cook dinner in the kitchen.',
      },
    ]

    const shortReq = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [...baseMessages, { role: 'user', content: 'I cook dinner.' }],
    })
    const shortRes = await POST(shortReq as never)
    const shortData = (await shortRes.json()) as { content: string }
    expect(shortRes.status).toBe(200)
    expect(shortData.content).toContain('Скажи: I usually cook dinner in the kitchen.')
    expect(shortData.content).not.toContain('Переведи далее:')

    const extraReq = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        ...baseMessages,
        { role: 'user', content: 'I cook quickly in the beautiful kitchen every day with my friends.' },
      ],
    })
    const extraRes = await POST(extraReq as never)
    const extraData = (await extraRes.json()) as { content: string }
    expect(extraRes.status).toBe(200)
    expect(extraData.content).toContain('Скажи: I usually cook dinner in the kitchen.')
    expect(extraData.content).not.toContain('Переведи далее:')
  })
})
