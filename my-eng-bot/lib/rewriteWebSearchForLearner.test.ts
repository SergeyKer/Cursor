import { describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import {
  collectLearnerEnglishSamples,
  rewriteWebSearchAnswerForLearner,
  simplifyEnglishAnswerForLearner,
  shouldRewriteWebSearchForLearner,
} from '@/lib/rewriteWebSearchForLearner'
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

  it('simplifyEnglishAnswerForLearner requests stronger simplification on retry', async () => {
    vi.mocked(callProviderChat).mockResolvedValueOnce({
      ok: true,
      content: 'Short and simple update.',
    })

    const req = { nextUrl: new URL('http://localhost') } as unknown as NextRequest
    const out = await simplifyEnglishAnswerForLearner({
      provider: 'openai',
      req,
      rawAnswer: 'Long and hard source text.',
      level: 'a2',
      audience: 'adult',
      detailLevel: 1,
      userQuery: 'economic news',
      sourceKind: 'web_search',
      previousDraftTooHard: true,
    })

    expect(out).toBe('Short and simple update.')
    const latestCall = vi.mocked(callProviderChat).mock.calls.at(-1)?.[0]
    expect(String(latestCall?.maxTokens)).toBe('260')
    expect(String(latestCall?.apiMessages?.[0]?.content ?? '')).toContain('Previous draft was still above target CEFR')
  })

  it('adds factual-summary instruction when required', async () => {
    vi.mocked(callProviderChat).mockResolvedValueOnce({
      ok: true,
      content: 'Simple factual update.',
    })
    const req = { nextUrl: new URL('http://localhost') } as unknown as NextRequest
    await simplifyEnglishAnswerForLearner({
      provider: 'openai',
      req,
      rawAnswer: 'Complex draft.',
      level: 'a2',
      audience: 'adult',
      detailLevel: 0,
      userQuery: 'game news',
      sourceKind: 'web_search',
      requireFactualSummary: true,
    })
    const latestCall = vi.mocked(callProviderChat).mock.calls.at(-1)?.[0]
    expect(String(latestCall?.apiMessages?.[0]?.content ?? '')).toContain(
      'Return 1-2 simple factual sentences about the user topic'
    )
  })

  it('rewrites only for communication + web-search + english', () => {
    expect(
      shouldRewriteWebSearchForLearner({
        mode: 'communication',
        webSearchTriggered: true,
        replyLanguage: 'en',
      })
    ).toBe(true)

    expect(
      shouldRewriteWebSearchForLearner({
        mode: 'communication',
        webSearchTriggered: true,
        replyLanguage: 'ru',
      })
    ).toBe(false)
    expect(
      shouldRewriteWebSearchForLearner({
        mode: 'dialogue',
        webSearchTriggered: true,
        replyLanguage: 'en',
      })
    ).toBe(false)
    expect(
      shouldRewriteWebSearchForLearner({
        mode: 'communication',
        webSearchTriggered: false,
        replyLanguage: 'en',
      })
    ).toBe(false)
  })
})
