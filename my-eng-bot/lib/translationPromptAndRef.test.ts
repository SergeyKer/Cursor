import { describe, expect, it } from 'vitest'
import {
  appendTranslationCanonicalRepeatRefLine,
  extractCanonicalRepeatRefEnglishFromContent,
  extractLastTranslationPromptFromMessages,
  extractLocalGoldEnglishForVerdict,
  extractRussianTranslationTaskFromAssistantContent,
  getAssistantContentBeforeLastUser,
  getClampedHiddenAndVisibleGold,
  pickAuthoritativeRuPromptForTranslationClamp,
  stripTranslationCanonicalRepeatRefLine,
} from './translationPromptAndRef'

describe('pickAuthoritativeRuPromptForTranslationClamp', () => {
  it('берёт более длинное RU, если короткое — его префикс', () => {
    const short = 'Мне нравится смотреть фильмы.'
    const full = 'Мне нравится смотреть фильмы на выходных.'
    expect(pickAuthoritativeRuPromptForTranslationClamp(short, full)).toBe(full)
    expect(pickAuthoritativeRuPromptForTranslationClamp(full, short)).toBe(full)
  })
})

describe('extractRussianTranslationTaskFromAssistantContent', () => {
  it('извлекает RU, если «Переведи:» обёрнут в markdown **', () => {
    const content =
      '**Переведи:** Мне нравится смотреть фильмы на выходных.\nПереведи на английский язык.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe(
      'Мне нравится смотреть фильмы на выходных.'
    )
  })

  it('извлекает RU при нумерации и markdown: 1) **Переведи:** …', () => {
    const content =
      '1) **Переведи:** Мне нравится смотреть фильмы на выходных.\nПереведи на английский язык.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe(
      'Мне нравится смотреть фильмы на выходных.'
    )
  })

  it('извлекает голую строку задания без префикса «Переведи» (как в state UI)', () => {
    expect(extractRussianTranslationTaskFromAssistantContent('Я часто пью чай по вечерам.')).toBe(
      'Я часто пью чай по вечерам.'
    )
  })

  it('извлекает русский из строки «Переведи далее: …»', () => {
    const content = 'Переведи далее: Я обычно читаю книги перед сном.\nПереведи на английский язык.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe(
      'Я обычно читаю книги перед сном.'
    )
  })

  it('убирает кавычки вокруг русского задания', () => {
    const content = 'Переведи далее: "Я уже купил билеты на концерт.".\nПереведи на английский язык.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe(
      'Я уже купил билеты на концерт.'
    )
  })

  it('не путает «Переведи на английский.» без задания в той же строке с русским текстом', () => {
    const content = 'Переведи на английский язык.\nЯ люблю кофе.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe('Я люблю кофе.')
  })

  it('не принимает строки из блока «Ошибки» за новое русское задание', () => {
    const content = [
      'Комментарий_перевод: Хорошее начало.',
      'Ошибки:',
      '📖 Русские слова в ответе нужно перевести на английский.',
      '- Лексическая ошибка. Проверь выбор слова.',
      'Скажи: Do you have brothers or sisters?',
    ].join('\n')
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBeNull()
  })

  it('не принимает кракозябры и шум в диагностике за русское задание', () => {
    const content = [
      'Комментарий_перевод: Норм.',
      'Ошибки:',
      '🔤 asd qwe zxc',
      '🤔 @@@ ###',
      '📖 русс слова надо перевести',
      'Скажи: Do you have brothers or sisters?',
    ].join('\n')
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBeNull()
  })

  it('пропускает служебную строку скрытого эталона', () => {
    const content = 'Переведи далее: Тест.\n__TRAN_REPEAT_REF__: I test.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe('Тест.')
  })

  it('не принимает Комментарий_перевод за русское задание', () => {
    const content = 'Комментарий_перевод: Молодец, что использовал правильное слово like!'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBeNull()
  })
})

describe('appendTranslationCanonicalRepeatRefLine', () => {
  it('добавляет эталон из видимой строки «Скажи:»', () => {
    const card = [
      'Комментарий: Отлично!',
      'Переведи далее: Я обычно читаю книги перед сном.',
      'Переведи на английский язык.',
      'Скажи: I usually read books before bed.',
    ].join('\n')
    const ru = extractRussianTranslationTaskFromAssistantContent(card)
    expect(ru).toContain('Я обычно читаю')
    const out = appendTranslationCanonicalRepeatRefLine(card, ru)
    expect(out).toMatch(/__TRAN_REPEAT_REF__:\s*I usually read books before bed\./i)
  })

  it('для русского вопроса берёт эталон из «Скажи:» с вопросительным знаком', () => {
    const card = [
      'Комментарий: Отлично!',
      'Переведи далее: Мне всегда нравилось слушать музыку в свободное время?',
      'Переведи на английский язык.',
      'Скажи: Have I always liked listening to music in my free time?',
    ].join('\n')
    const ru = extractRussianTranslationTaskFromAssistantContent(card)
    expect(ru).toMatch(/\?$/)
    const out = appendTranslationCanonicalRepeatRefLine(card, ru)
    expect(out).toMatch(/__TRAN_REPEAT_REF__:\s*Have I always liked listening to music in my free time\?/i)
  })
})

describe('stripTranslationCanonicalRepeatRefLine', () => {
  it('убирает маркер из текста', () => {
    const s = 'Строка.\n__TRAN_REPEAT_REF__: I read.'
    expect(stripTranslationCanonicalRepeatRefLine(s)).toBe('Строка.')
  })
})

describe('extractLastTranslationPromptFromMessages', () => {
  it('берёт русское задание из последнего assistant', () => {
    const messages = [
      { role: 'assistant', content: 'Старое задание на русском.' },
      { role: 'user', content: 'ok' },
      { role: 'assistant', content: 'Переведи далее: Новое предложение.\nПереведи на английский язык.' },
    ]
    expect(extractLastTranslationPromptFromMessages(messages)).toBe('Новое предложение.')
  })

  it('после карточки ошибки без «Переведи…» берёт задание с предыдущей карточки (Переведи далее)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Молодец!\nПереведи далее: Я люблю читать книги.\nПереведи на английский язык.\n__TRAN_REPEAT_REF__: I love to read books.',
      },
      { role: 'user', content: 'wrong' },
      {
        role: 'assistant',
        content:
          'Комментарий_перевод: Похвала про like.\nКомментарий: Ошибка.\nСкажи: Do you like to read books?\nСкажи: Do you like to read books?',
      },
      { role: 'user', content: 'Do you like read book' },
    ]
    expect(extractLastTranslationPromptFromMessages(messages)).toBe('Я люблю читать книги.')
  })
})

describe('getAssistantContentBeforeLastUser / extractCanonicalRepeatRefEnglishFromContent', () => {
  it('возвращает контент ассистента перед последним user', () => {
    const messages = [
      { role: 'assistant', content: 'A' },
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'B\n__TRAN_REPEAT_REF__: I run.' },
      { role: 'user', content: 'u2' },
    ]
    expect(getAssistantContentBeforeLastUser(messages)).toBe('B\n__TRAN_REPEAT_REF__: I run.')
  })

  it('извлекает скрытый эталон', () => {
    expect(extractCanonicalRepeatRefEnglishFromContent('x\n__TRAN_REPEAT_REF__: One two.')).toBe('One two.')
  })

  it('извлекает эталон из карточки «Переведи:» + __TRAN__ как в интеграционном тесте route', () => {
    const prior =
      'Переведи: Я обычно читаю книги перед сном.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I usually read books before bed.'
    expect(extractCanonicalRepeatRefEnglishFromContent(prior)).toBe('I usually read books before bed.')
    const messages = [
      { role: 'assistant', content: prior },
      { role: 'user', content: 'I usually read books before bed.' },
    ]
    const card = getAssistantContentBeforeLastUser(messages)
    expect(extractCanonicalRepeatRefEnglishFromContent(card!)).toBe('I usually read books before bed.')
  })
})

describe('getClampedHiddenAndVisibleGold', () => {
  it('возвращает оба эталона когда на карточке есть и ref, и Скажи', () => {
    const card = [
      'Скажи: You have a family.',
      '__TRAN_REPEAT_REF__: I have a family.',
    ].join('\n')
    const { hidden, visible } = getClampedHiddenAndVisibleGold(card, 'У тебя есть семья?')
    expect(hidden).toBe('I have a family.')
    expect(visible).toBe('You have a family.')
  })
})

describe('extractLocalGoldEnglishForVerdict', () => {
  it('приоритет у скрытого __TRAN__', () => {
    const card = 'Переведи: Я бегу.\nСкажи: I walk.\n__TRAN_REPEAT_REF__: I run.'
    expect(extractLocalGoldEnglishForVerdict(card, 'Я бегу.')).toBe('I run.')
  })

  it('без ref берёт «Скажи» при согласовании с RU', () => {
    const card = [
      'Комментарий_перевод: Поддержка.',
      'Комментарий: Ошибка.',
      'Ошибки:',
      'Скажи: I will start a new project.',
    ].join('\n')
    const ru = 'Я начну новый проект.'
    expect(extractLocalGoldEnglishForVerdict(card, ru)?.toLowerCase()).toContain('project')
  })

  it('для карточки только RU + «Переведи» возвращает null', () => {
    const card = 'Он будет часто звонить родителям.\nПереведи на английский.'
    const ru = 'Он будет часто звонить родителям.'
    expect(extractLocalGoldEnglishForVerdict(card, ru)).toBeNull()
  })

})
