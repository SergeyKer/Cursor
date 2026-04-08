import { describe, expect, it } from 'vitest'
import { condenseTranslationCommentToErrors } from './Chat'

describe('condenseTranslationCommentToErrors', () => {
  it('keeps translation comment theses on separate lines', () => {
    const result = condenseTranslationCommentToErrors(
      [
        'Ошибка формы глагола — "loves" нужна не для "we".',
        'Используется основное "love" без "s".',
        'Ошибка числа: используйте love в единственном числе.',
      ].join(' ')
    )

    expect(result).toBe(
      [
        'Ошибка формы глагола — "loves" нужна не для "we".',
        'Используется основное "love" без "s".',
        'Ошибка числа: используйте love в единственном числе.',
      ].join('\n')
    )
  })
})
