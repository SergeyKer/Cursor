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

describe('POST /api/chat translation provider payload', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('sends only two latest conversation messages to provider in translation mode', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_перевод: Хорошее начало! 🙌',
        'Комментарий: Ошибка времени. Нужен Present Simple.',
        'Ошибки:',
        '🔤 Грамматика: Используйте базовую форму глагола.',
        'Время: Present Simple — привычное действие.',
        'Конструкция: Subject + V1(s/es)',
        'Повтори_перевод: I usually read books.',
        'Повтори: I usually read books.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я обычно читаю книги.\nПереведи на английский.' },
        { role: 'user', content: 'I usually read books.' },
        { role: 'assistant', content: 'Переведи далее: Я часто бегаю утром.\nПереведи на английский.' },
        { role: 'user', content: 'I often run in the morning.' },
        { role: 'assistant', content: 'Переведи далее: Мы редко смотрим телевизор.\nПереведи на английский.' },
        { role: 'user', content: 'We rarely watch TV.' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(callProviderChatMock).toHaveBeenCalled()

    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const apiMessages = firstCall?.apiMessages ?? []
    const nonSystem = apiMessages.filter((m) => m.role !== 'system')

    expect(nonSystem).toHaveLength(2)
    expect(nonSystem[0]?.role).toBe('assistant')
    expect(nonSystem[0]?.content).toContain('Мы редко смотрим телевизор')
    expect(nonSystem[1]?.role).toBe('user')
    expect(nonSystem[1]?.content).toContain('We rarely watch TV')
  })

  it('keeps a single provider call when __TRAN_REPEAT_REF__ is reconstructed locally', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий: Отлично! Ты правильно построил утвердительную форму.',
        'Конструкция: Subject + V1(s/es)',
        'Формы:',
        '+: I usually read books before bed.',
        '?: Do I usually read books before bed?',
        '-: I do not usually read books before bed.',
        'Переведи далее: Я обычно читаю книги перед сном.',
        'Переведи на английский.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я обычно читаю книги перед сном.\nПереведи на английский.' },
        { role: 'user', content: 'I usually read books before bed.' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
  })
})
