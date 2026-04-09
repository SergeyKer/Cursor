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

  it('keeps repeat cycle (no next question) when previous repeat is still unresolved', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно ответить в Past Simple.\nWhat did you do yesterday?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно ответить в Past Simple.\nПовтори: I went to the park.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        { role: 'assistant', content: 'What did you do yesterday?' },
        { role: 'user', content: 'I go to the park.' },
        { role: 'assistant', content: 'Комментарий: Нужен Past Simple.\nПовтори: I went to the park.' },
        { role: 'user', content: 'I go to the park.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('What did you do yesterday?')
  })

  it('keeps model Повтори line when shortened after wrong repeat (no stitch to full drill sentence)', async () => {
    const truncatedRepeatPayload = {
      ok: true,
      content:
        'Комментарий: Лексическая ошибка — проверь выбор слова.\nПовтори: I often cook.',
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
        { role: 'assistant', content: 'Повтори: I often cook food for my family.' },
        { role: 'user', content: 'I often cook food for my sister' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toMatch(/i often cook/)
    expect(repeatLine.toLowerCase()).not.toContain('family')
  })

  it('moves to next question after correct repeat answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: 'Комментарий: Отлично!\nПовтори: I went to the park.',
    })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        { role: 'assistant', content: 'What did you do yesterday?' },
        { role: 'user', content: 'I go to the park.' },
        { role: 'assistant', content: 'Комментарий: Нужен Past Simple.\nПовтори: I went to the park.' },
        { role: 'user', content: 'I went to the park.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(callProviderChatMock).toHaveBeenCalledTimes(1)
    expect(data.content).not.toContain('Повтори:')
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
        content: 'Комментарий: Нужен полный ответ в Present Perfect.\nПовтори: I have enjoyed playing football recently.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужен полный ответ в Present Perfect.\nПовтори: I have enjoyed playing football recently.',
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
    expect(data.content.includes('Повтори:') || /\?\s*$/.test(data.content)).toBe(true)
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
        content: 'Комментарий: Требуется Present Perfect, а не Present Simple.\nПовтори: I have visited Rome recently.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Perfect, а не Present Simple.\nПовтори: I have visited Rome recently.',
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
    expect(data.content).toContain('Комментарий:')
    expect(
      data.content.includes('В этом вопросе важен результат или опыт к текущему моменту.') ||
      data.content.includes('Также опечатка:')
    ).toBe(true)
    expect(data.content).toContain('Повтори:')
  })

  it('adds short learning reason for article correction comment', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Также нужно использовать артикль "a" перед словом "sport".\nПовтори: I play a sport every week.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Также нужно использовать артикль "a" перед словом "sport".\nПовтори: I play a sport every week.',
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
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('потому что речь о исчисляемом существительном в единственном числе')
    expect(data.content).toContain('Повтори:')
  })

  it('keeps spelling, lexical, and article mistakes separate', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка формы глагола. Правильный вариант "I have a car".\nПовтори: I have a cat.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content:
          'Комментарий: Ошибка формы глагола. Правильный вариант "I have a car".\nПовтори: I have a cat.',
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
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Орфографическая ошибка: haev')
    expect(data.content).toContain('Конструкция:')
    expect(data.content).not.toContain('haev нужно заменить на car')
    expect(data.content).toContain('Повтори: I have a cat.')
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
        { role: 'assistant', content: 'У меня есть кот.\nПереведи на английский.' },
        { role: 'user', content: 'I have a car.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Отлично!')
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('cat')
    expect(data.content).toContain('Повтори: I have a cat.')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('uses question form as correction target for question prompts', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        "Комментарий: Отлично! Здесь всё верно.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: You have a favorite colour.\n?: What is your favorite colour?\n-: You don't have a favorite colour.\nКакой у тебя любимый фрукт?\nПереведи на английский.",
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Привет! Какой у тебя любимый цвет?\nПереведи на английский.' },
        { role: 'user', content: 'Hi what is you favorite colour' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

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
        content: 'Комментарий: Требуется Present Continuous, а не Present Simple.\nПовтори: I am painting the floor now.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Требуется Present Continuous, а не Present Simple.\nПовтори: I am painting the floor now.',
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
    expect(data.content).toContain('Повтори:')
  })

  it('adds have/has reason when agreement correction appears', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Ошибка согласования подлежащего и сказуемого.\nПовтори: He has finished homework.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Ошибка согласования подлежащего и сказуемого.\nПовтори: He has finished homework.',
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
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('После he/she/it используем has, а не have.')
    expect(data.content).toContain('Повтори:')
  })

  it('deduplicates repeated comment phrases and keeps it short', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно использовать Present Perfect Continuous. Здесь важно сохранить время, которое задано в вопросе. Здесь важно сохранить время, которое задано в вопросе.\nПовтори: I have been sleeping for three hours.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно использовать Present Perfect Continuous. Здесь важно сохранить время, которое задано в вопросе. Здесь важно сохранить время, которое задано в вопросе.\nПовтори: I have been sleeping for three hours.',
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
        content: 'Комментарий: Здесь требуется Present Simple, а не Present Continuous. Кроме того, вместо "has" нужно "have", так как "I" требует "have".\nПовтори: I have many goals.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Здесь требуется Present Simple, а не Present Continuous. Кроме того, вместо "has" нужно "have", так как "I" требует "have".\nПовтори: I have many goals.',
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
      expect(data.content).toContain('Повтори:')
    } else {
      expect(data.content).toMatch(/\?\s*$/)
    }
  })

  it('removes false future-will reminder when user already uses will', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово — "кино" по-английски будет "to the cinema". Кроме того, ты говоришь о будущем, поэтому нужно will.\nПовтори: I will go to the cinema.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово — "кино" по-английски будет "to the cinema". Кроме того, ты говоришь о будущем, поэтому нужно will.\nПовтори: I will go to the cinema.',
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
        { role: 'assistant', content: 'Комментарий: Используйте Future Simple.\nПовтори: I will go to the cinema.' },
        { role: 'user', content: 'I go кино' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Повтори\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Повтори:')
    expect(repeatBody.toLowerCase()).toContain('will')
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
  })

  it('falls back to mixed comment+repeat when model repeat still contains cyrillic', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Небольшая неточность.\nПовтори: I go кино.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Небольшая неточность.\nПовтори: I go кино.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Where do you go on weekends?' },
        { role: 'user', content: 'I go кино with friends' },
        { role: 'assistant', content: 'Комментарий: Ответ на английском.\nПовтори: I go to the cinema with friends.' },
        { role: 'user', content: 'I go кино with friends' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Повтори\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Повтори:')
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
    expect(repeatBody.toLowerCase()).toContain('cinema')
  })

  it('removes false present-simple reminder when user already uses present simple', async () => {
    callProviderChatMock
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Вы говорите о привычке, поэтому нужен Present Simple. Кроме того, слово "movie" подходит лучше.\nПовтори: I watch a movie every week.',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Вы говорите о привычке, поэтому нужен Present Simple. Кроме того, слово "movie" подходит лучше.\nПовтори: I watch a movie every week.',
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
        content: 'Комментарий: Тут нужно другое слово.\nПовтори: What do you think about football?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Тут нужно другое слово.\nПовтори: I play or watch football regularly.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you do with football regularly?' },
        { role: 'user', content: 'I play or watch regularly football' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Повтори\s*:\s*/i, '').trim()

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
        content: 'Комментарий: Нужно исправить порядок слов.\nПовтори: What do you think about football?',
      })
      .mockResolvedValueOnce({
        ok: true,
        content: 'Комментарий: Нужно исправить порядок слов.\nПовтори: I think about football regularly.',
      })

    const req = makeRequest({
      mode: 'dialogue',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'What do you do regularly?' },
        { role: 'user', content: 'I do regularly think about football' },
        { role: 'assistant', content: 'Комментарий: Нужен правильный порядок слов.\nПовтори: What do you think about football?' },
        { role: 'user', content: 'I do regularly think about football' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const firstCallArg = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const systemPrompt = firstCallArg?.apiMessages?.[0]?.content ?? ''
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Повтори\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(systemPrompt).toContain('Previous "Повтори:" sentence ends with a question mark and is invalid for drill repeat')
    expect(systemPrompt).not.toContain('MUST reuse exactly the SAME sentence')
    expect(data.content).toContain('Повтори:')
    expect(/\?\s*$/.test(repeatBody)).toBe(false)
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
        content:
          'Комментарий: Отлично! Здесь это время подходит, потому что речь о привычке.\nВремя: Present Simple — действие повторяется регулярно; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nПовтори: I like to read in the evening.\nЯ люблю плавать утром.\nПереведи на английский.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'hobbies',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я часто гуляю вечером.\nПереведи на английский.' },
        { role: 'user', content: 'I like to read in the evening.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Конструкция:')
    expect(data.content).toContain('Переведи на английский.')
    expect(data.content).not.toContain('Не удалось сформировать исправленное предложение')
  })

  it('translation success (question input) preserves stable forms block', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        "Комментарий: Отлично! Здесь это время подходит, потому что речь о привычке.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: You like sport.\n?: Do you like sport?\n-: You don't like sport.\nЯ редко смотрю телевизор.\nПереведи на английский.",
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'daily_life',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Ты любишь спорт?\nПереведи на английский.' },
        { role: 'user', content: 'Do you like sport?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Конструкция:')
    expect(data.content).toContain('Формы:')
    expect(data.content).toContain('?:')
    expect(data.content).toContain('-:')
  })

  it('translation success clamps repeat to the Russian prompt keywords', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично!\nВремя: Present Simple — здесь речь о привычке или факте.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I play football every day.\n?: Do I play football every day?\n-: I do not play football every day.\nПовтори: I play games every day.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я играю в футбол каждый день.\nПереведи на английский.' },
        { role: 'user', content: 'I play games every day.' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('football')
    expect(repeatLine.toLowerCase()).not.toContain('games')
  })

  it('translation negative input with conflicting model forms stays in correction protocol', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        "Комментарий: Отлично! Здесь это время подходит, потому что вы описываете устойчивое предпочтение.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I drink tea in the evening.\n?: Do you drink tea in the evening?\n-: I don't drink tea in the evening.\nЯ обычно пью чай вечером.\nПереведи на английский.",
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я не люблю кофе.\nПереведи на английский.' },
        { role: 'user', content: "I don't like coffee." },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Повтори:')
    expect(data.content).toContain('Конструкция:')
    expect(data.content).not.toContain('Формы:')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation praise with spelling hint is treated as correction, not success', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично! Ты правильно указал смысл, но проверь правильность написания слов.\nВремя: Present Simple — действие повторяется регулярно; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I like to play football with friends.\n?: Do you like to play football with friends?\n-: I do not like to play football with friends.\nЯ люблю играть в футбол с друзьями.\nПереведи на английский.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я люблю играть в футбол с друзьями.\nПереведи на английский.' },
        { role: 'user', content: 'I like to paly fotboa' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('✅')
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('Формы:')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation word spelling error stays in repeat cycle', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично! Ты правильно указал, что любишь пиццу.\nВремя: Present Simple — здесь речь о привычке; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you like pizza.\n?: Do you like pizza?\n-: You do not like pizza.\nТы любишь пиццу?\nПереведи на английский.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Ты любишь пиццу?\nПереведи на английский.' },
        { role: 'user', content: 'Do hou like piza' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Лексическая ошибка')
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('✅')
  })

  it('translation error flow keeps only correction protocol without next-translate block', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Ошибка времени.\nВремя: Present Simple — действие повторяется регулярно; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nПовтори: I like to read in the evening.\nЯ часто хожу в парк.\nПереведи на английский.',
    })

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

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Время:')
    expect(data.content).toContain('Конструкция:')
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('Я часто хожу в парк.')
    expect(data.content).not.toContain('Переведи на английский.')
    expect(data.content).not.toContain('Не удалось сформировать исправленное предложение')
  })

  it('translation error response does not duplicate repeat card and never mixes with next invitation', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Ошибка времени.\nВремя: Present Simple — действие повторяется регулярно.\nКонструкция: Subject + V1(s/es).\nПовтори: I read in the evening.\nПовтори: I read in the evening.\nЯ люблю читать утром.\nПереведи на английский.',
    })

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
    const repeatCount = (data.content.match(/(^|\n)\s*Повтори\s*:/g) ?? []).length
    const inviteCount = (data.content.match(/(^|\n)\s*Переведи на английский\./g) ?? []).length

    expect(res.status).toBe(200)
    expect(repeatCount).toBe(1)
    expect(inviteCount).toBe(0)
  })

  it('translation correction repeat is aligned to original russian prompt, not user variant', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: I have a car.',
    })

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
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('cat')
    expect(repeatLine.toLowerCase()).not.toContain('car')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction repeat keeps friends from the Russian prompt instead of cats from the user answer', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: I love to play outside with my cats.',
    })

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
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('friends')
    expect(repeatLine.toLowerCase()).not.toContain('cats')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction prefers prior assistant Повтори over model echo of user wording', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: I always add a lot of yellow cheese.',
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
            'Я всегда добавляю много сыра.\nПереведи на английский.\nПовтори: I always add a lot of cheese.',
        },
        { role: 'user', content: 'I always add a lot of yellow cheese' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).not.toContain('yellow')
    expect(repeatLine.toLowerCase()).toMatch(/i always add a lot of cheese/)
  })

  it('translation correction strips with my friends from Повтори when the Russian prompt has no friends', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: I usually cook pasta for dinner with my friends.',
    })

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
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).not.toContain('friends')
    expect(repeatLine.toLowerCase()).toContain('usually')
    expect(repeatLine.toLowerCase()).toContain('pasta')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction clamps rarely in Повтори to sometimes when the Russian prompt has иногда', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Ошибка времени.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: I rarely play football with my friends.',
    })

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
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('sometimes')
    expect(repeatLine.toLowerCase()).not.toContain('rarely')
    expect(repeatLine.toLowerCase()).toContain('football')
    expect(repeatLine.toLowerCase()).toContain('friends')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation correction keeps sibling prompt and rejects mom substitution', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Ошибка артикля: перед mom нужен артикль a.\nВремя: Present Simple — факт.\nКонструкция: Subject + V1(s/es).\nПовтори: Do you have a mom?',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'У тебя есть брат или сестра?\nПереведи на английский.' },
        { role: 'user', content: 'Do you have mom' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''

    expect(res.status).toBe(200)
    expect(repeatLine.toLowerCase()).toContain('brother')
    expect(repeatLine.toLowerCase()).toContain('sister')
    expect(repeatLine.toLowerCase()).not.toContain('mom')
    expect(data.content).not.toContain('Переведи на английский.')
  })

  it('translation success with errant Повтори still yields next task (Переведи на английский), not repeat', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично! Твоя форма вопроса правильная.\nВремя: Present Simple — факт.\nПовтори: I like to play with my friends.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'У тебя много друзей?\nПереведи на английский.' },
        { role: 'user', content: 'Do you have many friends?' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).not.toContain('Повтори:')
    expect(data.content).toContain('Формы:')
    expect(data.content).toContain('Переведи на английский.')
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
        content:
          'Комментарий: Отлично! Ты правильно использовал вопросительное слово "Do" в начале.\nВремя: Present Simple — здесь речь о привычке; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you like to bake pies.\n?: Do you like to bake pies?\n-: You do not like to bake pies.\nТы любишь печь пироги.\nПереведи на английский.',
      })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Ты любишь печь пироги?\nПереведи на английский.' },
        { role: 'user', content: 'Do you love печь пирги' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }
    const repeatLine = data.content.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    const repeatBody = repeatLine.replace(/^Повтори\s*:\s*/i, '').trim()

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(/[А-Яа-яЁё]/.test(repeatBody)).toBe(false)
  })

  it('translation mixed input strips next-translate line when model outputs Переведи далее', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Лексическая ошибка — проверь написание и выбор слова.\nВремя: Present Simple — здесь речь о привычке или факте; маркеры usually, often, every day, always.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I often play football with my friends.\n?: Do you often play football with your friends?\n-: I do not often play football with my friends.\nПереведи далее: Я люблю играть в видеоигры вечером.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'sports',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'Я часто играю в футбол с друзьями.\nПереведи на английский.' },
        { role: 'user', content: 'I often play football with my друзья' },
      ],
    })

    const res = await POST(req as never)
    const data = (await res.json()) as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).toContain('Повтори:')
    expect(data.content).not.toContain('Переведи далее:')
    expect(data.content).not.toContain('Переведи на английский.')
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
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        "Комментарий: Отлично!\nВремя: Present Simple — здесь речь о факте; маркеры usually, often, every day.\nКонструкция: Subject + V1(s/es).\nФормы:\n+: Do you have brothers or sisters.\n?: Do you have brothers or sisters?\n-: You don't have brothers or sisters.\nЯ работаю дома.\nПереведи на английский.",
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'family_friends',
      audience: 'adult',
      level: 'a2',
      tenses: ['present_simple'],
      messages: [
        { role: 'assistant', content: 'У тебя есть братья или сёстры?\nПереведи на английский.' },
        { role: 'user', content: 'Do you have brothers or sisters?' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain('Комментарий:')
    expect(data.content).not.toContain('Используйте это время в полном английском предложении')
    expect(data.content).not.toContain('Время:')
    expect(data.content).toContain('Конструкция: +:')
    expect(data.content).toContain('?:')
    expect(data.content).toContain('-:')
  })

  it('normalizes expanded negatives in forms and keeps non-negative lines unchanged', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content:
        'Комментарий: Отлично!\nКонструкция: Subject + V1(s/es).\nФормы:\n+: I will cook at home.\n?: Do you cook every day?\n-: I did not cook at home.\nЯ готовлю дома.\nПереведи на английский.',
    })

    const req = makeRequest({
      mode: 'translation',
      topic: 'food',
      audience: 'adult',
      level: 'a2',
      tenses: ['past_simple'],
      messages: [
        { role: 'assistant', content: 'Я готовил дома.\nПереведи на английский.' },
        { role: 'user', content: 'I cooked at home.' },
      ],
    })

    const res = await POST(req as never)
    const data = await res.json() as { content: string }

    expect(res.status).toBe(200)
    expect(data.content).toContain("-: I didn't cook at home.")
    expect(data.content).not.toContain('-: I did not cook at home.')
    expect(data.content).toContain('+: I will cook at home.')
    expect(data.content).toContain('?: Do you cook every day?')
  })

})

