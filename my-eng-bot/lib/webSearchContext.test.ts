import { describe, expect, it } from 'vitest'
import {
  getCommunicationWebSearchDecision,
  hasRecentWebSearchContext,
  isLikelyWebSearchFollowup,
} from './webSearchContext'
import type { ChatMessage } from './types'

describe('hasRecentWebSearchContext', () => {
  it('uses explicit webSearchTriggered marker', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'Ответ', webSearchTriggered: true },
      { role: 'user', content: 'а евро' },
    ]
    expect(hasRecentWebSearchContext(messages)).toBe(true)
  })

  it('treats (i) as context only when источники были сохранены', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: '(i) Текущий курс доллара ...',
        webSearchSources: [{ url: 'https://example.com/rate' }],
      },
      { role: 'user', content: 'а евро' },
    ]
    expect(hasRecentWebSearchContext(messages)).toBe(true)
  })

  it('does not treat bare (i) without sources as web-search context', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: '(i) What do you want to know?' },
      { role: 'user', content: 'а евро' },
    ]
    expect(hasRecentWebSearchContext(messages)).toBe(false)
  })
})

describe('isLikelyWebSearchFollowup', () => {
  it('detects ru short follow-up by year and entity', () => {
    expect(isLikelyWebSearchFollowup('а цска')).toBe(true)
  })

  it('detects en short follow-up', () => {
    expect(isLikelyWebSearchFollowup('and euro')).toBe(true)
  })
})

describe('getCommunicationWebSearchDecision', () => {
  it('turns on search for context follow-up in communication', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'а евро',
      cleanedText: 'а евро',
      recentMessages: [
        { role: 'assistant', content: '(i) Курс доллара ...', webSearchTriggered: true },
      ],
    })
    expect(decision.requested).toBe(true)
  })

  it('does not turn on search for ru detail-only follow-up after web-search context', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'подробнее',
      cleanedText: 'подробнее',
      recentMessages: [
        { role: 'assistant', content: '(i) Последняя модель Porsche ...', webSearchTriggered: true },
      ],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on search for en detail-only follow-up after web-search context', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'more details',
      cleanedText: 'more details',
      recentMessages: [
        { role: 'assistant', content: '(i) Latest Porsche model ...', webSearchTriggered: true },
      ],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on search for detail-only without web-search context', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'ещё подробнее',
      cleanedText: 'ещё подробнее',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on search for en detail-only without web-search context', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'even more details',
      cleanedText: 'even more details',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on search in non-communication mode', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'dialogue',
      explicitTranslateTarget: null,
      rawText: 'иии курс доллара',
      cleanedText: 'курс доллара',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on web search for bare «погода» (conversation topic, not live lookup)', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'погода',
      cleanedText: 'погода',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on web search for ru topic phrase "давай поговорим про погоду"', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'Давай поговорим про погоду',
      cleanedText: 'Давай поговорим про погоду',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('does not turn on web search for bare "the weather" topic', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'the weather',
      cleanedText: 'the weather',
      recentMessages: [],
    })
    expect(decision.requested).toBe(false)
  })

  it('turns on web search for recency-sensitive "the weather today"', () => {
    const decision = getCommunicationWebSearchDecision({
      mode: 'communication',
      explicitTranslateTarget: null,
      rawText: 'the weather today',
      cleanedText: 'the weather today',
      recentMessages: [],
    })
    expect(decision.requested).toBe(true)
  })
})
