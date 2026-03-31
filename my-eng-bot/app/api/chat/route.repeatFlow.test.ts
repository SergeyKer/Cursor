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
    expect(data.content).not.toContain('Повтори:')
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

})

