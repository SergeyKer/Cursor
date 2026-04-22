import { describe, expect, it } from 'vitest'
import {
  extractCanonicalRepeatRefEnglishFromContent,
  extractVisibleRepeatCueEnglishFromAssistantCard,
  reconcileTranslationSayWithHiddenRef,
  replaceTranslationCanonicalRepeatRefInContent,
  stripTranslationCanonicalRepeatRefLine,
  TRAN_CANONICAL_REPEAT_REF_MARKER,
} from './translationPromptAndRef'

const RU_FOOTBALL = 'Я не люблю играть в футбол.'

function errorCard(visibleSay: string, hiddenRef: string): string {
  return [
    'Комментарий_перевод: Есть хорошая основа.',
    'Ошибки:',
    '🔤 Ошибка времени или формулировки.',
    `Скажи: ${visibleSay}`,
    `${TRAN_CANONICAL_REPEAT_REF_MARKER}: ${hiddenRef}`,
  ].join('\n')
}

describe('replaceTranslationCanonicalRepeatRefInContent', () => {
  it('заменяет маркер и не дублирует', () => {
    const base = `Комментарий: x.\n${TRAN_CANONICAL_REPEAT_REF_MARKER}: Old one.`
    const out = replaceTranslationCanonicalRepeatRefInContent(base, 'New line.')
    expect(out).toMatch(new RegExp(`${TRAN_CANONICAL_REPEAT_REF_MARKER}:\\s*New line\\.`))
    expect(out.split(TRAN_CANONICAL_REPEAT_REF_MARKER).length - 1).toBe(1)
    expect(stripTranslationCanonicalRepeatRefLine(out)).not.toContain('Old')
  })
})

describe('reconcileTranslationSayWithHiddenRef', () => {
  it('подгоняет видимое Скажи к скрытому эталону при расхождении', () => {
    const hidden = "I don't like playing football."
    const card = errorCard('I dont like play', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, RU_FOOTBALL)
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)?.replace(/\s+/g, ' ').trim()).toBe(
      "I don't like playing football."
    )
    expect(extractCanonicalRepeatRefEnglishFromContent(out)?.replace(/\s+/g, ' ').trim()).toBe(
      "I don't like playing football."
    )
  })

  it('не меняет карточку если после нормализации совпадают', () => {
    const line = "I don't like playing football."
    const card = errorCard(line, line)
    const out = reconcileTranslationSayWithHiddenRef(card, RU_FOOTBALL)
    expect(out).toBe(card)
  })

  it('стабилен при повторном вызове (многоходовый цикл)', () => {
    const hidden = "I don't like playing football."
    const card = errorCard('wrong draft', hidden)
    const once = reconcileTranslationSayWithHiddenRef(card, RU_FOOTBALL)
    const twice = reconcileTranslationSayWithHiddenRef(once, RU_FOOTBALL)
    expect(twice).toBe(once)
  })

  it('не трогает SUCCESS без блока ошибки', () => {
    const card = [
      'Комментарий: Отлично!',
      'Переведи далее: Дальше.',
      `${TRAN_CANONICAL_REPEAT_REF_MARKER}: I go.`,
    ].join('\n')
    expect(reconcileTranslationSayWithHiddenRef(card, 'Дальше.')).toBe(card)
  })

  it('не трогает карточку без строки Скажи даже при наличии ошибки и hidden ref', () => {
    const card = [
      'Комментарий_перевод: Исправь время.',
      'Ошибки:',
      '🔤 Нужен Present Simple.',
      `${TRAN_CANONICAL_REPEAT_REF_MARKER}: I cook in the kitchen.`,
    ].join('\n')
    expect(reconcileTranslationSayWithHiddenRef(card, 'Я готовлю на кухне.')).toBe(card)
  })

  it('restores canonical Say when user-like drift changes I -> we', () => {
    const hidden = 'I cook in the kitchen.'
    const card = errorCard('We cook in the kitchen.', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, 'Я готовлю на кухне.')
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)).toBe('I cook in the kitchen.')
  })

  it('restores canonical Say when visible line has typo kitchin', () => {
    const hidden = 'I cook in the kitchen.'
    const card = errorCard('I cook in the kitchin.', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, 'Я готовлю на кухне.')
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)).toBe('I cook in the kitchen.')
  })

  it('restores canonical Say when visible line changes meaning cook -> sweem', () => {
    const hidden = 'I cook in the kitchen.'
    const card = errorCard('I sweem in the kitchen.', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, 'Я готовлю на кухне.')
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)).toBe('I cook in the kitchen.')
  })

  it('restores canonical Say when words are dropped from visible line', () => {
    const hidden = 'I usually cook dinner in the kitchen.'
    const card = errorCard('I cook dinner.', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, 'Я обычно готовлю ужин на кухне.')
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)).toBe('I usually cook dinner in the kitchen.')
  })

  it('restores canonical Say when visible line has extra words', () => {
    const hidden = 'I cook in the kitchen.'
    const card = errorCard('I cook quickly in the beautiful kitchen every day.', hidden)
    const out = reconcileTranslationSayWithHiddenRef(card, 'Я готовлю на кухне.')
    expect(extractVisibleRepeatCueEnglishFromAssistantCard(out)).toBe('I cook in the kitchen.')
  })
})
