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

  it('does not collapse a long one-line paragraph to a single short clause', () => {
    const s1 = 'one two three four five six seven eight nine ten eleven twelve'
    const s2 = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu'
    const paragraph = `${s1}. ${s2}.`
    const result = applyCefrOutputGuard({
      mode: 'communication',
      content: paragraph,
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'en',
    })
    expect(result.content).toContain('one two three')
    expect(result.content).toContain('alpha beta')
  })

  it('preserves dialogue markers while simplifying repeat line', () => {
    const result = applyCefrOutputGuard({
      mode: 'dialogue',
      content:
        'Комментарий: Здесь нужно проще.\nСкажи: Additionally, you should utilize this strategy.',
      level: 'a2',
      audience: 'child',
    })
    expect(result.content).toContain('Комментарий:')
    expect(result.content).toContain('Скажи:')
    expect(result.content.toLowerCase()).not.toContain('additionally')
  })

  it('does not leave a dangling or after sentence_len trim', () => {
    const lecture =
      'Nature is endlessly fascinating. The intricate web of ecosystems, the raw power of weather and geology, the quiet intelligence of plants and animals, or something else entirely today.'
    const result = applyCefrOutputGuard({
      mode: 'communication',
      content: lecture,
      level: 'a1',
      audience: 'adult',
      communicationTargetLang: 'en',
    })
    expect(result.content.toLowerCase().trim().endsWith(' or')).toBe(false)
    expect(result.content.toLowerCase().trim().endsWith(', or')).toBe(false)
  })
})
