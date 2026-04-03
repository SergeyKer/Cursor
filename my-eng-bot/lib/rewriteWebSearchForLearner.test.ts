import { describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { collectLearnerEnglishSamples, rewriteWebSearchAnswerForLearner } from '@/lib/rewriteWebSearchForLearner'
import { callProviderChat } from '@/lib/callProviderChat'

vi.mock('@/lib/callProviderChat', () => ({
  callProviderChat: vi.fn(),
}))

describe('rewriteWebSearchForLearner', () => {
  it('collects recent user messages with Latin letters', () => {
    const samples = collectLearnerEnglishSamples(
      [
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'tell me news' },
        { role: 'user', content: 'только по-русски' },
        { role: 'user', content: 'ok thanks' },
      ],
      4
    )
    expect(samples).toEqual(['tell me news', 'ok thanks'])
  })

  it('returns rewritten text and strips accidental (i) prefix', async () => {
    vi.mocked(callProviderChat).mockResolvedValueOnce({
      ok: true,
      content: '(i) Simple news: it is sunny.',
    })

    const req = { nextUrl: new URL('http://localhost') } as unknown as NextRequest
    const out = await rewriteWebSearchAnswerForLearner({
      provider: 'openai',
      req,
      rawAnswer: 'Meteorological synopsis indicates elevated solar irradiance.',
      level: 'a1',
      audience: 'child',
      detailLevel: 0,
      userQuery: 'weather?',
    })

    expect(out).toBe('Simple news: it is sunny.')
    expect(callProviderChat).toHaveBeenCalledTimes(1)
  })
})
