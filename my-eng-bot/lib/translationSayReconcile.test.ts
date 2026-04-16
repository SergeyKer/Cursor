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
})
