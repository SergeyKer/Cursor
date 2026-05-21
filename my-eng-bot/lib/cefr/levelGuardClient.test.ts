import { describe, expect, it } from 'vitest'
import { applyCefrOutputGuardClient } from './levelGuardClient'

describe('applyCefrOutputGuardClient', () => {
  it('simplifies advanced EN words for low level communication', () => {
    const result = applyCefrOutputGuardClient({
      mode: 'communication',
      content: 'Additionally, we can utilize this approach to facilitate progress.',
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'en',
    })
    expect(result.content.toLowerCase()).toContain('also')
    expect(result.content.toLowerCase()).toContain('use')
  })

  it('keeps RU communication untouched', () => {
    const result = applyCefrOutputGuardClient({
      mode: 'communication',
      content: 'Привет! Чем могу помочь?',
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'ru',
    })
    expect(result.content).toBe('Привет! Чем могу помочь?')
    expect(result.leaked).toBe(false)
  })
})
