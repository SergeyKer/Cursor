import { describe, expect, it } from 'vitest'
import { stripWrappingQuotes } from '@/lib/translationProtocolLines'
import {
  buildAssistantSectionsForTranslationDrillWithInvitationTest,
  buildAssistantSectionsForTranslationErrorRepeatTest,
  buildAssistantSectionsForTranslationSuccessTest,
  commentIconForContent,
  commentLabelForTranslationFirstBlock,
  commentToneForContent,
  computeAssistantTranslationMainCardMeta,
  condenseTranslationCommentToErrors,
  filterTranslationErrorsDisplayText,
  parseTranslationCoachBlocks,
  stripTranslationMainMetaPrefixes,
  translationResponseHasSuccessShape,
} from './Chat'

describe('filterTranslationErrorsDisplayText', () => {
  it('убирает строку «Ошибка формы глагола», если по смыслу это spelling', () => {
    const raw = ['✏️ studing → studying', '🔤 Ошибка формы глагола. Правильное spelling: studying.'].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe('- studing → studying')
  })

  it('убирает строку «Ошибка типа предложения», если это замена русского слова на английское', () => {
    const raw = [
      "✏️ 'готовлю' → 'cooking'",
      "🔤 Ошибка типа предложения. Нужно использовать форму 'cooking' вместо 'готовлю'.",
    ].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe("- 'готовлю' → 'cooking'")
  })

  it('убирает подпункты только с дефисом / «нет»', () => {
    const raw = [
      '🔤 Грамматика: Нужен артикль "a" перед "live concert".',
      '✏️ Орфография: -',
      '📖 Лексика: -',
    ].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe('- Нужен артикль "a" перед "live concert".')
  })

  it('оставляет все строки, если везде есть смысл', () => {
    const raw = ['🔤 Грамматика: a.', '✏️ Орфография: b.'].join('\n')
    expect(filterTranslationErrorsDisplayText(raw)).toBe('- a.\n- b.')
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
  it('true при непустом комментарии и без эталона Повтори/Скажи', () => {
    expect(translationResponseHasSuccessShape('Отлично!', null, null)).toBe(true)
  })

  it('false если есть Повтори', () => {
    expect(translationResponseHasSuccessShape('Комментарий: ошибка', 'I run.', null)).toBe(false)
  })

  it('false без комментария', () => {
    expect(translationResponseHasSuccessShape(null, null, null)).toBe(false)
  })
})

describe('computeAssistantTranslationMainCardMeta', () => {
  it('при ошибке сохраняет русское задание в метаданных, но карточку «Переведи» не показывает — цикл только «Скажи»', () => {
    const content = [
      'Комментарий: Ошибка.',
      'Время: Present Continuous — сейчас.',
      'Скажи: Are we watching a movie?',
      'Переведи далее: Мы сейчас смотрим фильм?',
      'Переведи на английский язык.',
    ].join('\n')
    const meta = computeAssistantTranslationMainCardMeta({ role: 'assistant', content })
    expect(meta.hideTranslationPromptBlocks).toBe(true)
    expect(meta.effectiveMainBefore.trim()).toBe('Мы сейчас смотрим фильм?')
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
    expect(b.nextSentence).toContain('Present Simple')
    expect(b.repeat).toBe('I run.')
  })

  it('выделяет Комментарий_перевод и тело устаревшего Комментарий_ошибка в blocks.comment', () => {
    const text = [
      'Комментарий_перевод: Круто, что начал с "How"! 🙌',
      'Комментарий_ошибка: Ошибка формы глагола — проверь окончание.',
      'Ошибки:',
      '🔤 …',
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

  it('выделяет Скажи до Повтори (английский эталон)', () => {
    const text = [
      'Комментарий_перевод: Молодец! 🌟',
      'Комментарий: Ошибка времени.',
      'Ошибки:',
      '⏱️ …',
      'Время: Present Simple — …',
      'Конструкция: S + V1',
      'Скажи: I often read.',
      'Повтори: I often read.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('I often read.')
    expect(b.repeat).toBe('I often read.')
  })

  it('убирает лишний префикс Повтори: в теле Скажи', () => {
    const text = [
      'Комментарий: Ошибка.',
      'Скажи: Повтори: I love cooking different dishes in the kitchen.',
      'Повтори: I love cooking different dishes in the kitchen.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeatRu).toBe('I love cooking different dishes in the kitchen.')
  })

  it('парсит Повтори с дефисом в начале строки', () => {
    const text = [
      'Комментарий: Ошибка.',
      'Скажи: Hello.',
      '- Повтори: Hello.',
    ].join('\n')
    const b = parseTranslationCoachBlocks(text)
    expect(b.repeat).toBe('Hello.')
  })

  it('разделяет склеенные inline-блоки из строки Комментарий на отдельные поля', () => {
    const text =
      'Комментарий: Лексическая ошибка — Проверь написание и выбор слова. Скажи: I will start a new project. Повтори: I will start a new project.'
    const b = parseTranslationCoachBlocks(text)
    expect(b.comment).toBe('Лексическая ошибка — Проверь написание и выбор слова.')
    expect(b.repeatRu).toBe('I will start a new project.')
    expect(b.repeat).toBe('I will start a new project.')
  })

  it('в одной строке отделяет «Переведи на английский язык.» от русского задания', () => {
    const text = 'Переведи: Я сейчас учусь? Переведи на английский язык.'
    const b = parseTranslationCoachBlocks(text)
    expect(b.nextSentence).toBe('Переведи: Я сейчас учусь?')
    expect(b.invitation).toBe('Переведи на английский язык.')
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

describe('translation drill invitation UI', () => {
  it('не дублирует карточку «Переведи» служебным «Переведи на английский», если есть русское задание', () => {
    const sections = buildAssistantSectionsForTranslationDrillWithInvitationTest({
      mainBefore: 'Я сейчас читаю книгу?',
      invitationText: 'Переведи на английский язык.',
    })
    expect(sections.filter((s) => s.key === 'translation-invitation')).toHaveLength(0)
    const main = sections.find((s) => s.key === 'main')
    expect(main?.text).toBe('Я сейчас читаю книгу?')
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

  it('показывает ✅ похвалу перед карточкой «Переведи далее», если оба в одном ответе', () => {
    const praise = 'Замечаю, что вы правильно использовали структуру вопроса с \'Am I\'. 🌟'
    const drill = 'Переведи далее: Ты смотришь новый фильм?'
    const sections = buildAssistantSectionsForTranslationSuccessTest(praise, { mainBefore: drill })
    const praiseSection = sections.find((s) => s.key === 'comment')
    expect(praiseSection?.tone).toBe('praise')
    expect(praiseSection?.label).toBe('✅')
    expect(praiseSection?.text).toBe(praise)
    const main = sections.find((s) => s.key === 'main')
    expect(main?.text).toBe(drill)
  })
})

describe('translation error repeat UI', () => {
  it('в translation+error показывает только repeat-translation из Скажи', () => {
    const sections = buildAssistantSectionsForTranslationErrorRepeatTest({
      mode: 'translation',
      translationErrorCoachUi: true,
      showOnlyRepeat: true,
      repeatRuTextForCard: 'I often read.',
      repeatTextForCard: 'I often read.',
    })
    expect(sections.find((s) => s.key === 'repeat-translation')?.text).toBe('I often read.')
    expect(sections.some((s) => s.key === 'repeat')).toBe(false)
    expect(sections.some((s) => s.key === 'repeat-inline')).toBe(false)
  })

  it('в translation+error не показывает карточку «Переведи далее» даже при непустом mainBefore', () => {
    const sections = buildAssistantSectionsForTranslationErrorRepeatTest({
      showOnlyRepeat: false,
      repeatTextForCard: 'I have been thinking about a business trip for several days.',
      repeatRuTextForCard: 'I have been thinking about a business trip for several days.',
      mainBefore: 'Я ещё не несколько дней думаю о своей следующей поездке.',
    })
    expect(sections.some((s) => s.key === 'main')).toBe(false)
    expect(sections.some((s) => s.key === 'main-after')).toBe(false)
    expect(sections.find((s) => s.key === 'repeat-translation')?.text).toContain('business trip')
  })

  it('убирает внешние кавычки в теле repeat-translation', () => {
    const sections = buildAssistantSectionsForTranslationErrorRepeatTest({
      mode: 'translation',
      translationErrorCoachUi: true,
      showOnlyRepeat: true,
      repeatRuTextForCard: '"У тебя есть домашнее животное."',
      repeatTextForCard: 'ignored in this mode',
    })
    expect(sections.find((s) => s.key === 'repeat-translation')?.text).toBe('У тебя есть домашнее животное.')
  })

  it('не делает fallback на Повтори при translation+error без Скажи', () => {
    const sections = buildAssistantSectionsForTranslationErrorRepeatTest({
      mode: 'translation',
      translationErrorCoachUi: true,
      showOnlyRepeat: true,
      repeatRuTextForCard: null,
      repeatTextForCard: 'Fallback should be hidden.',
    })
    expect(sections.some((s) => s.key === 'repeat-translation')).toBe(false)
    expect(sections.some((s) => s.key === 'repeat')).toBe(false)
    expect(sections.some((s) => s.key === 'repeat-inline')).toBe(false)
  })

  it('в не-translation режимах repeat не меняется', () => {
    const sections = buildAssistantSectionsForTranslationErrorRepeatTest({
      mode: 'dialogue',
      translationErrorCoachUi: true,
      showOnlyRepeat: true,
      repeatRuTextForCard: null,
      repeatTextForCard: 'Repeat is visible.',
    })
    expect(sections.some((s) => s.key === 'repeat')).toBe(true)
  })
})

describe('stripWrappingQuotes', () => {
  it('убирает ASCII и типографские двойные кавычки', () => {
    expect(stripWrappingQuotes('"Hello."')).toBe('Hello.')
    expect(stripWrappingQuotes('\u201CHello.\u201D')).toBe('Hello.')
  })

  it('убирает «ёлочки»', () => {
    expect(stripWrappingQuotes('«Привет»')).toBe('Привет')
  })

  it('не трогает кавычки внутри фразы', () => {
    expect(stripWrappingQuotes('Say "hi" here.')).toBe('Say "hi" here.')
  })
})

describe('stripTranslationMainMetaPrefixes', () => {
  it('убирает служебное "На следующую тему:" после "Переведи далее:"', () => {
    const raw = 'Переведи далее: На следующую тему: Какой ваш любимый фильм?'
    expect(stripTranslationMainMetaPrefixes(raw)).toBe('Какой ваш любимый фильм?')
  })

  it('убирает служебное "Следующий вопрос:" перед русским заданием', () => {
    const raw = 'Переведи далее: Следующий вопрос: Ты любишь смотреть комедии?'
    expect(stripTranslationMainMetaPrefixes(raw)).toBe('Ты любишь смотреть комедии?')
  })

  it('убирает и "На следующую тему:", и "Следующий вопрос:" подряд', () => {
    const raw = 'Переведи далее: На следующую тему: Следующий вопрос: Какой твой любимый сериал?'
    expect(stripTranslationMainMetaPrefixes(raw)).toBe('Какой твой любимый сериал?')
  })
})
