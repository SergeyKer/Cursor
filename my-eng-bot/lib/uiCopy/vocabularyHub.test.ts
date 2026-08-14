import { describe, expect, it } from 'vitest'
import { vocabDisplayLabel, vocabHubCopy } from '@/lib/uiCopy/vocabularyHub'

describe('vocabHubCopy status labels', () => {
  it('splits adult shelf from CTA', () => {
    const copy = vocabHubCopy('adult')
    expect(copy.inFeedTitle).toBe('Ждут речи')
    expect(copy.say).toBe('Сказать Engvo')
    expect(vocabDisplayLabel('in_feed', 'adult')).toBe('Ждут речи')
  })

  it('keeps child shelf as action', () => {
    const copy = vocabHubCopy('child')
    expect(copy.inFeedTitle).toBe('Скажи Engvo')
    expect(copy.say).toBe('Скажи Engvo')
    expect(vocabDisplayLabel('in_feed', 'child')).toBe('Скажи Engvo')
  })

  it('keeps lists and status shelves as different names', () => {
    const adult = vocabHubCopy('adult')
    const child = vocabHubCopy('child')
    expect(adult.listsTitle).toBe('Мои списки')
    expect(child.listsTitle).toBe('Мои')
    expect(adult.shelvesTitle).toBe('Статусы')
    expect(child.shelvesTitle).toBe('Статусы')
    expect(adult.nowDueLine(3, 22)).toBe('Повторить 3 из 22')
    expect(adult.pick).toBe('Выбрать готовые')
  })

  it('describes catalog as source picker, not mixed worlds', () => {
    const adult = vocabHubCopy('adult')
    const child = vocabHubCopy('child')
    expect(adult.catalogBody).toBe('Разговорник, необходимые, свои списки')
    expect(child.catalogBody).toBe('Разговорник, необходимые, свои')
    expect(adult.worldsTitle).toBe('Самые необходимые слова')
    expect(adult.listsTitle).toBe('Мои списки')
    expect(adult.catalogPhrasebookBody).toContain('Темы')
  })
})
