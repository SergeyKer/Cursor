import { describe, expect, it } from 'vitest'
import {
  buildAssistantSectionsForTranslationSuccessTest,
  commentIconForContent,
  commentLabelForTranslationFirstBlock,
  commentToneForContent,
  condenseTranslationCommentToErrors,
  filterTranslationErrorsDisplayText,
  parseTranslationCoachBlocks,
  translationResponseHasSuccessShape,
} from './Chat'

describe('filterTranslationErrorsDisplayText', () => {
  it('убирает подпункты только с дефисом / «нет»', () => {
    const raw = [
      '🔤 Грамматика: Нужен артикль "a" перед "live concert".',
      '✏️ Орфография: -',
      '📖 Лексика: -',
    ].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe('🔤 Грамматика: Нужен артикль "a" перед "live concert".')
  })

  it('оставляет все строки, если везде есть смысл', () => {
    const raw = ['🔤 Грамматика: a.', '✏️ Орфография: b.'].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe(raw)
  })
})

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

describe('translationResponseHasSuccessShape', () => {
  it('true при непустом threeFormsText', () => {
    expect(translationResponseHasSuccessShape('anything', '+: a\n?: b\n-: c')).toBe(true)
  })

  it('true если в тексте есть строка «Формы:», даже без распознанных +/- строк', () => {
    const text = ['Конструкция: x', 'Формы:', 'broken line', 'Повтори: I run.'].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.threeFormsText).toBeNull()
    expect(translationResponseHasSuccessShape(text, b.threeFormsText)).toBe(true)
  })

  it('false без форм и без заголовка Формы', () => {
    expect(translationResponseHasSuccessShape('Комментарий_перевод: x\nПовтори: y', null)).toBe(false)
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

  it('выделяет Повтори_перевод до Повтори (английский эталон)', () => {
    const text = [
      'Комментарий_перевод: Молодец! 🌟',
      'Комментарий: Ошибка времени.',
      'Ошибки:',
      '⏱️ …',
      'Время: Present Simple — …',
      'Конструкция: S + V1',
      'Повтори_перевод: I often read.',
      'Повтори: I often read.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('I often read.')
    expect(b.repeat).toBe('I often read.')
  })

  it('убирает лишний префикс Повтори: в теле Повтори_перевод', () => {
    const text = [
      'Комментарий: Ошибка.',
      'Повтори_перевод: Повтори: I love cooking different dishes in the kitchen.',
      'Повтори: I love cooking different dishes in the kitchen.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('I love cooking different dishes in the kitchen.')
  })

  it('парсит Повтори с дефисом в начале строки', () => {
    const text = [
      'Комментарий: Ошибка.',
      'Повтори_перевод: Hello.',
      '- Повтори: Hello.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeat).toBe('Hello.')
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

  it('uses the verb-form icon for sentence-type mistakes', () => {
    expect(commentIconForContent('Ошибка типа предложения: в русском вопрос, нужен Do в начале.')).toBe('🔤')
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

describe('translationSuccessPraiseCard UI', () => {
  it('первая секция SUCCESS drill — praise и метка ✅', () => {
    const praise =
      'Круто, что ты правильно использовал отрицание don\'t! Это Present Simple — речь о неприязни к привычке.'
    const sections = buildAssistantSectionsForTranslationSuccessTest(praise)
    const first = sections[0]
    expect(first).toBeDefined()
    expect(first?.key).toBe('comment')
    expect(first?.tone).toBe('praise')
    expect(first?.label).toBe('✅')
    expect(first?.text).toBe(praise)
  })
})
