import { describe, expect, it } from 'vitest'
import {
  buildTranslationAnyAxisPromptRules,
  detectTranslationAdvancedToNextDrill,
  resolveTranslationAnyAxes,
} from './translationAnyAxis'
import { stableHash32 } from './freeTalkDialogueTense'

const pickLevel = () => 'a2'

describe('detectTranslationAdvancedToNextDrill', () => {
  it('true only for SUCCESS with Переведи далее and without ERROR markers', () => {
    expect(
      detectTranslationAdvancedToNextDrill(
        ['Комментарий: Молодец.', 'Переведи далее: Я читаю.', 'Переведи на английский.'].join('\n')
      )
    ).toBe(true)
    expect(
      detectTranslationAdvancedToNextDrill(
        ['Комментарий_перевод: Ок.', 'Ошибки:', '- "a" → "b"', 'Скажи: I read.'].join('\n')
      )
    ).toBe(false)
  })
})

describe('resolveTranslationAnyAxes', () => {
  it('uses validated current and picks different next when pool>1', () => {
    const result = resolveTranslationAnyAxes({
      audience: 'adult',
      menuLevel: 'a2',
      menuSentenceType: 'negative',
      dialogSeed: 'seed',
      drillIndex: 2,
      topic: 'food',
      usedTensesRaw: ['present_simple'],
      currentAxisRaw: {
        tense: 'present_continuous',
        effectiveLevel: 'a2',
        effectiveSentenceType: 'negative',
      },
      pickTranslationEffectiveLevel: pickLevel,
      stableHash32,
    })
    expect(result.current.tense).toBe('present_continuous')
    expect(result.current.effectiveSentenceType).toBe('negative')
    expect(result.next.tense).not.toBe('present_continuous')
    expect(result.usedTenses).toContain('present_continuous')
  })

  it('picks initial current when axis missing', () => {
    const result = resolveTranslationAnyAxes({
      audience: 'adult',
      menuLevel: 'a1',
      menuSentenceType: 'mixed',
      dialogSeed: 'seed2',
      drillIndex: 0,
      topic: 'hobbies',
      usedTensesRaw: [],
      currentAxisRaw: null,
      pickTranslationEffectiveLevel: pickLevel,
      stableHash32,
    })
    expect(['present_simple', 'present_continuous']).toContain(result.current.tense)
    expect(result.current.effectiveSentenceType).not.toBe('mixed')
    expect(result.usedTenses).toContain(result.current.tense)
  })
})

describe('buildTranslationAnyAxisPromptRules', () => {
  it('mentions current and next and ERROR/SUCCESS split', () => {
    const text = buildTranslationAnyAxisPromptRules({
      current: {
        tense: 'present_simple',
        effectiveLevel: 'a2',
        effectiveSentenceType: 'general',
      },
      next: {
        tense: 'past_simple',
        effectiveLevel: 'a2',
        effectiveSentenceType: 'interrogative',
      },
      tenseLabel: (id) => id,
    })
    expect(text).toMatch(/ERROR path/i)
    expect(text).toMatch(/SUCCESS path/i)
    expect(text).toMatch(/present_simple/)
    expect(text).toMatch(/past_simple/)
  })
})
