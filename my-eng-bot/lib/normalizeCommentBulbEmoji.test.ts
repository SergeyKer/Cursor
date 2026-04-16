import { describe, expect, it } from 'vitest'
import {
  normalizeBulbOnlyAtStart,
  normalizeTranslationBulbEmojisInContent,
  stripCheckEmojisForPrefixedCard,
  stripLeadingBulbEmojisForPrefixedCard,
} from './normalizeCommentBulbEmoji'

describe('stripLeadingBulbEmojisForPrefixedCard', () => {
  it('убирает одну или несколько ведущих ламп на первой строке', () => {
    expect(stripLeadingBulbEmojisForPrefixedCard('💡 Здорово, что ты…')).toBe('Здорово, что ты…')
    expect(stripLeadingBulbEmojisForPrefixedCard('💡 💡 Здорово, что ты…')).toBe('Здорово, что ты…')
  })

  it('убирает лампу на любой строке тела — в UI она уже в метке', () => {
    expect(stripLeadingBulbEmojisForPrefixedCard('Первая\n💡 вторая')).toBe('Первая\nвторая')
  })
})

describe('stripCheckEmojisForPrefixedCard', () => {
  it('убирает все ✅ из текста при отдельной метке карточки', () => {
    expect(stripCheckEmojisForPrefixedCard('✅ Отлично!')).toBe('Отлично!')
    expect(stripCheckEmojisForPrefixedCard('Строка\n✅ ещё')).toBe('Строка\nещё')
  })

  it('убирает протокольные маркеры (🔤 и т.п.) — в похвале остаётся только галка в метке UI', () => {
    expect(stripCheckEmojisForPrefixedCard('Отлично! 🔤 Ты правильно использовал Present Simple.')).toBe(
      'Отлично! Ты правильно использовал Present Simple.'
    )
  })
})

describe('normalizeBulbOnlyAtStart', () => {
  it('убирает лампочку в конце, оставляя одну в начале', () => {
    expect(normalizeBulbOnlyAtStart('💡 Здорово, структура верна. Однако опечатка. 💡')).toBe(
      '💡 Здорово, структура верна. Однако опечатка.'
    )
  })

  it('удаляет все лампочки, если не было ведущей', () => {
    expect(normalizeBulbOnlyAtStart('Текст в конце 💡')).toBe('Текст в конце')
  })

  it('схлопывает несколько лампочек до одной в начале', () => {
    expect(normalizeBulbOnlyAtStart('💡 А 💡 Б')).toBe('💡 А Б')
  })
})

describe('normalizeTranslationBulbEmojisInContent', () => {
  it('нормализует Комментарий_перевод и Комментарий', () => {
    const raw =
      'Комментарий_перевод: 💡 Хорошо! 💡\nКомментарий: 💡 Ошибка. 💡\nОшибки:\nx'
    const out = normalizeTranslationBulbEmojisInContent(raw)
    expect(out).toContain('Комментарий_перевод: 💡 Хорошо!')
    expect(out).not.toMatch(/Хорошо! 💡/)
    expect(out).toContain('Комментарий: 💡 Ошибка.')
    expect(out).not.toMatch(/Ошибка\. 💡/)
  })
})
