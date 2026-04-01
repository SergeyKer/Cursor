import { describe, expect, it } from 'vitest'
import { applyCefrOutputGuard } from './levelGuard'

describe('applyCefrOutputGuard', () => {
  it('keeps RU communication untouched', () => {
    const result = applyCefrOutputGuard({
      mode: 'communication',
      content: 'Привет! Чем могу помочь?',
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'ru',
    })
    expect(result.content).toBe('Привет! Чем могу помочь?')
    expect(result.leaked).toBe(false)
  })

  it('simplifies advanced EN words for low level communication', () => {
    const result = applyCefrOutputGuard({
      mode: 'communication',
      content: 'Additionally, we can utilize this approach to facilitate progress.',
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'en',
    })
    expect(result.content.toLowerCase()).toContain('also')
    expect(result.content.toLowerCase()).toContain('use')
  })

  it('preserves dialogue markers while simplifying repeat line', () => {
    const result = applyCefrOutputGuard({
      mode: 'dialogue',
      content:
        'Комментарий: Здесь нужно проще.\nПовтори: Additionally, you should utilize this strategy.',
      level: 'a2',
      audience: 'child',
    })
    expect(result.content).toContain('Комментарий:')
    expect(result.content).toContain('Повтори:')
    expect(result.content.toLowerCase()).not.toContain('additionally')
  })
})
