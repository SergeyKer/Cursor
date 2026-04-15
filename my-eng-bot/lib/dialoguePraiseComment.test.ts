import { describe, expect, it } from 'vitest'
import {
  isKommentariyPurePraiseOnly,
  kommentariyStartsWithPraiseWord,
  shouldStripRepeatOnPraise,
} from './dialoguePraiseComment'

describe('isKommentariyPurePraiseOnly', () => {
  it('accepts single praise word with punctuation', () => {
    expect(isKommentariyPurePraiseOnly('Комментарий: Отлично!')).toBe(true)
    expect(isKommentariyPurePraiseOnly('Комментарий: Верно.')).toBe(true)
    expect(isKommentariyPurePraiseOnly('Комментарий: Правильно')).toBe(true)
  })

  it('rejects mixed praise + correction', () => {
    expect(
      isKommentariyPurePraiseOnly('Комментарий: Правильно, но нужно Future Perfect.')
    ).toBe(false)
    expect(isKommentariyPurePraiseOnly('Комментарий: Ошибка времени.')).toBe(false)
  })
})

describe('kommentariyStartsWithPraiseWord', () => {
  it('matches praise starters', () => {
    expect(kommentariyStartsWithPraiseWord('Комментарий: Хорошо')).toBe(true)
    expect(kommentariyStartsWithPraiseWord('Комментарий: Правильно, но нужно исправить.')).toBe(true)
  })

  it('rejects non-praise comments', () => {
    expect(kommentariyStartsWithPraiseWord('Комментарий: Нужно использовать Past Simple.')).toBe(false)
  })
})

describe('shouldStripRepeatOnPraise', () => {
  it('strips repeat only for pure praise', () => {
    expect(
      shouldStripRepeatOnPraise('Комментарий: Отлично!\nСкажи: I will go.')
    ).toBe(true)
  })

  it('keeps repeat when comment mixes praise with correction', () => {
    expect(
      shouldStripRepeatOnPraise(
        'Комментарий: Правильно, но нужно Future Perfect.\nСкажи: I will have swum.'
      )
    ).toBe(false)
  })

  it('keeps repeat for error-only comment', () => {
    expect(
      shouldStripRepeatOnPraise('Комментарий: Ошибка времени.\nСкажи: I will have done it.')
    ).toBe(false)
  })
})
