import { describe, expect, it } from 'vitest'
import { isNarrativeOrPastWeatherRemark, shouldAllowGismeteoByIntent } from '@/lib/weatherIntentGuard'

describe('isNarrativeOrPastWeatherRemark', () => {
  it('detects russian narrative past-weather remarks', () => {
    expect(isNarrativeOrPastWeatherRemark('хорошая была погода на выходных')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('вчера была плохая погода')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('погода в субботу была не очень')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('погода в понедельник была отличная')).toBe(true)
  })

  it('detects english narrative past-weather remarks', () => {
    expect(isNarrativeOrPastWeatherRemark('the weather was great last weekend')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('we had good weather last weekend')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('the weather on Saturday was not great')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('weather on Monday was bad')).toBe(true)
  })

  it('detects mixed non-weather weekend activity remarks', () => {
    expect(isNarrativeOrPastWeatherRemark('играли на weekends')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('мы играли на weekend')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('played on weekends')).toBe(true)
    expect(isNarrativeOrPastWeatherRemark('на weekend играли в football')).toBe(true)
  })

  it('does not mark explicit weather requests as narrative', () => {
    expect(isNarrativeOrPastWeatherRemark('Какая погода сейчас в Москве?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('Какая погода в среду в Москве?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('What is the weather in London now?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('What is the weather in Moscow on Monday?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('Will it rain this weekend?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('weather в Москве на выходных?')).toBe(false)
    expect(isNarrativeOrPastWeatherRemark('Какая weather in Moscow on Saturday?')).toBe(false)
  })
})

describe('shouldAllowGismeteoByIntent', () => {
  it('blocks narrative non-followup messages', () => {
    expect(shouldAllowGismeteoByIntent({ text: 'хорошая была погода на выходных', isFollowup: false })).toBe(false)
  })

  it('keeps follow-up weather flow allowed', () => {
    expect(shouldAllowGismeteoByIntent({ text: 'а вечером', isFollowup: true })).toBe(true)
  })
})

