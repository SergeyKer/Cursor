import { describe, expect, it } from 'vitest'
import { predictWillFetchFromInternet } from '@/lib/predictCommunicationInternetFetch'
import { getLastWeatherLocationQuery } from '@/lib/weatherLocationQuery'
import type { ChatMessage } from '@/lib/types'

describe('predictWillFetchFromInternet', () => {
  it('product lock: always false for communication (no web / weather fetch)', () => {
    const cases: Array<{ rawText: string; messages: ChatMessage[] }> = [
      { rawText: 'Как прошел ваш день?', messages: [{ role: 'user', content: 'Как прошел ваш день?' }] },
      { rawText: 'какие последние новости', messages: [{ role: 'user', content: 'какие последние новости' }] },
      { rawText: 'погода в Москве на выходных', messages: [{ role: 'user', content: 'погода в Москве на выходных' }] },
      {
        rawText: 'а вечером?',
        messages: [
          { role: 'user', content: 'погода в Москве' },
          { role: 'assistant', content: '(i) Сейчас в Москве +8°C', webSearchTriggered: true },
          { role: 'user', content: 'а вечером?' },
        ],
      },
    ]
    for (const c of cases) {
      expect(
        predictWillFetchFromInternet({
          mode: 'communication',
          explicitTranslateTarget: null,
          rawText: c.rawText,
          messagesWithCurrentUser: c.messages,
        })
      ).toBe(false)
    }
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
