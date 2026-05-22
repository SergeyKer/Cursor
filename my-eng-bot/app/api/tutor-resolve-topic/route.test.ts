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

  it('resolves short grammar function words via lesson catalog first', async () => {
    const res = await POST(makeRequest({ query: 'is' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      status?: string
      suggestions: string[]
      primaryTopic?: string
      catalogLessonIds?: string[]
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.status).toBe('resolved')
    expect(data.primaryTopic).toBe('It’s / It’s time to (A2)')
    expect(data.suggestions).toEqual(['It’s / It’s time to (A2)'])
    expect(data.catalogLessonIds).toEqual(['1'])
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

  it('returns deterministic intent options for colors without model calls', async () => {
    const res = await POST(makeRequest({ query: 'цвета' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      suggestions: string[]
      primaryTopic?: string
      intentOptions?: Array<{ title: string; goalRu: string; targetPatterns: string[]; examples: Array<{ en: string }> }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.primaryTopic).toBe('Colors as Adjectives')
    expect(data.suggestions).toContain('Colors as Adjectives')
    expect(data.intentOptions?.[0]?.goalRu).toContain('a red car')
    expect(data.intentOptions?.[0]?.targetPatterns).toContain('a red car')
    expect(data.intentOptions?.[0]?.examples.some((example) => example.en === 'a red car')).toBe(true)
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('returns deterministic intent options for get without model calls', async () => {
    const res = await POST(makeRequest({ query: 'get' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      intentOptions?: Array<{ title: string; targetPatterns: string[] }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.intentOptions?.[0]?.title).toBe('Get: Basic Meanings')
    expect(data.intentOptions?.[0]?.targetPatterns).toContain('I get it')
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('returns catalog lesson for present simple without model calls', async () => {
    const res = await POST(makeRequest({ query: 'present simple' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      suggestions: string[]
      catalogLessonIds?: string[]
      intentOptions?: Array<{ title: string; intentType?: string; targetPatterns: string[] }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.suggestions).toEqual(['I am / I am from (A1)'])
    expect(data.catalogLessonIds).toEqual(['4'])
    expect(data.intentOptions?.[0]?.intentType).toBe('short_examples')
    expect(data.intentOptions?.map((option) => option.title)).toEqual(data.suggestions)
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('returns a specific there is intent before generic to-be matching', async () => {
    const res = await POST(makeRequest({ query: 'there is' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      suggestions: string[]
      intentOptions?: Array<{ title: string; intentType?: string; canonicalKey?: string; targetPatterns: string[] }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.suggestions).toEqual(['There is / There are'])
    expect(data.intentOptions?.[0]?.canonicalKey).toBe('there_is_there_are')
    expect(data.intentOptions?.[0]?.intentType).toBe('single_rule')
    expect(data.intentOptions?.map((option) => option.title)).toEqual(data.suggestions)
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })

  it('keeps a single model suggestion as one supported intent', async () => {
    callProviderChatMock.mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({
        resolved: true,
        suggestions: ['Adverbs of Frequency'],
        suggestionMeta: [{ topic: 'Adverbs of Frequency', whyRu: 'Наречия частотности показывают, как часто что-то происходит.' }],
        primaryTopic: 'Adverbs of Frequency',
      }),
    })

    const res = await POST(makeRequest({ query: 'always usually often' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      suggestions: string[]
      intentOptions?: Array<{ title: string }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.suggestions).toEqual(['Adverbs of Frequency'])
    expect(data.intentOptions?.map((option) => option.title)).toEqual(data.suggestions)
    expect(callProviderChatMock).toHaveBeenCalledOnce()
  })

  it.each([
    {
      query: 'past simple',
      suggestions: ['I am / I am from (A1)'],
      catalogLessonIds: ['4'],
      intentType: 'short_examples',
    },
    {
      query: 'Past Simple',
      suggestions: ['I am / I am from (A1)'],
      catalogLessonIds: ['4'],
      intentType: 'short_examples',
    },
    {
      query: 'прошедшее простое',
      suggestions: ['I am / I am from (A1)'],
      catalogLessonIds: ['4'],
      intentType: 'short_examples',
    },
    {
      query: 'паст симпл',
      suggestions: ['Past Simple: Positive Sentences'],
      catalogLessonIds: undefined,
      intentType: 'form_practice',
    },
  ])(
    'returns resolved intent for $query without model calls',
    async ({ query, suggestions, catalogLessonIds, intentType }) => {
      const res = await POST(makeRequest({ query }) as never)
      const data = (await res.json()) as {
        resolved: boolean
        suggestions: string[]
        catalogLessonIds?: string[]
        intentOptions?: Array<{ title: string; intentType?: string; targetPatterns: string[] }>
      }

      expect(res.status).toBe(200)
      expect(data.resolved).toBe(true)
      expect(data.suggestions).toEqual(suggestions)
      if (catalogLessonIds) {
        expect(data.catalogLessonIds).toEqual(catalogLessonIds)
      } else {
        expect(data.catalogLessonIds).toBeUndefined()
      }
      expect(data.intentOptions?.[0]?.intentType).toBe(intentType)
      expect(data.intentOptions?.map((option) => option.title)).toEqual(data.suggestions)
      expect(callProviderChatMock).not.toHaveBeenCalled()
    }
  )

  it('returns several meanings only for ambiguous has', async () => {
    const res = await POST(makeRequest({ query: 'has' }) as never)
    const data = (await res.json()) as {
      resolved: boolean
      suggestions: string[]
      intentOptions?: Array<{ title: string; canonicalKey?: string }>
    }

    expect(res.status).toBe(200)
    expect(data.resolved).toBe(true)
    expect(data.suggestions).toEqual([
      'Have / Has — possession',
      'Has + V3 — Present Perfect',
      'Has to — obligation',
    ])
    expect(data.intentOptions?.map((option) => option.canonicalKey)).toEqual([
      'have_has_possession',
      'present_perfect_has',
      'has_to_obligation',
    ])
    expect(callProviderChatMock).not.toHaveBeenCalled()
  })
})
