import { describe, expect, it } from 'vitest'
import { predictWillFetchFromInternet } from '@/lib/predictCommunicationInternetFetch'
import { getLastWeatherLocationQuery } from '@/lib/weatherLocationQuery'
import type { ChatMessage } from '@/lib/types'

describe('predictWillFetchFromInternet', () => {
  it('returns false for regular communication message', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'Как прошел ваш день?' }]
    expect(
      predictWillFetchFromInternet({
        mode: 'communication',
        explicitTranslateTarget: null,
        rawText: 'Как прошел ваш день?',
        messagesWithCurrentUser: messages,
      })
    ).toBe(false)
  })

  it('returns false for narrative weather statement without city', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'плохая была погода в среду' }]
    expect(
      predictWillFetchFromInternet({
        mode: 'communication',
        explicitTranslateTarget: null,
        rawText: 'плохая была погода в среду',
        messagesWithCurrentUser: messages,
      })
    ).toBe(false)
  })

  it('returns true for web-search intent query', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'какие последние новости' }]
    expect(
      predictWillFetchFromInternet({
        mode: 'communication',
        explicitTranslateTarget: null,
        rawText: 'какие последние новости',
        messagesWithCurrentUser: messages,
      })
    ).toBe(true)
  })

  it('returns true for weather query with explicit location', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'погода в Москве на выходных' }]
    expect(
      predictWillFetchFromInternet({
        mode: 'communication',
        explicitTranslateTarget: null,
        rawText: 'погода в Москве на выходных',
        messagesWithCurrentUser: messages,
      })
    ).toBe(true)
  })

  it('returns true for weather follow-up when location exists in history', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'погода в Москве' },
      { role: 'assistant', content: '(i) Сейчас в Москве +8°C', webSearchTriggered: true },
      { role: 'user', content: 'а вечером?' },
    ]
    expect(
      predictWillFetchFromInternet({
        mode: 'communication',
        explicitTranslateTarget: null,
        rawText: 'а вечером?',
        messagesWithCurrentUser: messages,
      })
    ).toBe(true)
  })
})

describe('getLastWeatherLocationQuery', () => {
  it('extracts location from previous non-followup weather user message', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'погода в Санкт-Петербурге' },
      { role: 'assistant', content: '(i) Сейчас в Санкт-Петербурге +5°C', webSearchTriggered: true },
      { role: 'user', content: 'а на выходных?' },
    ]
    expect(getLastWeatherLocationQuery(messages)).toBe('Санкт-Петербурге')
  })
})

