import { describe, expect, it } from 'vitest'
import { computeTranslationGoldVerdict, pickTranslationGoldForVerdict } from './translationVerdict'

describe('computeTranslationGoldVerdict', () => {
  const ru = 'Я люблю поездки.'

  it('accepts exact match after normalization', () => {
    const gold = 'I like trips.'
    expect(
      computeTranslationGoldVerdict({ userText: 'i like trips', goldEnglish: gold, ruPrompt: ru })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('rejects typo in content word', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like triips.',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('gold_mismatch')
  })

  it('rejects Cyrillic in answer', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like trips поездки',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('cyrillic_in_answer')
  })

  it('rejects extra English tail', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like trips around the world every day',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })

  it('rejects truncated answer', () => {
    const gold = 'I like trips.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like.',
      goldEnglish: gold,
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('answer_incomplete')
  })

  it('accepts contraction equivalent to gold', () => {
    const gold = "I don't like trips."
    expect(
      computeTranslationGoldVerdict({
        userText: 'I do not like trips.',
        goldEnglish: gold,
        ruPrompt: 'Я не люблю поездки.',
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('accepts I am vs I’m for same gold', () => {
    const ru = 'Я студент.'
    const gold = 'I am a student.'
    expect(
      computeTranslationGoldVerdict({
        userText: "I'm a student.",
        goldEnglish: gold,
        ruPrompt: ru,
      })
    ).toEqual({ ok: true, reasons: [] })
    expect(
      computeTranslationGoldVerdict({
        userText: 'I am a student.',
        goldEnglish: "I'm a student.",
        ruPrompt: ru,
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('accepts like to cook vs like cooking (gerund / infinitive)', () => {
    const ruCook = 'Я люблю готовить.'
    const gold = 'I like cooking.'
    expect(
      computeTranslationGoldVerdict({
        userText: 'I like to cook.',
        goldEnglish: gold,
        ruPrompt: ruCook,
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('allows like vs love for pet when RU has narrow affection (люблю/обожаю)', () => {
    const ruPet = 'Я люблю свою собаку.'
    const gold = 'I like my dog.'
    expect(
      computeTranslationGoldVerdict({
        userText: 'I love my dog.',
        goldEnglish: gold,
        ruPrompt: ruPet,
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('rejects love vs like for pet when RU is neutral about affection', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I love my dog.',
      goldEnglish: 'I like my dog.',
      ruPrompt: 'У меня есть собака.',
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('gold_mismatch')
  })

  it('allows love vs like in family / close people context', () => {
    expect(
      computeTranslationGoldVerdict({
        userText: 'I love my mom.',
        goldEnglish: 'I like my mom.',
        ruPrompt: 'Я люблю маму.',
      })
    ).toEqual({ ok: true, reasons: [] })
  })

  it('does not allow love vs like for non-pet when gold uses like', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I love trips.',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })

  it('rejects gibberish answer', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'sdfdffdfdfdfd',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('gibberish_in_answer')
  })

  it('rejects answer with injected extra adjective', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I like beautiful trips.',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
  })

  it('rejects answer with missing object noun', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I like.',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('answer_incomplete')
  })

  it('rejects strict prefix of full expected sentence', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I like walking',
      goldEnglish: 'I like walking with my friends.',
      ruPrompt: 'Мне нравится гулять с друзьями.',
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('answer_incomplete')
  })

  it('неполный перевод: одна ошибка числа + пропущенный хвост про выходные', () => {
    const ruFull = 'Мне нравится смотреть фильмы на выходных.'
    const gold = 'I like to watch movies on the weekends.'
    const v = computeTranslationGoldVerdict({
      userText: 'I like to watch movie',
      goldEnglish: gold,
      ruPrompt: ruFull,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('answer_incomplete')
  })

  it('rejects mixed latin+cyrillic childish substitution', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'I like красивые trips.',
      goldEnglish: 'I like trips.',
      ruPrompt: ru,
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('cyrillic_in_answer')
  })

  it('rejects weak gold coverage for a long prompt (prevents false success on short fragments)', () => {
    const v = computeTranslationGoldVerdict({
      userText: 'You like playing with friends.',
      goldEnglish: 'You like playing.',
      ruPrompt: 'Ты любишь играть с друзьями.',
    })
    expect(v.ok).toBe(false)
    expect(v.reasons).toContain('gold_not_plausible_for_prompt')
  })

  it('accepts short gold matching one RU topic keyword when RU lists several themes (≤5 EN tokens)', () => {
    const ru = 'У меня есть семья друзья и работа.'
    const gold = 'You have a family.'
    expect(
      computeTranslationGoldVerdict({
        userText: 'You have a family.',
        goldEnglish: gold,
        ruPrompt: ru,
      })
    ).toEqual({ ok: true, reasons: [] })
  })
})

describe('pickTranslationGoldForVerdict', () => {
  it('prefers visible Скажи when user matches it but __TRAN__ differs', () => {
    const card = [
      'Переведи: У тебя есть семья?',
      'Переведи на английский язык.',
      'Скажи: You have a family.',
      '__TRAN_REPEAT_REF__: I have a family.',
    ].join('\n')
    const ru = 'У тебя есть семья?'
    expect(
      pickTranslationGoldForVerdict({
        assistantContent: card,
        ruPrompt: ru,
        userText: 'You have a family.',
      })
    ).toBe('You have a family.')
  })

  it('keeps hidden ref when it is the one that matches the user', () => {
    const card = [
      'Переведи: У меня есть кот.',
      'Переведи на английский.',
      'Скажи: I have a dog.',
      '__TRAN_REPEAT_REF__: I have a cat.',
    ].join('\n')
    const ru = 'У меня есть кот.'
    expect(
      pickTranslationGoldForVerdict({
        assistantContent: card,
        ruPrompt: ru,
        userText: 'I have a cat.',
      })
    ).toBe('I have a cat.')
  })

  it('returns null when neither hidden nor visible gold matches current RU prompt semantics', () => {
    const card = [
      'Переведи: У меня есть кот.',
      'Переведи на английский.',
      'Скажи: I have a dog.',
      '__TRAN_REPEAT_REF__: I have a pig.',
    ].join('\n')
    const ru = 'У меня есть кот.'
    expect(
      pickTranslationGoldForVerdict({
        assistantContent: card,
        ruPrompt: ru,
        userText: 'I have a cat.',
      })
    ).toBeNull()
  })
})
