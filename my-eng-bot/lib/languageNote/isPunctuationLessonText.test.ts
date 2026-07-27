import { describe, expect, it } from 'vitest'
import {
  isCommaJunkText,
  isPunctuationOrCapitalizationLessonText,
} from '@/lib/languageNote/isPunctuationLessonText'

describe('isPunctuationOrCapitalizationLessonText', () => {
  it('flags Russian Добавляем/Добавить точку (screenshot leak)', () => {
    expect(
      isPunctuationOrCapitalizationLessonText(
        "Добавляем точку после 'swimming' для завершенности мысли."
      )
    ).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('Добавить точку в конце.')).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('Нужна точка в конце.')).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('точку после swimming')).toBe(true)
  })

  it('flags EN period lessons without bare "period of time"', () => {
    expect(isPunctuationOrCapitalizationLessonText("Added a period after 'Hello'.")).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('period after Hello')).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('in this period of time we use Past')).toBe(
      false
    )
  })

  it('does not flag запятнать as comma junk', () => {
    expect(isCommaJunkText('Репутацию не запятнать — говорите точно.')).toBe(false)
    expect(
      isPunctuationOrCapitalizationLessonText('Репутацию не запятнать — говорите точно.')
    ).toBe(false)
  })

  it('flags commas and caps', () => {
    expect(isPunctuationOrCapitalizationLessonText('Ставьте запятую перед and.')).toBe(true)
    expect(isPunctuationOrCapitalizationLessonText('Сначала с заглавной буквы.')).toBe(true)
  })

  it('keeps real grammar reasons', () => {
    expect(
      isPunctuationOrCapitalizationLessonText(
        'Правильный предлог: by the seaside вместо on the seaside.'
      )
    ).toBe(false)
    expect(
      isPunctuationOrCapitalizationLessonText(
        'После he нужна форма practices: practice → practices.'
      )
    ).toBe(false)
  })
})
