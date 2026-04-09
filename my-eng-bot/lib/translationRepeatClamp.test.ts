import { describe, expect, it } from 'vitest'
import {
  applyTranslationRepeatSourceClampToContent,
  clampTranslationRepeatToRuPrompt,
  replaceTranslationRepeatInContent,
} from './translationRepeatClamp'

describe('clampTranslationRepeatToRuPrompt', () => {
  it('removes weekend adjunct when Russian prompt has no выходные', () => {
    const ru = 'Я часто встречаюсь с друзьями.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I often meet with friends on the weekend.',
      ru
    )
    expect(changed).toBe(true)
    expect(clamped.toLowerCase()).not.toContain('weekend')
    expect(clamped).toMatch(/friends/i)
  })

  it('keeps weekend when Russian mentions выходные', () => {
    const ru = 'Я часто встречаюсь с друзьями в выходные.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I often meet with friends on the weekend.',
      ru
    )
    expect(changed).toBe(false)
    expect(clamped.toLowerCase()).toContain('weekend')
  })

  it('does not change when no extra adjunct', () => {
    const ru = 'Я часто встречаюсь с друзьями.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt('I often meet with friends.', ru)
    expect(changed).toBe(false)
    expect(clamped).toBe('I often meet with friends.')
  })
})

describe('applyTranslationRepeatSourceClampToContent', () => {
  it('replaces Повтори line in full assistant payload', () => {
    const content = `Комментарий: Ошибка.
Время: Present Simple.
Конструкция: Subject + V1.
Повтори: I often meet with friends on the weekend.`
    const out = applyTranslationRepeatSourceClampToContent(content, 'Я часто встречаюсь с друзьями.')
    expect(out).toContain('Повтори:')
    expect(out.toLowerCase()).not.toContain('weekend')
  })
})

describe('replaceTranslationRepeatInContent', () => {
  it('preserves numbered prefix', () => {
    const c = '1) Повтори: Hello.'
    expect(replaceTranslationRepeatInContent(c, 'Hi there')).toContain('1) Повтори: Hi there.')
  })
})
