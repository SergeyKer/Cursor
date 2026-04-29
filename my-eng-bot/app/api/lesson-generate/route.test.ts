import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPresetTutorLearningIntents } from '@/lib/tutorLearningIntent'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/lesson-generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/lesson-generate', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('passes tutor intent to the model prompt and fallback lesson', async () => {
    const intent = buildPresetTutorLearningIntents('get')[0]
    callProviderChatMock.mockResolvedValueOnce({ ok: false, content: '' })

    const res = await POST(
      makeRequest({
        provider: 'openai',
        topic: intent.title,
        originalQuery: 'что такое get',
        intent,
        level: 'a2',
        audience: 'adult',
      }) as never
    )
    const data = (await res.json()) as {
      lesson?: { tutorIntent?: { title: string }; theoryIntro?: string }
      fallback: boolean
    }

    expect(res.status).toBe(200)
    expect(data.fallback).toBe(true)
    expect(data.lesson?.tutorIntent?.title).toBe('Get: Basic Meanings')
    expect(data.lesson?.theoryIntro).toContain('get a message')

    const apiMessages = callProviderChatMock.mock.calls[0][0].apiMessages as Array<{ role: string; content: string }>
    expect(apiMessages[0].content).toContain('Если передан tutorIntent')
    expect(apiMessages[1].content).toContain('Tutor intent JSON')
    expect(apiMessages[1].content).toContain('I get it')
  })
})
