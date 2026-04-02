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

  it('falls back to (i) marker in assistant content', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: '(i) Текущий курс доллара ...' },
      { role: 'user', content: 'а евро' },
    ]
    expect(hasRecentWebSearchContext(messages)).toBe(true)
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
      recentMessages: [{ role: 'assistant', content: '(i) Курс доллара ...' }],
    })
    expect(decision.requested).toBe(true)
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
