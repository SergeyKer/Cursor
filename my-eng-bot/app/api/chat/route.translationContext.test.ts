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
        '🔤 Используйте базовую форму глагола.',
        'Время: Present Simple — привычное действие.',
        'Конструкция: Subject + V1(s/es)',
        'Скажи: I usually read books.',
        'Скажи: I usually read books.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я обычно читаю книги.\nПереведи на английский язык.' },
        { role: 'user', content: 'I usually read books.' },
        { role: 'assistant', content: 'Переведи далее: Я часто бегаю утром.\nПереведи на английский язык.' },
        { role: 'user', content: 'I often run in the morning.' },
        { role: 'assistant', content: 'Переведи далее: Мы редко смотрим телевизор.\nПереведи на английский язык.' },
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

  it('asks the model to label the next drill as Переведи далее in success flow', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_перевод: Отлично! 🙌',
        'Ошибки:',
        '🔤 Ошибка времени. Нужен Present Continuous. Используйте правильную форму глагола.',
        'Время: Present Continuous — действие сейчас.',
        'Конструкция: am/is/are + V-ing',
        'Скажи: I am reading a book now.',
        'Скажи: I am reading a book now.',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_continuous'],
      sentenceType: 'affirmative',
      messages: [
        { role: 'assistant', content: 'Переведи: Я сейчас читаю книгу.\nПереведи на английский язык.' },
        { role: 'user', content: 'I am reading a book now.' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''

    expect(systemPrompt).toContain('Line 2: "Переведи далее: " + NEXT natural Russian sentence')
    expect(systemPrompt).toContain('In SUCCESS protocol do NOT output separate "Время:", "Конструкция:", "Формы:" or "Скажи:" lines.')
  })

  it('при наличии __TRAN__ в истории не дергает gold до основного вызова; finalize может запросить gold для скрытой строки', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({ ok: true, content: 'I usually read books before bed.' })

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
    expect(res.status).toBe(200)
    // Основной вызов тьютора + короткий вызов за gold для __TRAN__ в finalize (после ensureTranslationSuccessBlocks «Формы» уже сняты).
    expect(callProviderChatMock).toHaveBeenCalledTimes(2)
  })

  it('adds explicit RU→EN replacement hint in Ошибки for mixed answer words', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий_перевод: Хорошее начало вопроса. Исправь порядок слов.',
          'Ошибки:',
          '🔤 Ошибка формы вопроса. Поставь do перед подлежащим.',
          'Время: Present Simple — привычка или факт.',
          'Конструкция: Do/Does + subject + V1 ...?',
          'Скажи: What do you like as a pet?',
        ].join('\n'),
      })
      .mockResolvedValueOnce({ ok: true, content: 'What do you like as a pet?' })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a1',
      tenses: ['present_simple'],
      sentenceType: 'interrogative',
      messages: [
        {
          role: 'assistant',
          content:
            'Переведи: Какой питомец тебе нравится?\nПереведи на английский.\n__TRAN_REPEAT_REF__: What do you like as a pet?',
        },
        { role: 'user', content: 'What is you like питомец' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { content: string }
    expect(data.content).toContain('Комментарий_перевод: Хорошее начало вопроса.')
    expect(data.content).toContain('Ошибка формы вопроса. Поставь do перед подлежащим.')
    expect(data.content).toContain('Ошибки:')
    expect(data.content.toLowerCase()).toMatch(/📖\s*питомец\s*-\s*pet/)
  })

  it('normalizes second supportive sentence to fixed errors reference when multiple errors exist', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: [
        'Комментарий_перевод: Отличное начало вопроса! Исправь порядок слов и артикль.',
        'Комментарий: Ошибка типа предложения. Нужен вспомогательный глагол do.',
        'Ошибки:',
        '🔤 В вопросе нужен do перед you.',
        '📖 "movie" → "movies".',
        'Время: Present Simple — привычное действие.',
        'Конструкция: Do/Does + subject + V1 ...?',
        'Скажи: Do you like watching movies about animals?',
      ].join('\n'),
    })

    const req = makeRequest({
      mode: 'translation',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      sentenceType: 'interrogative',
      messages: [
        { role: 'assistant', content: 'Переведи: Тебе нравится смотреть фильмы о животных?\nПереведи на английский.' },
        { role: 'user', content: 'Do you like to see animals' },
      ],
    })

    const res = await POST(req as never)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { content: string }
    expect(data.content).toContain('Комментарий_перевод: Отличное начало вопроса.')
    expect(data.content).toContain('Комментарий: Лексическая ошибка — see нужно заменить на watching.')
    expect(data.content).not.toContain('Исправь порядок слов и артикль.')
    expect(data.content).toContain('Ошибки:')
    expect(data.content).toContain('🔤 В вопросе нужен do перед you.')
    expect(data.content).toContain('📖 "movie" → "movies".')
  })

})
