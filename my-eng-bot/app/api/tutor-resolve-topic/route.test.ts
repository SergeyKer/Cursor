import { beforeEach, describe, expect, it, vi } from 'vitest'

const callProviderChatMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: callProviderChatMock,
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/tutor-resolve-topic', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tutor-resolve-topic', () => {
  beforeEach(() => {
    callProviderChatMock.mockReset()
  })

  it('accepts short grammar function words as topic requests', async () => {
    const res = await POST(makeRequest({ query: 'is' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      status?: string
      suggestions: string[]
      primaryTopic?: string
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.status).toBe('resolved')
    expect(data.primaryTopic).toBe('To Be')
    expect(data.suggestions).toContain('To Be')
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('rejects obvious noise before topic resolution', async () => {
    const res = await POST(makeRequest({ query: 'sdf' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      status?: string
      suggestions: string[]
      clarifyPrompt?: string
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(false)
    expect(data.status).toBe('rejected')
    expect(data.suggestions).toEqual([])
    expect(data.clarifyPrompt).toContain('Не похоже на осмысленный запрос')
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('lets meaningful broad input reach topic suggestion generation', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({
        resolved: true,
        suggestions: ['Articles', 'Plural and Singular Nouns'],
        suggestionMeta: [
          { topic: 'Articles', whyRu: 'Артикли помогают говорить о конкретном или любом предмете.' },
          { topic: 'Plural and Singular Nouns', whyRu: 'Единственное и множественное число для существительных.' },
        ],
        primaryTopic: 'Articles',
      }),
    })

    const res = await POST(makeRequest({ query: 'cat' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      status?: string
      suggestions: string[]
      primaryTopic?: string
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.status).toBe('resolved')
    expect(data.primaryTopic).toBe('Articles')
    expect(data.suggestions).toEqual(['Articles', 'Plural and Singular Nouns'])
    expect(callProviderChatMock).toHaveBeenCalledOnce()
  })
})
