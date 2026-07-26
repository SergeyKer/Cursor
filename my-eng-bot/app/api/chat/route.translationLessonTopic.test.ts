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

describe('POST /api/chat translation lesson_topic gate', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('without kind keeps Required tense path (tense_drill default)', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: ['Я люблю чай.', 'Переведи на английский.', '__TRAN_REPEAT_REF__: I love tea.'].join('\n'),
    })

    const res = await POST(
      makeRequest({
        mode: 'translation',
        audience: 'adult',
        level: 'a1',
        tenses: ['present_simple'],
        sentenceType: 'affirmative',
        topic: 'food',
        messages: [],
        dialogSeed: 'seed-tense',
      }) as never
    )
    expect(res.status).toBe(200)
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const system = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''
    expect(system).toContain('Required tense:')
    expect(system).not.toContain('Required lesson grammar')
  })

  it('with lesson_topic uses lesson grammar contract and lesson fallback pool', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: ['Я из России.', 'Переведи на английский.', '__TRAN_REPEAT_REF__: I am from Russia.'].join('\n'),
    })

    const res = await POST(
      makeRequest({
        mode: 'translation',
        audience: 'adult',
        level: 'a1',
        tenses: ['present_simple'],
        sentenceType: 'affirmative',
        topic: 'food',
        translationDrillKind: 'lesson_topic',
        translationLessonId: '4',
        messages: [],
        dialogSeed: 'seed-lesson',
      }) as never
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { translationEffectiveLessonId?: string }
    expect(data.translationEffectiveLessonId).toBe('4')
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const system = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''
    expect(system).toContain('Required lesson grammar')
    expect(system).toMatch(/I am/i)
    expect(system).not.toContain('Required tense:')
  })

  it('invalid lesson id falls back to tense path safely', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: ['Я люблю чай.', 'Переведи на английский.', '__TRAN_REPEAT_REF__: I love tea.'].join('\n'),
    })

    const res = await POST(
      makeRequest({
        mode: 'translation',
        audience: 'adult',
        level: 'a1',
        tenses: ['present_simple'],
        sentenceType: 'affirmative',
        topic: 'food',
        translationDrillKind: 'lesson_topic',
        translationLessonId: '999-missing',
        messages: [],
        dialogSeed: 'seed-bad',
      }) as never
    )
    expect(res.status).toBe(200)
    const firstCall = callProviderChatMock.mock.calls[0]?.[0] as
      | { apiMessages?: Array<{ role: string; content: string }> }
      | undefined
    const system = firstCall?.apiMessages?.find((m) => m.role === 'system')?.content ?? ''
    expect(system).toContain('Required tense:')
    expect(system).not.toContain('Required lesson grammar')
  })
})
