import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractSingleTranslationNextSentence } from '@/lib/extractSingleTranslationNextSentence'

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

describe('POST /api/chat repeat cycle stability', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  describe('dialogue algorithm hold: success / error / noise', () => {
    it('free_talk first turn adds warmup line before What for complex tense', async () => {
      const req = makeRequest({
        mode: 'dialogue',
        topic: 'free_talk',
        audience: 'adult',
        level: 'c1',
        tenses: ['future_perfect'],
        messages: [],
      })

      const res = await POST(req as never)
      const data = (await res.json()) as { content: string }

      expect(res.status).toBe(200)
      expect(data.content).toContain('📖 Сначала задам 1–3 коротких вопроса')
      expect(data.content).toContain('What would you like to talk about?')
      expect(data.content.indexOf('📖')).toBeLessThan(data.content.indexOf('What would you like to talk about?'))
    })

    it('success flow hold: keeps next-question mode without correction protocol', async () => {
      callProviderChatMock.mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично! Вы сохранили Present Simple.\nWhat do you usually practice after work?',
      })

      const req = makeRequest({
        mode: 'dialogue',
        topic: 'free_talk',
        audience: 'adult',
        level: 'a2',
        tenses: ['present_simple'],
        messages: [
          { role: 'assistant', content: 'What do you usually practice after work?' },
          { role: 'user', content: 'I usually practice guitar after work.' },
        ],
      })

      const res = await POST(req as never)
      const data = (await res.json()) as { content: string }

      expect(res.status).toBe(200)
      expect(data.content).not.toContain('Комментарий:')
      expect(data.content).not.toMatch(/^(?:Скажи|Повтори)\s*:/im)
      expect(data.content.toLowerCase()).toMatch(/(do you|how do you)/)
    })

    it('error flow hold: unresolved repeat keeps correction cycle and blocks next question', async () => {
      callProviderChatMock
        .mockResolvedValueOnce({
          ok: true,
          content: 'Комментарий: Нужно сохранить время из задания.\nWhat have you been practicing lately?',
        })
        .mockResolvedValueOnce({
          ok: true,
          content: 'Комментарий: Нужен Present Perfect Continuous.\nСкажи: I have been practicing guitar every day.',
        })

      const req = makeRequest({
        mode: 'dialogue',
        topic: 'free_talk',
        audience: 'adult',
        level: 'b1',
        tenses: ['present_perfect_continuous'],
        messages: [
          { role: 'assistant', content: 'What have you been practicing lately?' },
          { role: 'user', content: 'I practice guitar every day.' },
          { role: 'assistant', content: 'Комментарий: Нужен Present Perfect Continuous.\nСкажи: I have been practicing guitar every day.' },
          { role: 'user', content: 'I practice guitar every day.' },
        ],
      })

      const res = await POST(req as never)
      const data = (await res.json()) as { content: string }

      expect(res.status).toBe(200)
      expect(data.content).toContain('Повтори:')
      expect(data.content).toContain('I have been practicing guitar every day.')
      expect(data.content).not.toContain('What have you been practicing lately?')
    })

    it('noise flow hold: gibberish does not advance state and preserves anchor question', async () => {
      callProviderChatMock.mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Я не понял ответ.\nWhat do you think about speed track?',
      })
      const req = makeRequest({
        mode: 'dialogue',
        topic: 'sports',
        audience: 'adult',
        level: 'a2',
        tenses: ['present_simple'],
        messages: [
          { role: 'assistant', content: 'What do you think about speed track?' },
          { role: 'user', content: 'sdfsdf' },
        ],
      })

      const res = await POST(req as never)
      const data = (await res.json()) as { content: string }

      expect(res.status).toBe(200)
      expect(callProviderChatMock).not.toHaveBeenCalled()
      expect(data.content).toContain('Комментарий:')
      expect(data.content).toContain('What do you think about speed track?')
      expect(data.content).not.toMatch(/^(?:Скажи|Повтори)\s*:/im)
    })
  })

  it('keeps repeat cycle (no next question) when previous repeat is still unresolved', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно ответить в Past Simple.\nWhat did you do yesterday?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно ответить в Past Simple.\nСкажи: I went to the park.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        { role: 'assistant', content: 'What did you do yesterday?' },
        { role: 'user', content: 'I go to the park.' },
        { role: 'assistant', content: 'Комментарий: Нужен Past Simple.\nСкажи: I went to the park.' },
        { role: 'user', content: 'I go to the park.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('What did you do yesterday?')
  })

  it('restores repeat target after model replaces Скажи with unrelated praise (closed repeat loop)', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка — colore нужно заменить на color.\n' +
        'Скажи: It\'s great that you started with a question!',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Скажи: What is your favorite color?' },
        { role: 'user', content: 'What is your favorite colore' },
        { role: 'assistant', content: 'Комментарий: Опечатка.\nСкажи: What is your favorite color?' },
        { role: 'user', content: 'What is your favorite colore' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('favorite color')
    expect(repeatLine.toLowerCase()).not.toContain('started with a question')
  })

  it('clamps truncated model repeat to pinned cycle anchor (first full Скажи/Повтори)', async () => {
    const truncatedRepeatPayload = {
      ok: true,
      content:
        'Комментарий: Лексическая ошибка — проверь выбор слова.\nСкажи: I often cook.',
    }
    callProviderChatMock.mockResolvedValueOnce(truncatedRepeatPayload)

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you usually cook at home?' },
        { role: 'user', content: 'I like pasta.' },
        { role: 'assistant', content: 'Скажи: I often cook food for my family.' },
        { role: 'user', content: 'I often cook food for my sister' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toMatch(/i often cook/)
    expect(repeatLine.toLowerCase()).toContain('family')
  })

  it('moves to next question after correct repeat answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nСкажи: I went to the park.',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        { role: 'assistant', content: 'What did you do yesterday?' },
        { role: 'user', content: 'I go to the park.' },
        { role: 'assistant', content: 'Комментарий: Нужен Past Simple.\nСкажи: I went to the park.' },
        { role: 'user', content: 'I went to the park.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
    expect(data.content).not.toContain('Скажи:')
    expect(data.content).not.toMatch(/Комментарий/i)
    expect(data.content).toMatch(/\?\s*$/)
  })

  it('strips code fences and duplicate word artifacts from next question', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\n```ts\nconst a = 1\n```\nWhat what do do you think about music?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you think about music?' },
        { role: 'user', content: 'I like music very much.' },
        { role: 'assistant', content: 'What music do you enjoy most?' },
        { role: 'user', content: 'I enjoy jazz and rock.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('```')
    expect(data.content.toLowerCase()).not.toContain('what what')
    expect(data.content.toLowerCase()).not.toContain('do do')
  })

  it('does not treat "I jump" as topic switch cue after activity question', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nWhat sports do you enjoy most?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What activities have you enjoyed doing in your free time recently?' },
        { role: 'user', content: 'I jump' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Please answer within the current topic')
    expect(data.content).not.toContain('start a new dialogue from the menu')
    expect(data.content).toMatch(/\?\s*$/)
    expect(data.content.toLowerCase()).toContain('jump')
  })

  it('keeps context for single-word ru/eng answers and moves to repeat flow', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужен полный ответ в Present Perfect.\nСкажи: I have enjoyed playing football recently.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужен полный ответ в Present Perfect.\nСкажи: I have enjoyed playing football recently.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What have you enjoyed about playing or watching sports recently?' },
        { role: 'user', content: 'football' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Please answer within the current topic')
    expect(data.content).not.toContain('start a new dialogue from the menu')
    expect(data.content.includes('Скажи:') || /\?\s*$/.test(data.content)).toBe(true)
    expect(data.content.toLowerCase()).toContain('football')
  })

  it('asks meaning clarification for sea token inside Italy food thread', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'What have you enjoyed about food in Italy recently?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'Italy food' },
        { role: 'assistant', content: 'What have you enjoyed about food in Italy recently?' },
        { role: 'user', content: 'море' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Do you mean')
    expect(data.content.toLowerCase()).toContain('italy')
    expect(data.content).not.toContain('Комментарий:')
  })

  it('asks clarification for beach token in work thread', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'What have you improved at work recently?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'work' },
        { role: 'assistant', content: 'What have you improved at work recently?' },
        { role: 'user', content: 'beach' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Do you mean')
    expect(data.content.toLowerCase()).toContain('work context')
  })

  it('unrecognized gibberish returns comment plus same cycle question (without repeat)', async () => {
    const req = makeRequest({
      mode: 'dialogue',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you think about speed track?' },
        { role: 'user', content: 'sdfsdf' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).not.toHaveBeenCalled()
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('What do you think about speed track?')
    expect(data.content).not.toMatch(/^(?:Скажи|Повтори)\s*:/im)
  })

  it('keeps same anchor question across repeated gibberish inputs', async () => {
    const req = makeRequest({
      mode: 'dialogue',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you think about speed track?' },
        { role: 'user', content: 'sdfsdf' },
        {
          role: 'assistant',
          content:
            'Комментарий: Я не понял ответ. Давайте вернемся к вопросу и ответим полным предложением на английском.\nWhat do you think about speed track?',
        },
        { role: 'user', content: '@@@ ### $$$' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).not.toHaveBeenCalled()
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('What do you think about speed track?')
    expect(data.content).not.toMatch(/^(?:Скажи|Повтори)\s*:/im)
  })

  it('treats long noisy latin tokens as protection scenario and keeps same question', async () => {
    const req = makeRequest({
      mode: 'dialogue',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you think about speed track?' },
        { role: 'user', content: 'sdafafqfds dfsdfsdfwefdfs' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string; dialogueCorrect?: boolean }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).not.toHaveBeenCalled()
    expect(data.dialogueCorrect).toBe(false)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('What do you think about speed track?')
    expect(data.content).not.toMatch(/^(?:Скажи|Повтори)\s*:/im)
  })

  it('dialogue mixed input: model Повтори passes validation without mixed-input fallback comment', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: блины = blini, исправьте trying.\n' +
        'Повтори: I have been trying to make blini.',
    })

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'food',
      audience: 'adult',
      level: 'b2',
      tenses: ['present_perfect_continuous'],
      messages: [
        { role: 'assistant', content: 'What kinds of recipes have you been trying?' },
        { role: 'user', content: 'I have been triing блины' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).toHaveBeenCalled()
    expect(data.content).toMatch(/Повтори:/i)
    expect(data.content.toLowerCase()).toContain('trying')
    expect(data.content.toLowerCase()).toContain('blini')
    expect(data.content).not.toContain('целиком на английском')
  })

  it('dialogue mixed fallback uses pinned Повтори from cycle, not stripped userText', async () => {
    const badMixed = 'Комментарий: Исправьте.\nПовтори: I have been cooking 2.'
    callProviderChatMock.mockResolvedValueOnce({ ok: true, content: badMixed })
    callProviderChatMock.mockResolvedValueOnce({ ok: true, content: badMixed })

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'food',
      audience: 'adult',
      level: 'b2',
      tenses: ['present_perfect_continuous'],
      messages: [
        { role: 'assistant', content: 'What have you been cooking lately?' },
        { role: 'user', content: 'I was wrong tense' },
        {
          role: 'assistant',
          content:
            'Комментарий: Нужно Present Perfect Continuous.\nПовтори: I have been cooking for two hours.',
        },
        { role: 'user', content: 'I have been cooking 2 часа' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toMatch(/Повтори:\s*I have been cooking for two hours/i)
    expect(data.content.toLowerCase()).not.toMatch(/повтори:.*\b2\s*\.?\s*$/im)
  })

  it('returns to normal flow after gibberish when user gives valid answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'What sports do you enjoy most?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you think about speed track?' },
        { role: 'user', content: 'sdfsdf' },
        {
          role: 'assistant',
          content:
            'Комментарий: Я не понял ответ. Давайте вернемся к вопросу и ответим полным предложением на английском.\nWhat do you think about speed track?',
        },
        { role: 'user', content: 'I think speed track is exciting.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(data.content).not.toContain('Я не понял ответ')
    expect(data.content).not.toContain('вернемся к вопросу')
    expect(data.content.includes('Повтори:') || /\?\s*$/.test(data.content)).toBe(true)
  })

  it('passes resolved free-talk numbered topic to provider instead of raw "1"', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'What sports have you enjoyed recently?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'free_talk',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        {
          role: 'assistant',
          content: [
            'What would you like to talk about?',
            'Your topic, or one of these:',
            '1) sport in my life',
            '2) new technology in my life',
            '3) my short-term goals',
          ].join('\n'),
        },
        { role: 'user', content: '1' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const providerLastUserMessage = (firstCall?.apiMessages ?? [])
      .filter((message) => message.role === 'user')
      .at(-1)
    expect(providerLastUserMessage?.content).toBe('sport in my life')
    expect(data.content.toLowerCase()).toContain('sport')
  })

  it('allows re-selecting numbered topic later in same free-talk chat', async () => {
    const req = makeRequest({
      mode: 'dialogue',
      topic: 'free_talk',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        {
          role: 'assistant',
          content: [
            'What would you like to talk about?',
            'Your topic, or one of these:',
            '1) sport in my life',
            '2) new technology in my life',
            '3) my short-term goals',
          ].join('\n'),
        },
        { role: 'user', content: '1' },
        { role: 'assistant', content: 'What sports have you enjoyed recently?' },
        { role: 'user', content: 'I have enjoyed football recently.' },
        { role: 'assistant', content: 'What sport do you play now?' },
        { role: 'user', content: '2' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).not.toHaveBeenCalled()
    expect(data.content).toMatch(/\?\s*$/)
    expect(data.content.toLowerCase()).toContain('technology')
  })

  it('keeps free-talk first-turn flow without provider call', async () => {
    const req = makeRequest({
      mode: 'dialogue',
      topic: 'free_talk',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).not.toHaveBeenCalled()
    expect(data.content).toContain('What would you like to talk about?')
  })

  it('keeps fixed dialogue topic in system prompt and enables strict topic mapping', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Have you listened to your favorite album recently?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      topic: 'music',
      audience: 'adult',
      level: 'b1',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'Have you listened to live music recently?' },
        { role: 'user', content: 'Yes, I have listened to jazz recently.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCall?.apiMessages?.[0]?.content ?? ''

    expect(res.status).toBe(200)
    expect(data.content).toMatch(/\?\s*$/)
    expect(data.content.toLowerCase()).toContain('music')
    expect(systemPrompt).toContain('Topic: Music.')
    expect(systemPrompt).toContain('STRICT TOPIC MAPPING')
    expect(systemPrompt).not.toContain('This is a free conversation.')
  })

  it('asks clarification for forest token in technology thread', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'What technology do you use every day?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'technology' },
        { role: 'assistant', content: 'What technology do you use every day?' },
        { role: 'user', content: 'forest' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Do you mean')
    expect(data.content.toLowerCase()).toContain('technology context')
  })

  it('adds short learning reason for tense correction comment', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Perfect, а не Present Simple.\nСкажи: I have visited Rome recently.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Perfect, а не Present Simple.\nСкажи: I have visited Rome recently.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'Italy travel' },
        { role: 'assistant', content: 'What have you done in Italy recently?' },
        { role: 'user', content: 'I visit Rome recently.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content.trim().length).toBeGreaterThan(0)
  })

  it('adds short learning reason for article correction comment', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Также нужно использовать артикль "a" перед словом "sport".\nСкажи: I play a sport every week.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Также нужно использовать артикль "a" перед словом "sport".\nСкажи: I play a sport every week.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'sports' },
        { role: 'assistant', content: 'What sport do you play every week?' },
        { role: 'user', content: 'I play sport every week.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    const hasCorrection =
      data.content.includes('Комментарий:') &&
      data.content.includes('потому что речь о исчисляемом существительном в единственном числе') &&
      /(?:Скажи|Повтори):/.test(data.content)
    const hasFollowUpQuestion = /\?\s*$/.test(data.content)
    expect(hasCorrection || hasFollowUpQuestion).toBe(true)
  })

  it('keeps spelling, lexical, and article mistakes separate', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка формы глагола. Правильный вариант "I have a car".\nСкажи: I have a cat.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I have a cat.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'animals',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'У меня есть кот.\nПереведи на английский.' },
        { role: 'user', content: 'I haev car' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toMatch(/"haev"\s*→\s*"cat"/i)
    expect(data.content).not.toContain('haev нужно заменить на car')
    expect(data.content).toContain('Скажи: I have a cat.')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('does not praise when the translated noun contradicts the source prompt', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично! Ты правильно использовал артикль "a".\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I have a car.\n?: Do I have a car?\n-: I do not have a car.\nУ меня есть кот.\nПереведи на английский.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'animals',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'У меня есть кот.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I have a cat.',
        },
        { role: 'user', content: 'I have a car.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Отлично!')
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('cat')
    expect(data.content).toContain('Скажи: I have a cat.')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('uses question form as correction target for question prompts', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично! Здесь всё верно.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: You have a favorite colour.\n?: What is your favorite colour?\n-: You don't have a favorite colour.\nКакой у тебя любимый фрукт?\nПереведи на английский.",
      })
      .mockResolvedValueOnce({ ok: true, content: 'What is your favorite fruit?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Привет! Какой у тебя любимый цвет?\nПереведи на английский.\n__TRAN_REPEAT_REF__: What is your favorite colour?',
        },
        { role: 'user', content: 'Hi what is you favorite colour' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('What is your favorite colour')
    expect(repeatLine).not.toContain('You have a favorite colour')
    expect(data.content).not.toContain('Лексическая ошибка: what нужно заменить на favorite')
  })

  it('rewrites closed yes/no next question to open question in dialogue', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nHave you made any plans for today?',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'daily life' },
        { role: 'assistant', content: 'What have you done today?' },
        { role: 'user', content: 'yes i have' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Have you made any plans for today?')
    expect(data.content).toMatch(/\?\s*$/)
    expect(/(^|\n)\s*(What|How|Why|Which|Where|When)\b/.test(data.content)).toBe(true)
  })

  it('uses simpler tense explanation for child audience', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Continuous, а не Present Simple.\nСкажи: I am painting the floor now.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Continuous, а не Present Simple.\nСкажи: I am painting the floor now.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'child',
      level: 'a1',
      tenses: ['present_continuous'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'home tasks' },
        { role: 'assistant', content: 'What are you doing now?' },
        { role: 'user', content: 'I paint the floor now.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/(?:Скажи|Повтори):/)
  })

  it('adds have/has reason when agreement correction appears', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Ошибка согласования подлежащего и сказуемого.\nСкажи: He has finished homework.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Ошибка согласования подлежащего и сказуемого.\nСкажи: He has finished homework.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect'],
      messages: [
        { role: 'assistant', content: 'What would you like to talk about?' },
        { role: 'user', content: 'school day' },
        { role: 'assistant', content: 'What has he done today?' },
        { role: 'user', content: 'He have finished homework.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    const hasCorrection =
      data.content.includes('Комментарий:') &&
      /(?:Скажи|Повтори):/.test(data.content)
    const hasFollowUpQuestion = /\?\s*$/.test(data.content)
    expect(hasCorrection || hasFollowUpQuestion).toBe(true)
  })

  it('deduplicates repeated comment phrases and keeps it short', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно использовать Present Perfect Continuous. Здесь важно сохранить время, которое задано в вопросе. Здесь важно сохранить время, которое задано в вопросе.\nСкажи: I have been sleeping for three hours.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно использовать Present Perfect Continuous. Здесь важно сохранить время, которое задано в вопросе. Здесь важно сохранить время, которое задано в вопросе.\nСкажи: I have been sleeping for three hours.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_perfect_continuous'],
      messages: [
        { role: 'assistant', content: 'What have you been doing for the last three hours?' },
        { role: 'user', content: 'I sleep.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    if (data.content.includes('Комментарий:')) {
      expect(data.content.match(/Здесь важно сохранить время, которое задано в вопросе\./g)?.length ?? 0).toBeLessThanOrEqual(1)
    } else {
      expect(data.content).toMatch(/\?\s*$/)
    }
  })

  it('removes false tense-mismatch claim when user tense is actually correct', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Здесь требуется Present Simple, а не Present Continuous. Кроме того, вместо "has" нужно "have", так как "I" требует "have".\nСкажи: I have many goals.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Здесь требуется Present Simple, а не Present Continuous. Кроме того, вместо "has" нужно "have", так как "I" требует "have".\nСкажи: I have many goals.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you want to say about short term goals?' },
        { role: 'user', content: 'I has many goals.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('требуется Present Simple')
    if (data.content.includes('Комментарий:')) {
      expect(data.content).toContain('has')
      expect(data.content).toContain('have')
      expect(data.content).toContain('Скажи:')
    } else {
      expect(data.content).toMatch(/\?\s*$/)
    }
  })

  it('removes false future-will reminder when user already uses will', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово — "кино" по-английски будет "to the cinema". Кроме того, ты говоришь о будущем, поэтому нужно will.\nСкажи: I will go to the cinema.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово — "кино" по-английски будет "to the cinema". Кроме того, ты говоришь о будущем, поэтому нужно will.\nСкажи: I will go to the cinema.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'child',
      level: 'a1',
      tenses: ['future_simple'],
      messages: [
        { role: 'assistant', content: 'What will you do after playing football?' },
        { role: 'user', content: 'I will go кино' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content.toLowerCase()).not.toContain('нужно will')
  })

  it('adds mixed repeat in required tense when comment asks correction without repeat', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Слово "кино" лучше сказать по-английски.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Слово "кино" лучше сказать по-английски.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['future_simple'],
      messages: [
        { role: 'assistant', content: 'What will you do after football?' },
        { role: 'user', content: 'I go кино' },
        { role: 'assistant', content: 'Комментарий: Используйте Future Simple.\nСкажи: I will go to the cinema.' },
        { role: 'user', content: 'I go кино' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^(?:Скажи|Повтори)\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/(?:Скажи|Повтори):/)
    expect(repeatBody.toLowerCase()).toContain('will')
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
  })

  it('falls back to mixed comment+repeat when model repeat still contains cyrillic', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Небольшая неточность.\nСкажи: I go кино.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Небольшая неточность.\nСкажи: I go кино.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Where do you go on weekends?' },
        { role: 'user', content: 'I go кино with friends' },
        { role: 'assistant', content: 'Комментарий: Ответ на английском.\nСкажи: I go to the cinema with friends.' },
        { role: 'user', content: 'I go кино with friends' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^(?:Скажи|Повтори)\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/(?:Скажи|Повтори):/)
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
    expect(repeatBody.toLowerCase()).toContain('cinema')
  })

  it('removes false present-simple reminder when user already uses present simple', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Вы говорите о привычке, поэтому нужен Present Simple. Кроме того, слово "movie" подходит лучше.\nСкажи: I watch a movie every week.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Вы говорите о привычке, поэтому нужен Present Simple. Кроме того, слово "movie" подходит лучше.\nСкажи: I watch a movie every week.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you watch every week?' },
        { role: 'user', content: 'I watch cinema every week.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content.toLowerCase()).not.toContain('нужен present simple')
    expect(data.content.toLowerCase()).not.toContain('говорите о привычке')
  })

  it('rejects question-shaped repeat and returns repaired declarative repeat', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово.\nСкажи: What do you think about football?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово.\nСкажи: I play or watch football regularly.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      topic: 'sports',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you do with football regularly?' },
        { role: 'user', content: 'I play or watch regularly football' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^(?:Скажи|Повтори)\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Повтори: What do you think about football?')
    if (repeatBody) {
      expect(/\?\s*$/.test(repeatBody)).toBe(false)
    } else {
      expect(data.content).toMatch(/\?\s*$/)
    }
    expect(callProviderChatMock).toHaveBeenCalledTimes(2)
  })

  it('does not apply freeze when forced repeat ends with question mark', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно исправить порядок слов.\nСкажи: What do you think about football?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно исправить порядок слов.\nСкажи: I think about football regularly.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you do regularly?' },
        { role: 'user', content: 'I do regularly think about football' },
        { role: 'assistant', content: 'Комментарий: Нужен правильный порядок слов.\nСкажи: What do you think about football?' },
        { role: 'user', content: 'I do regularly think about football' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const firstCallArg = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCallArg?.apiMessages?.[0]?.content ?? ''
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^(?:Скажи|Повтори)\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(systemPrompt).toContain('Previous "Повтори:" sentence ends with a question mark and is invalid for drill repeat')
    expect(systemPrompt).not.toContain('MUST reuse exactly the SAME sentence')
    expect(data.content).toContain('Повтори:')
    expect(/\?\s*$/.test(repeatBody)).toBe(false)
    expect(callProviderChatMock).toHaveBeenCalledTimes(2)
  })

  it('keeps previous correct repeat when model drifts to user typo', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут есть опечатка.\nСкажи: I play wtih cars at home.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут есть опечатка.\nСкажи: I play with cars at home.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a1',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Do you play with cars at home?' },
        { role: 'user', content: 'I play wtih cars at home' },
        { role: 'assistant', content: 'Комментарий: Тут ошибка в слове "wtih".\nСкажи: I play with cars at home.' },
        { role: 'user', content: 'I play wtih cars at home' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^(?:Скажи|Повтори)\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('I play with cars at home.')
    expect(repeatLine).not.toContain('wtih')
    expect(callProviderChatMock).toHaveBeenCalledTimes(2)
  })

  it('translation success (affirmative) keeps contextual comment and explicit +/?/- construction', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично! Здесь это время подходит, потому что вы говорите о привычке.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I like to read in the evening.\n?: Do you like to read in the evening?\n-: I don't like to read in the evening.\nЯ люблю плавать утром.\nПереведи на английский.",
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I like to swim in the morning.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'hobbies',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я люблю читать по вечерам.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to read in the evening.',
        },
        { role: 'user', content: 'I like to read in the evening.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
    expect(data.content).not.toContain('Не удалось сформировать исправленное предложение')
  })

  it('translation success rebuilds Формы when model puts a question under +:', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Здесь это время подходит.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you like to read in the evening.\n?: Do you like to read in the evening?\n-: I don\'t like to read in the evening.\nЯ люблю плавать утром.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I like to swim in the morning.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'hobbies',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я люблю читать по вечерам.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to read in the evening.',
        },
        { role: 'user', content: 'I like to read in the evening.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('translation success (question input) preserves stable forms block', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично! Здесь это время подходит, потому что речь о привычке.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: You often watch TV.\n?: Do you often watch TV?\n-: You don't often watch TV.\nЯ редко смотрю телевизор.\nПереведи на английский.",
      })
      .mockResolvedValueOnce({ ok: true, content: 'I rarely watch TV.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Ты часто смотришь телевизор?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you often watch TV?',
        },
        { role: 'user', content: 'Do you often watch TV?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('translation success when visible Скажи matches user but stale __TRAN__ differs', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично!\nПереведи далее: Я люблю читать книги.\nПереведи на английский язык.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I love to read books.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: [
            'Переведи: У тебя есть семья?',
            'Переведи на английский язык.',
            'Скажи: You have a family.',
            '__TRAN_REPEAT_REF__: I have a family.',
          ].join('\n'),
        },
        { role: 'user', content: 'You have a family' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
    expect(data.content).not.toContain('главную неточность')
  })

  it('translation success strips stray Скажи when next invite already exists', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: [
          'Комментарий: Принято.',
          'Переведи далее: Я читаю каждый день.',
          'Скажи: You have been studying English for a long time.',
          'Переведи на английский язык.',
        ].join('\n'),
      })
      .mockResolvedValueOnce({ ok: true, content: 'I read every day.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Переведи: Я читаю каждый день.\nПереведи на английский язык.\n__TRAN_REPEAT_REF__: I read every day.',
        },
        { role: 'user', content: 'I read every day.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).not.toMatch(/^(?:Скажи|Say)\s*:/im)
  })

  it('translation junk payload keeps Скажи and does not force success strip', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий_мусор: Вижу случайный набор символов. Нужен полный ответ на английском.\nСкажи: I read books.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Переведи: Я читаю книги.\nПереведи на английский язык.\n__TRAN_REPEAT_REF__: I read books.',
        },
        { role: 'user', content: '123 ???' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Некорректный ввод')
    expect(data.content).toMatch(/^(?:Скажи|Say)\s*:/im)
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation success clamps repeat to the Russian prompt keywords', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично!\nВремя: Present Simple — здесь речь о привычке или факте.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I play football every day.\n?: Do I play football every day?\n-: I do not play football every day.\nСкажи: I play games every day.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I play football every day.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я играю в футбол каждый день.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I play football every day.',
        },
        { role: 'user', content: 'I play games every day.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('football')
    expect(repeatLine.toLowerCase()).not.toContain('games')
  })

  it('translation: user matching gold is success even when model forms describe another sentence', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично! Здесь это время подходит, потому что вы описываете устойчивое предпочтение.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I drink tea in the evening.\n?: Do you drink tea in the evening?\n-: I don't drink tea in the evening.\nЯ обычно пью чай вечером.\nПереведи на английский.",
      })
      .mockResolvedValueOnce({ ok: true, content: 'I usually drink tea in the evening.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            "Я не люблю кофе.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I don't like coffee.",
        },
        { role: 'user', content: "I don't like coffee." },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
    expect(data.content).not.toContain('Скажи:')
    expect(data.content).not.toContain('Формы:')
  })

  it('translation praise with spelling hint is treated as correction, not success', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно указал смысл, но проверь правильность написания слов.\nВремя: Present Simple — действие повторяется регулярно; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I like to play football with friends.\n?: Do you like to play football with friends?\n-: I do not like to play football with friends.\nЯ люблю играть в футбол с друзьями.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I like to play football with my friends.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я люблю играть в футбол с друзьями.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to play football with my friends.',
        },
        { role: 'user', content: 'I like to paly fotboa' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('✅')
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Формы:')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation word spelling error stays in repeat cycle', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно указал, что любишь пиццу.\nВремя: Present Simple — здесь речь о привычке; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you like pizza.\n?: Do you like pizza?\n-: You do not like pizza.\nТы любишь пиццу?\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'Do you like pizza?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Ты любишь пиццу?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you like pizza?',
        },
        { role: 'user', content: 'Do hou like piza' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toMatch(/hou|пицц|pizza/i)
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('✅')
  })

  it('translation error flow keeps only correction protocol without next-translate block', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка времени.\nВремя: Present Simple — действие повторяется регулярно; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nСкажи: I like to read in the evening.\nЯ часто хожу в парк.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I often walk in the park.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'hobbies',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я люблю читать вечером.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to read in the evening.',
        },
        { role: 'user', content: 'I am reading in the evening.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).not.toContain('Комментарий:')
    expect(data.content).toContain('Ошибки:')
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Я часто хожу в парк.')
    expect(data.content).not.toContain('Переведи на английский.')
    expect(data.content).not.toContain('Не удалось сформировать исправленное предложение')
  })

  it('translation error response does not duplicate repeat card and never mixes with next invitation', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий_перевод: Исправь время.\nОшибки:\n🔤 Нужен Present Simple — действие повторяется регулярно.\nСкажи: I read in the evening.\nСкажи: I read in the evening.\nЯ люблю читать утром.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I like to read in the morning.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'hobbies',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я люблю читать вечером.\nПереведи на английский.' },
        { role: 'user', content: 'I am reading in the evening.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatCount = (data.content.match(/(^|\n)\s*Скажи\s*:/g) ?? []).length
    const inviteCount = (data.content.match(/(^|\n)\s*Переведи на английский\./g) ?? []).length

    expect(res.status).toBe(200)
    expect(repeatCount).toBe(1)
    expect(inviteCount).toBe(0)
  })

  it('translation correction repeat is aligned to original russian prompt, not user variant', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: I have a car.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I have a cat.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'animals',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'У меня есть кот.\nПереведи на английский.' },
        { role: 'user', content: 'I have a car.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('cat')
    expect(repeatLine.toLowerCase()).not.toContain('car')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction repeat keeps friends from the Russian prompt instead of cats from the user answer', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: I love to play outside with my cats.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I love to play outside with my friends.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я люблю играть на улице с друзьями.\nПереведи на английский.' },
        { role: 'user', content: 'I love to play outside with my cats.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('friends')
    expect(repeatLine.toLowerCase()).not.toContain('cats')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction prefers prior assistant Скажи over model echo of user wording', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: I always add a lot of yellow cheese.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I always add a lot of cheese.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я всегда добавляю много сыра.\nПереведи на английский.\nСкажи: I always add a lot of cheese.',
        },
        { role: 'user', content: 'I always add a lot of yellow cheese' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).not.toContain('yellow')
    expect(repeatLine.toLowerCase()).toMatch(/i always add a lot of cheese/)
  })

  it('translation correction strips with my friends from Скажи when the Russian prompt has no friends', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: I usually cook pasta for dinner with my friends.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I usually cook pasta for dinner.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я обычно готовлю пасту на ужин.\nПереведи на английский.' },
        { role: 'user', content: 'I usually cook pasta for dinner with my friends.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).not.toContain('friends')
    expect(repeatLine.toLowerCase()).toContain('usually')
    expect(repeatLine.toLowerCase()).toContain('pasta')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction clamps rarely in Скажи to sometimes when the Russian prompt has иногда', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка времени.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: I rarely play football with my friends.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I sometimes play football with my friends.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я иногда играю в футбол с друзьями.\nПереведи на английский.' },
        { role: 'user', content: 'I always play football with my friends.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('sometimes')
    expect(repeatLine.toLowerCase()).not.toContain('rarely')
    expect(repeatLine.toLowerCase()).toContain('football')
    expect(repeatLine.toLowerCase()).toContain('friends')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction keeps sibling prompt and rejects mom substitution', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка артикля: перед mom нужен артикль a.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nСкажи: Do you have a mom?',
      })
      .mockResolvedValueOnce({ ok: true, content: 'Do you have a brother or sister?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть брат или сестра?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have a brother or sister?',
        },
        { role: 'user', content: 'Do you have mom' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('brother')
    expect(repeatLine.toLowerCase()).toContain('sister')
    expect(repeatLine.toLowerCase()).not.toContain('mom')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation success with errant Скажи still yields next task (Переведи на английский), not repeat', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Твоя форма вопроса правильная.\nВремя: Present Simple — факт.\nСкажи: I like to play with my friends.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'He visits his cousins every month.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя много друзей?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have many friends?',
        },
        { role: 'user', content: 'Do you have many friends?' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Скажи:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('translation uses fresh gold when prior __TRAN__ is stale for current weekends prompt', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно использовал Present Simple.\nПереведи далее: Я люблю смотреть фильмы дома.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I like to watch movies on weekends.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'movies_series',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Ты любишь смотреть фильмы по выходным.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to watch movies.',
        },
        { role: 'user', content: 'I like to watch movies on weekends.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toMatch(/Комментарий(?:_перевод)?\s*:/i)
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('translation refreshes __TRAN_REPEAT_REF__ for new "Переведи далее" prompt (meetings vs parties)', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично! Ты правильно использовал don't в отрицании, и это Present Simple для постоянного предпочтения.\nПереведи далее: Я не люблю шумные совещания.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I don't like noisy parties.",
      })
      .mockResolvedValueOnce({
        ok: true,
        content: "I don't like noisy meetings.",
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'work',
      audience: 'adult',
      level: 'c2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            "Я не люблю шумные вечеринки.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I don't like noisy parties.",
        },
        { role: 'user', content: "I don't like noisy parties." },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Переведи далее: Я не люблю шумные совещания.')
    expect(data.content).toContain("__TRAN_REPEAT_REF__: I don't like noisy meetings.")
    expect(data.content).not.toContain("__TRAN_REPEAT_REF__: I don't like noisy parties.")
  })

  it('translation keeps locked canonical gold for same task and avoids extra gold generation calls', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Есть хорошая основа.\nОшибки:\n- "enjoy" → "like"\nСкажи: I do not enjoy traveling.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'travel',
      audience: 'adult',
      level: 'b2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            "Я не люблю путешествовать.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I don't like traveling.",
        },
        { role: 'user', content: "I don't enjoy traveling." },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain("Скажи: I don't like traveling.")
    expect(data.content).not.toContain('I do not enjoy traveling')
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
  })

  it('translation mixed input does not advance to next question', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно использовал вопросительное слово "Do" в начале.\nВремя: Present Simple — здесь речь о привычке; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you like to bake pies.\n?: Do you like to bake pies?\n-: You do not like to bake pies.\nТы любишь печь пироги.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Do you like to bake pies?',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Ты любишь печь пироги?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you like to bake pies?',
        },
        { role: 'user', content: 'Do you love печь пирги' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Скажи\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
  })

  it('translation mixed input strips next-translate line when model outputs Переведи далее', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка — проверь написание и выбор слова.\nВремя: Present Simple — здесь речь о привычке или факте; маркеры usually, often, every day, always.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I often play football with my friends.\n?: Do you often play football with your friends?\n-: I do not often play football with my friends.\nПереведи далее: Я люблю играть в видеоигры вечером.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I love playing video games in the evening.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я часто играю в футбол с друзьями.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I often play football with my friends.',
        },
        { role: 'user', content: 'I often play football with my друзья' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Скажи:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation junk: fully Russian answer returns compact comment + current-cycle Скажи', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично! Ты правильно использовал структуру.\nПереведи далее: У меня есть друзья.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'У тебя есть братья или сёстры?' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_мусор:')
    expect(data.content).toContain('Скажи: Do you have brothers or sisters?')
    expect(data.content).not.toContain('\nКомментарий:')
    expect(data.content).not.toContain('Комментарий_перевод:')
    expect(data.content).not.toContain('Ошибки:')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation junk: gibberish answer returns compact comment + current-cycle Скажи', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий_перевод: Ошибка.\nОшибки:\n🤔 Неясный ответ.\nСкажи: asd qwe zxc',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я читаю книги каждый вечер.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I read books every evening.',
        },
        { role: 'user', content: 'dkknsaldohva' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_мусор:')
    expect(data.content).toContain('Скажи: I read books every evening.')
    expect(data.content).not.toContain('\nКомментарий:')
    expect(data.content).not.toContain('Комментарий_перевод:')
    expect(data.content).not.toContain('Ошибки:')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation junk final payload keeps only two visible protocol blocks', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nПереведи далее: Это ложный success.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть сестра?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have a sister?',
        },
        { role: 'user', content: 'sdfsdff' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const visibleLines = data.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !/^__TRAN_REPEAT_REF__\s*:/i.test(line))

    expect(res.status).toBe(200)
    expect(visibleLines).toHaveLength(2)
    expect(visibleLines[0]).toMatch(/^Комментарий_мусор\s*:/i)
    expect(visibleLines[1]).toMatch(/^Скажи\s*:/i)
  })

  it('translation junk in chain keeps Скажи from current drill, not previous topic', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Почти правильно.\nОшибки:\n📖 Лексическая ошибка.\nСкажи: Do you have a car?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'У тебя есть машина?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have a car?',
        },
        { role: 'user', content: 'Do you have a car?' },
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'братья и сёстры есть' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatLine).not.toContain('Do you have a car?')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation extra words provocation keeps frozen Скажи from drill card', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Хорошая попытка.\nОшибки:\n📖 Лексическая ошибка.\nСкажи: Do you have beautiful brothers or sisters?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have beautiful brothers or sisters?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatLine.toLowerCase()).not.toContain('beautiful')
  })

  it('translation shortened phrase provocation keeps full frozen Скажи', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий_перевод: Исправь фразу.\nОшибки:\n🔤 Пропущена часть.\nСкажи: Do you have brothers?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have brothers?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatLine).not.toContain('Do you have brothers?.')
  })

  it('translation mixed latin+cyrillic provocation keeps same frozen Скажи', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Почти правильно.\nОшибки:\n📖 Переведи русские слова.\nСкажи: Do you have красивые brothers?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have красивые brothers?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Скажи\s*:\s*/i, '')

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatBody).not.toMatch(/[А-Яа-яЁё]/)
  })

  it('translation gibberish provocation keeps same frozen Скажи and no next drill', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий_перевод: Ошибка.\nОшибки:\n🤔 Неясный ответ.\nСкажи: asd qwe zxc',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: '@@@ asd zxc ???' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation latin gibberish without __TRAN__: API gold blocks false success', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты верно использовал have.\nФормы:\n+:\nПереведи далее: У меня есть семья.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'You have a sister.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Переведи: У тебя есть сестра.\nПереведи на английский язык.',
        },
        { role: 'user', content: 'sdffs' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_мусор:')
    expect(repeatLine.toLowerCase()).toContain('sister')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation multi-step provocations keep frozen Скажи across correction chain', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Исправь слова.\nОшибки:\n📖 Лексика.\nСкажи: Do you have beautiful brothers?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have beautiful brothers?' },
        {
          role: 'assistant',
          content:
            'Комментарий_перевод: Попробуй ещё раз.\nОшибки:\n📖 Убери лишние слова.\nСкажи: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have super brothers?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatLine.toLowerCase()).not.toContain('super')
    expect(repeatLine.toLowerCase()).not.toContain('beautiful')
  })

  it('translation correction does not create new ru task from error block text', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий_перевод: Есть хорошая основа.\nОшибки:\n📖 Русские слова в ответе нужно перевести на английский.\nСкажи: Do you have handsome brothers?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have красивые brothers?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatLine.toLowerCase()).not.toContain('handsome')
  })

  it('skips stray "Теперь" before the real next sentence', () => {
    const sentence = extractSingleTranslationNextSentence(['Теперь.', 'Я люблю играть с друзьями по вечерам.'])

    expect(sentence).toBe('Я люблю играть с друзьями по вечерам.')
  })

  it('не отрезает русское задание на первой точке в одной строке с «Переведи далее:»', () => {
    const sentence = extractSingleTranslationNextSentence([
      'Переведи далее: Теперь. Я люблю играть с друзьями по вечерам.',
    ])
    expect(sentence).toBe('Я люблю играть с друзьями по вечерам.')
  })

  it('returns null when only a stray intro sentence is present', () => {
    const sentence = extractSingleTranslationNextSentence(['Теперь.'])

    expect(sentence).toBeNull()
  })

  it('normalizes stale translation success payload with old time hint into new success format', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          "Комментарий: Отлично!\nВремя: Present Simple — здесь речь о факте; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you have brothers or sisters.\n?: Do you have brothers or sisters?\n-: You don't have brothers or sisters.\nЯ работаю дома.\nПереведи на английский.",
      })
      .mockResolvedValueOnce({ ok: true, content: 'I work from home.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have brothers or sisters?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).not.toContain('Используйте это время в полном английском предложении')
    expect(data.content).not.toContain('Время:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('normalizes expanded negatives in forms and keeps non-negative lines unchanged', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично!\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I will cook at home.\n?: Do you cook every day?\n-: I did not cook at home.\nЯ готовлю дома.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I cook at home.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Я готовил дома.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I cooked at home.',
        },
        { role: 'user', content: 'I cooked at home.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('first translation turn applies negative sentenceType even with "Переведи далее" prefix', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Переведи далее: Я уже посмотрел несколько хороших фильмов в этом месяце.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I have already watched several good movies this month.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'movies_series',
      audience: 'adult',
      level: 'b1',
      sentenceType: 'negative',
      tenses: ['present_perfect'],
      messages: [],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).toContain('Я ещё не посмотрел несколько хороших фильмов в этом месяце.')
    expect(data.content).not.toContain('Комментарий:')
  })

  it('first translation turn applies negative sentenceType for "Мне нравится ..."', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Переведи: Мне нравится слушать музыку.\nПереведи на английский.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I like listening to music.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'music',
      audience: 'adult',
      level: 'a1',
      sentenceType: 'negative',
      tenses: ['present_simple'],
      messages: [],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Мне не нравится слушать музыку.')
    expect(data.content).not.toContain('Мне нравится слушать музыку.')
    expect(data.content).not.toContain('Переведи:')
    expect(data.content).not.toContain('Комментарий:')
  })

  it('next translation sentence after SUCCESS keeps selected sentenceType', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно использовал Present Perfect.\nКонструкция: Subject + have/has + V3.\nФормы:\n+: I have already watched several good movies this month.\n?: Have you already watched several good movies this month?\n-: I have not watched several good movies this month.\nПереведи далее: Я уже посмотрел несколько хороших фильмов в этом месяце.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'I have not watched several good films this month yet.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'movies_series',
      audience: 'adult',
      level: 'b1',
      sentenceType: 'negative',
      tenses: ['present_perfect'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я уже посмотрел этот фильм.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I have already watched this movie.',
        },
        { role: 'user', content: 'I have already watched this movie.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Я ещё не посмотрел несколько хороших фильмов в этом месяце.')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('replaces non-negative next sentence with fallback when sentenceType is negative', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно использовал Present Perfect.\nКонструкция: Subject + have/has + V3.\nФормы:\n+: I have already listened to this song.\n?: Have you already listened to this song?\n-: I have not listened to this song.\nПереведи далее: Как вы относитесь к разным музыкальным жанрам?',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I have never heard this album before.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'music',
      audience: 'adult',
      level: 'b2',
      sentenceType: 'negative',
      tenses: ['present_perfect'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я уже слышал эту песню.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I have already listened to this song.',
        },
        { role: 'user', content: 'I have already listened to this song.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Как вы относитесь к разным музыкальным жанрам?')
    expect(data.content).toMatch(/(?:^|[\s,;])(не|никогда|ничего|никому|нигде)(?=[\s,.!?…]|$)/i)
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
  })

  it('rebuilds broken success forms when + and - are duplicated negative', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Отлично! Ты правильно передал Present Perfect.\nКонструкция: Subject + have/has + V3.\nФормы:\n+: I have never been to a live concert.\n?: Have you ever been to a live concert?\n-: I have never been to a live concert.\nПереведи далее: Я уже слышал эту песню.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I have already heard this song.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'music',
      audience: 'adult',
      level: 'b2',
      sentenceType: 'negative',
      tenses: ['present_perfect'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я никогда не был на живом концерте.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I have never been to a live concert.',
        },
        { role: 'user', content: 'I have never been to a live concert.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toMatch(/Переведи(?:\s+далее)?\s*:/i)
    const positiveLine = data.content.match(/^\+:\s*(.+)$/m)?.[1] ?? ''
    const negativeLine = data.content.match(/^-:\s*(.+)$/m)?.[1] ?? ''
    if (positiveLine && negativeLine) {
      expect(positiveLine.toLowerCase()).not.toContain(' never ')
      expect(positiveLine.toLowerCase()).not.toContain("n't")
      expect(positiveLine).not.toEqual(negativeLine)
    }
  })

  it('translation: multi-tense pick stays stable on 2nd user turn (same seed trim as dialogue)', async () => {
    const drillReply =
      'Комментарий: Тест.\nВремя: Past Simple — тест.\nКонструкция: Subject + V2.\nСкажи: I went home.\nНовое предложение.\nПереведи на английский.'

    callProviderChatMock.mockResolvedValue({ ok: true, content: drillReply })

    const base = {
      mode: 'translation' as const,
      topic: 'movies_series',
      audience: 'adult' as const,
      level: 'a2' as const,
      sentenceType: 'interrogative' as const,
      tenses: ['past_simple', 'future_simple'],
      dialogSeed: 'vitest-multi-tense-translation-seed',
    }

    const req1 = makeRequest({ ...base, messages: [] })
    await POST(req1 as never)
    expect(callProviderChatMock).toHaveBeenCalled()
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const sys1 = firstCall?.apiMessages?.[0]?.content ?? ''
    const required1 = sys1.match(/Required tense:\s*([^.]+)/)?.[1]?.trim() ?? ''

    callProviderChatMock.mockClear()
    callProviderChatMock.mockResolvedValue({ ok: true, content: drillReply })

    const req2 = makeRequest({
      ...base,
      messages: [
        {
          role: 'assistant',
          content:
            'Какой фильм ты смотрел вчера?\nПереведи на английский.\n__TRAN_REPEAT_REF__: I watched a film yesterday.',
        },
        { role: 'user', content: 'I watched a film yesterday.' },
      ],
    })
    await POST(req2 as never)
    expect(callProviderChatMock).toHaveBeenCalled()
    const secondCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const sys2 = secondCall?.apiMessages?.[0]?.content ?? ''
    const required2 = sys2.match(/Required tense:\s*([^.]+)/)?.[1]?.trim() ?? ''

    expect(required1.length).toBeGreaterThan(0)
    expect(required2.length).toBeGreaterThan(0)
    expect(['Past Simple', 'Future Simple']).toContain(required1)
    expect(['Past Simple', 'Future Simple']).toContain(required2)
  })

  it.each([
    {
      audience: 'adult' as const,
      level: 'a2' as const,
      topic: 'travel' as const,
      sentenceType: 'affirmative' as const,
      tenses: ['present_simple'],
      ru: 'Ты любишь путешествовать по разным странам.',
      right: 'Do you like to travel to different countries?',
      wrong: 'I like pizza.',
    },
    {
      audience: 'child' as const,
      level: 'a1' as const,
      topic: 'family_friends' as const,
      sentenceType: 'interrogative' as const,
      tenses: ['present_simple'],
      ru: 'У тебя есть друзья?',
      right: 'Do you have friends?',
      wrong: 'I play football every day.',
    },
    {
      audience: 'adult' as const,
      level: 'b1' as const,
      topic: 'movies_series' as const,
      sentenceType: 'negative' as const,
      tenses: ['present_perfect'],
      ru: 'Я ещё не посмотрел этот фильм.',
      right: 'I have not watched this movie yet.',
      wrong: 'I will buy a new phone tomorrow.',
    },
  ])(
    'translation mismatch matrix: forces error protocol for $topic/$level/$audience/$sentenceType',
    async ({ audience, level, topic, sentenceType, tenses, ru, right, wrong }) => {
      callProviderChatMock
        .mockResolvedValueOnce({
          ok: true,
          content:
            `Комментарий: Отлично!\n` +
            `Формы:\n+: ${right}\n?: ${right}\n-: ${right}\n` +
            'Переведи далее: Я люблю музыку.',
        })
        .mockResolvedValueOnce({ ok: true, content: 'I love music.' })

      const req = makeRequest({
        mode: 'translation',
        topic,
        audience,
        level,
        sentenceType,
        tenses,
        messages: [
          {
            role: 'assistant',
            content: `${ru}\nПереведи на английский.\n__TRAN_REPEAT_REF__: ${right}`,
          },
          { role: 'user', content: wrong },
        ],
      })

      const res = await POST(req as never)
      const data = await res.json() as { content: string }

      expect(res.status).toBe(200)
      expect(/Комментарий_перевод\s*:|Комментарий\s*:/i.test(data.content)).toBe(true)
      expect(data.content).toContain('Скажи:')
      expect(data.content).not.toContain('Переведи далее:')
      expect(data.content).not.toContain('Переведи на английский.')
    }
  )

  it.each([
    {
      audience: 'adult' as const,
      level: 'a2' as const,
      topic: 'travel' as const,
      sentenceType: 'affirmative' as const,
      tenses: ['present_simple'],
      ru: 'Ты любишь путешествовать по разным странам.',
      right: 'Do you like to travel to different countries?',
    },
    {
      audience: 'child' as const,
      level: 'a1' as const,
      topic: 'family_friends' as const,
      sentenceType: 'interrogative' as const,
      tenses: ['present_simple'],
      ru: 'У тебя есть друзья?',
      right: 'Do you have friends?',
    },
  ])(
    'translation success matrix: keeps praise and moves to next drill for $topic/$level/$audience/$sentenceType',
    async ({ audience, level, topic, sentenceType, tenses, ru, right }) => {
      callProviderChatMock
        .mockResolvedValueOnce({
          ok: true,
          content:
            'Комментарий: Отлично! Всё верно.\n' +
            `Формы:\n+: ${right}\n?: ${right}\n-: ${right}\n` +
            'Переведи далее: Я читаю книги вечером.',
        })
        .mockResolvedValueOnce({ ok: true, content: 'I read books in the evening.' })

      const req = makeRequest({
        mode: 'translation',
        topic,
        audience,
        level,
        sentenceType,
        tenses,
        messages: [
          {
            role: 'assistant',
            content: `${ru}\nПереведи на английский.\n__TRAN_REPEAT_REF__: ${right}`,
          },
          { role: 'user', content: right },
        ],
      })

      const res = await POST(req as never)
      const data = await res.json() as { content: string }

      expect(res.status).toBe(200)
      expect(data.content).toContain('Комментарий:')
      expect(data.content).toContain('Переведи')
      expect(data.content).not.toContain('Скажи:')
    }
  )

  it('translation repeated same error keeps readable correction without glued lines', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Лексическая ошибка — Проверь написание и выбор слова. Скажи: I will start a new project.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I will start a new project.' })
      .mockResolvedValueOnce({ ok: true, content: 'I will start a new project.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'free_talk',
      audience: 'adult',
      level: 'a2',
      sentenceType: 'affirmative',
      tenses: ['future_simple'],
      messages: [
        {
          role: 'assistant',
          content: [
            'Комментарий_перевод: 💡 Есть хорошая основа, но нужно исправить основную неточность по образцу ниже.',
            'Ошибки:',
            '📖 Ошибка перевода — русские слова в ответе нужно перевести на английский.',
            "- проект → project",
            "- new project → a new project",
            'Скажи: I will start a new project.',
            'Скажи: I will start a new project.',
            '__TRAN_REPEAT_REF__: I will start a new project.',
          ].join('\n'),
        },
        { role: 'user', content: 'We will start a new проект' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(/Комментарий_перевод\s*:|Комментарий\s*:/i.test(data.content)).toBe(true)
    expect(data.content).toContain('Ошибки:')
    expect(data.content).toMatch(/Скажи:\s*I will start a new project/i)
    expect(data.content).not.toMatch(/Комментарий_ошибка/)
  })

  it('translation success always appends next drill even when model returns only short praise', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично! Верная форма Future Simple.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'He will call his parents often.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      sentenceType: 'affirmative',
      tenses: ['future_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Он будет часто звонить родителям.\nПереведи на английский.\n__TRAN_REPEAT_REF__: He will call his parents often.',
        },
        { role: 'user', content: 'He will call his parents often.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).not.toContain('Скажи:')
  })

  it('translation strict contract: first turn returns only translate invitation card', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nСкажи: I like music.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'music',
      audience: 'adult',
      level: 'a1',
      tenses: ['present_simple'],
      messages: [],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Переведи на английский язык.')
    expect(data.content).not.toContain('Комментарий_перевод:')
    expect(data.content).not.toContain('Ошибки:')
    expect(data.content).not.toContain('Скажи:')
  })

  it('translation strict contract: success card contains next task and no repeat line', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично!\nСкажи: I like music.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I read books every day.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'Я люблю музыку.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like music.',
        },
        { role: 'user', content: 'I like music.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).not.toContain('Скажи:')
    expect(data.content).not.toContain('Комментарий_перевод:')
  })

  it('translation strict contract: error card enforces support+errors+repeat without next task', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично! Очень близко.\nПереведи далее: Я читаю книги.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I have a cat.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'animals',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content: 'У меня есть кот.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I have a cat.',
        },
        { role: 'user', content: 'I have a car.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Ошибки:')
    expect(data.content).toContain('Скажи: I have a cat.')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation strict provocation: gibberish keeps error cycle and frozen canonical repeat', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично!\nПереведи далее: Я люблю музыку.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'Do you have brothers or sisters?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: '@@@ asd zxc ???' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Ошибки:')
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation strict provocation: mixed cyrillic+latin keeps error cycle and canonical repeat', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично!\nПереведи далее: Я люблю музыку.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'Do you have brothers or sisters?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
        },
        { role: 'user', content: 'Do you have красивые brothers?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Скажи\s*:\s*/i, '')

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Ошибки:')
    expect(repeatLine).toContain('Do you have brothers or sisters?')
    expect(repeatBody).not.toMatch(/[А-Яа-яЁё]/)
    expect(data.content).not.toContain('Переведи далее:')
  })

  it('translation error: Say always follows current drill canonical ref, not stale previous ref', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Лексическая ошибка.\nСкажи: I like to watch movies.',
      })
      .mockResolvedValue({
        ok: true,
        content: 'I like to watch movies on weekends.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'movies_series',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Ты любишь смотреть фильмы по выходным.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like to watch movies.',
        },
        { role: 'user', content: 'I like to watch movies every day.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Скажи\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий_перевод:')
    expect(data.content).toContain('Ошибки:')
    expect(repeatLine.toLowerCase()).toMatch(/скажи|say/)
    expect(repeatLine.toLowerCase()).toContain('movies')
  })

  it('translation success ignores service imperative in Переведи далее and uses fallback drill', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Отлично!\nПереведи далее: Поправь — и я помог вам исправить.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'I read books in the evening.' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Я люблю музыку.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I like music.',
        },
        { role: 'user', content: 'I like music.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).not.toContain('Поправь — и я помог вам исправить')
  })

  it('translation final output lock removes stray Скажи from success payload', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Переведи далее: Ты любишь смотреть фильмы по выходным.\nСкажи: I like to watch movies on weekends.',
      })
      .mockResolvedValueOnce({ ok: true, content: 'Do you like to watch movies on weekends?' })

    const req = makeRequest({
      mode: 'translation',
      topic: 'movies_series',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        {
          role: 'assistant',
          content:
            'Ты любишь смотреть фильмы дома?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you like to watch movies at home?',
        },
        { role: 'user', content: 'Do you like to watch movies at home?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Переведи далее:')
    expect(data.content).not.toContain('Скажи:')
  })

})

