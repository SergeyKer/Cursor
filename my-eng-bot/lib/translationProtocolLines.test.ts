import { describe, expect, it } from 'vitest'
import { stripTranslationProtocolLabel } from '@/lib/translationProtocolLines'

describe('stripTranslationProtocolLabel', () => {
  it('снимает Комментарий_перевод и оставляет тело', () => {
    expect(
      stripTranslationProtocolLabel(
        "Комментарий_перевод: Вы правильно использовали конструкцию 'I am not'."
      )
    ).toBe("Вы правильно использовали конструкцию 'I am not'.")
  })

  it('не трогает строку без протокольного лейбла', () => {
    expect(stripTranslationProtocolLabel('Отлично! Верно передано действие.')).toBe(
      'Отлично! Верно передано действие.'
    )
  })
})
