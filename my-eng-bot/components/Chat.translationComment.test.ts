import { describe, expect, it } from 'vitest'
import {
  commentIconForContent,
  commentLabelForTranslationFirstBlock,
  commentToneForContent,
  condenseTranslationCommentToErrors,
  parseTranslationCoachBlocks,
} from './Chat'

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

describe('parseTranslationCoachBlocks', () => {
  it('выделяет errorsBlock между Ошибки и Время', () => {
    const text = [
      'Комментарий: Ввод.',
      'Ошибки:',
      '✏️ a → b',
      '📖 x → y',
      'Время: Present Simple — пояснение.',
      'Конструкция: S + V1',
      'Повтори: I run.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.translationSupportComment).toBeNull()
    expect(b.errorsBlock).toContain('✏️')
    expect(b.errorsBlock).toContain('📖')
    expect(b.tenseRef).toContain('Present Simple')
    expect(b.repeat).toBe('I run.')
    expect(b.threeFormsText).toBeNull()
  })

  it('выделяет Комментарий_перевод и диагностический Комментарий отдельно', () => {
    const text = [
      'Комментарий_перевод: Круто, что начал с "How"! 🙌',
      'Комментарий: Ошибка формы глагола — проверь окончание.',
      'Ошибки:',
      '🔤 Грамматика: …',
      'Время: Present Simple — пояснение.',
      'Конструкция: S + V1',
      'Повтори: How do you do?',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.translationSupportComment).toContain('How')
    expect(b.translationSupportComment).not.toContain('Ошибка формы')
    expect(b.comment).toContain('Ошибка формы')
    expect(b.repeat).toBe('How do you do?')
    expect(b.repeatRu).toBeNull()
  })

  it('выделяет Повтори_перевод до Повтори', () => {
    const text = [
      'Комментарий_перевод: Молодец! 🌟',
      'Комментарий: Ошибка времени.',
      'Ошибки:',
      '⏱️ …',
      'Время: Present Simple — …',
      'Конструкция: S + V1',
      'Повтори_перевод: Я часто читаю.',
      'Повтори: I often read.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('Я часто читаю.')
    expect(b.repeat).toBe('I often read.')
  })

  it('убирает лишний префикс Повтори: в теле Повтори_перевод', () => {
    const text = [
      'Комментарий: Ошибка.',
      'Повтори_перевод: Повтори: Я люблю готовить разные блюда на кухне.',
      'Повтори: I love cooking different dishes in the kitchen.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('Я люблю готовить разные блюда на кухне.')
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

describe('commentLabelForTranslationFirstBlock', () => {
  it('uses lightbulb for correction comments even when text starts with tense error', () => {
    expect(commentLabelForTranslationFirstBlock('Ошибка времени: используйте Present Simple.')).toBe('💡')
  })

  it('keeps praise icon for success comments', () => {
    expect(commentLabelForTranslationFirstBlock('Отлично! Правильно использован Present Simple.')).toBe('✅')
  })
})
