import { describe, expect, it } from 'vitest'
import {
  formatHandoffLemmaLine,
  vocabDisplayLabel,
  vocabHubCopy,
  vocabShelfChipLabel,
} from '@/lib/uiCopy/vocabularyHub'

describe('vocabHubCopy status labels', () => {
  it('keeps the same shelf words for adult and child', () => {
    for (const audience of ['adult', 'child'] as const) {
      expect(vocabDisplayLabel('study', audience)).toBe('Учу')
      expect(vocabDisplayLabel('in_feed', audience)).toBe('Скажи')
      expect(vocabDisplayLabel('mastered', audience)).toBe('Умею')
      expect(vocabDisplayLabel('know', audience)).toBe('Знакомо')
      expect(vocabDisplayLabel('fix', audience)).toBe('Ошибся')
      expect(vocabHubCopy(audience).shelvesTitle).toBe('Мои слова')
      expect(vocabHubCopy(audience).inFeedTitle).toBe('Скажи')
    }
  })

  it('splits adult shelf from CTA', () => {
    const copy = vocabHubCopy('adult')
    expect(copy.say).toBe('Сказать Engvo')
    expect(vocabDisplayLabel('in_feed', 'adult')).not.toBe(copy.say)
  })

  it('keeps child CTA as Скажи Engvo', () => {
    const copy = vocabHubCopy('child')
    expect(copy.say).toBe('Скажи Engvo')
    expect(vocabDisplayLabel('in_feed', 'child')).toBe('Скажи')
  })

  it('keeps lists and status shelves as different names', () => {
    const adult = vocabHubCopy('adult')
    const child = vocabHubCopy('child')
    expect(adult.listsTitle).toBe('Мои списки')
    expect(child.listsTitle).toBe('Мои')
    expect(adult.addWordsTitle).toBe('Внести новые слова')
    expect(adult.nowTitle).toBe('Быстрый старт')
    expect(adult.pick).toBe('Выбрать готовые')
  })

  it('names hub catalog Слова without a table of contents', () => {
    const adult = vocabHubCopy('adult')
    expect(adult.catalogTitle).toBe('Слова')
    expect(adult.catalogScreenTitle).toBe('Слова')
    expect(adult.worldsTitle).toBe('Самые необходимые слова')
    expect(adult.listsTitle).toBe('Мои списки')
    expect(adult.catalogPhrasebookBody).toContain('Темы')
  })

  it('formats shelf chips with counts including zero', () => {
    expect(vocabShelfChipLabel('Учу', 3)).toBe('Учу · 3')
    expect(vocabShelfChipLabel('Учу', 0)).toBe('Учу · 0')
  })

  it('names translation handoff as закрепить with lemma line', () => {
    expect(vocabHubCopy('adult').handoffTranslation).toBe('Закрепить в переводе')
    expect(vocabHubCopy('child').handoffTranslation).toBe('Закрепить в переводе')
    expect(vocabHubCopy('adult')).not.toHaveProperty('translationEmpty')
    expect(formatHandoffLemmaLine(['hi', 'Name'])).toBe('hi · Name')
    expect(formatHandoffLemmaLine(['  hi  ', '', 'Name'])).toBe('hi · Name')
    expect(formatHandoffLemmaLine([])).toBe('')
  })
})
