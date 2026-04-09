import { describe, expect, it } from 'vitest'
import {
  applyTranslationRepeatSourceClampToContent,
  clampTranslationRepeatToRuPrompt,
  enforceAuthoritativeTranslationRepeat,
  enforceAuthoritativeTranslationRepeatEnCue,
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

  it('aligns repeat topic words to the Russian prompt', () => {
    const ru = 'Я люблю играть с друзьями.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt('I love to play outside with my cats.', ru)
    expect(changed).toBe(true)
    expect(clamped.toLowerCase()).toContain('friends')
    expect(clamped.toLowerCase()).not.toContain('cats')
  })

  it('aligns frequency adverb when Russian has иногда but repeat wrongly has rarely (shared topic words do not block)', () => {
    const ru = 'Я иногда играю в футбол с друзьями.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I rarely play football with my friends.',
      ru
    )
    expect(changed).toBe(true)
    expect(clamped.toLowerCase()).toContain('sometimes')
    expect(clamped.toLowerCase()).not.toContain('rarely')
    expect(clamped.toLowerCase()).toContain('friends')
    expect(clamped.toLowerCase()).toContain('football')
  })

  it('strips with my friends from repeat when Russian prompt has no friends', () => {
    const ru = 'Я обычно готовлю пасту на ужин.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I usually cook pasta for dinner with my friends.',
      ru
    )
    expect(changed).toBe(true)
    expect(clamped.toLowerCase()).not.toContain('friends')
    expect(clamped.toLowerCase()).not.toContain('friend')
    expect(clamped.toLowerCase()).toContain('usually')
    expect(clamped.toLowerCase()).toContain('pasta')
  })

  it('keeps with my friends when Russian prompt mentions friends', () => {
    const ru = 'Я обычно готовлю пасту на ужин с друзьями.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I usually cook pasta for dinner with my friends.',
      ru
    )
    expect(changed).toBe(false)
    expect(clamped.toLowerCase()).toContain('friends')
  })

  it('не подменяет family на food для «… еду … семьи» (регрессия cook food for my food)', () => {
    const ru = 'Я люблю готовить еду для своей семьи.'
    const { clamped, changed } = clampTranslationRepeatToRuPrompt(
      'I like to cook food for my family.',
      ru
    )
    expect(changed).toBe(false)
    expect(clamped.toLowerCase()).toContain('family')
    expect(clamped.toLowerCase()).not.toMatch(/food\s+for\s+my\s+food/)
  })
})

describe('enforceAuthoritativeTranslationRepeat', () => {
  it('replaces model Повтори with clamped prior tutor line so user additions do not win', () => {
    const ru = 'Я всегда добавляю много сыра.'
    const content = `Комментарий: Лексическая ошибка.\nПовтори: I always add a lot of yellow cheese.`
    const prior = 'I always add a lot of cheese.'
    const out = enforceAuthoritativeTranslationRepeat(content, ru, prior)
    expect(out.toLowerCase()).not.toContain('yellow')
    expect(out).toMatch(/Повтори:\s*I always add a lot of cheese/i)
  })

  it('without prior repeat, clamps model line to Russian prompt as before', () => {
    const ru = 'Я люблю играть с друзьями.'
    const content = `Комментарий: Ошибка.\nПовтори: I love to play outside with my cats.`
    const out = enforceAuthoritativeTranslationRepeat(content, ru, null)
    expect(out.toLowerCase()).toContain('friends')
    expect(out.toLowerCase()).not.toContain('cats')
  })

  it('без русского промпта подставляет prior «Повтори» и убирает несвязный текст модели', () => {
    const content = `Комментарий: Ошибка.\nПовтори: We go to the park.`
    const prior = 'I love walking in the park in the evenings.'
    const out = enforceAuthoritativeTranslationRepeat(content, null, prior)
    expect(out.toLowerCase()).toContain('love walking')
    expect(out.toLowerCase()).not.toContain('we go to the park')
  })
})

describe('enforceAuthoritativeTranslationRepeatEnCue', () => {
  it('вставляет Повтори_перевод перед Повтори с тем же английским, что в Повтори', () => {
    const content = `Комментарий: Ошибка.\nКонструкция: S + V1\nПовтори: I love to cook.`
    const out = enforceAuthoritativeTranslationRepeatEnCue(content)
    expect(out).toContain('Повтори_перевод: I love to cook.')
    expect(out.indexOf('Повтори_перевод')).toBeLessThan(out.indexOf('Повтори:'))
  })

  it('не меняет ответ без английского Повтори', () => {
    const content = `Комментарий: Отлично!\nКонструкция: …`
    expect(enforceAuthoritativeTranslationRepeatEnCue(content)).toBe(content)
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

  it('rewrites repeat line to match the Russian prompt keywords', () => {
    const content = `Комментарий: Отлично!
Время: Present Simple.
Конструкция: Subject + V1.
Формы:
+: I love to play outside with my friends.
?: Do I love to play outside with my friends?
-: I do not love to play outside with my friends.
Повтори: I love to play outside with my cats.`
    const out = applyTranslationRepeatSourceClampToContent(content, 'Я люблю играть с друзьями.')
    const repeatLine = out.split(/\r?\n/).find((line) => /^Повтори\s*:/i.test(line)) ?? ''
    expect(repeatLine.toLowerCase()).toContain('friends')
    expect(repeatLine.toLowerCase()).not.toContain('cats')
  })
})

describe('replaceTranslationRepeatInContent', () => {
  it('preserves numbered prefix', () => {
    const c = '1) Повтори: Hello.'
    expect(replaceTranslationRepeatInContent(c, 'Hi there')).toContain('1) Повтори: Hi there.')
  })
})
