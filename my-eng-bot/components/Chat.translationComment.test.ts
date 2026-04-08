import { describe, expect, it } from 'vitest'
import { commentIconForContent, commentToneForContent, condenseTranslationCommentToErrors } from './Chat'

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

describe('commentToneForContent', () => {
  it('marks positive feedback that starts with Ты правильно as praise', () => {
    expect(commentToneForContent('Ты правильно употребил глагол "like" в настоящем времени.')).toBe('praise')
  })

  it('does not mark praise with correction hints as praise', () => {
    expect(
      commentToneForContent('Отлично! Ты правильно указал смысл, но проверь правильность написания слов.')
    ).toBe('amber')
  })
})

describe('commentIconForContent', () => {
  it('uses the green check for correct answers', () => {
    expect(commentIconForContent('Отлично! Правильно использован Present Simple.')).toBe('✅')
  })

  it('uses the lightbulb for general hints', () => {
    expect(commentIconForContent('Давай сверимся с правилом.')).toBe('💡')
  })

  it('uses the clock for tense mistakes', () => {
    expect(commentIconForContent('Ошибка времени: используйте Present Simple.')).toBe('⏱️')
  })

  it('uses the verb-form icon for grammar mistakes', () => {
    expect(commentIconForContent('Ошибка формы глагола: нужно go, не went.')).toBe('🔤')
  })

  it('uses the book for lexical mistakes', () => {
    expect(commentIconForContent('Лексическая ошибка: went нужно заменить на school.')).toBe('📖')
  })

  it('uses the book for lexical mistakes written as Ошибка лексическая', () => {
    expect(commentIconForContent('Ошибка лексическая — ты использовал "фаворит" вместо "favorite".')).toBe('📖')
  })

  it('uses the pencil for spelling mistakes', () => {
    expect(commentIconForContent('Орфографическая ошибка: schol нужно исправить на school.')).toBe('✏️')
  })
})
