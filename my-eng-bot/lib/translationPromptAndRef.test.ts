import { describe, expect, it } from 'vitest'
import {
  appendTranslationCanonicalRepeatRefLine,
  extractCanonicalRepeatRefEnglishFromContent,
  extractRussianTranslationTaskFromAssistantContent,
  extractLastTranslationPromptFromMessages,
  getAssistantContentBeforeLastUser,
  stripTranslationCanonicalRepeatRefLine,
} from './translationPromptAndRef'

describe('extractRussianTranslationTaskFromAssistantContent', () => {
  it('извлекает русский из строки «Переведи далее: …»', () => {
    const content = 'Переведи далее: Я обычно читаю книги перед сном.\nПереведи на английский.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe(
      'Я обычно читаю книги перед сном.'
    )
  })

  it('не путает «Переведи на английский.» без задания в той же строке с русским текстом', () => {
    const content = 'Переведи на английский.\nЯ люблю кофе.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe('Я люблю кофе.')
  })

  it('пропускает служебную строку скрытого эталона', () => {
    const content = 'Переведи далее: Тест.\n__TRAN_REPEAT_REF__: I test.'
    expect(extractRussianTranslationTaskFromAssistantContent(content)).toBe('Тест.')
  })
})

describe('appendTranslationCanonicalRepeatRefLine', () => {
  it('добавляет эталон по +: и русскому заданию', () => {
    const card = [
      'Комментарий: Отлично!',
      'Конструкция: —',
      'Формы:',
      '+: I usually read books before bed.',
      '?: Do you usually read books before bed?',
      '-: I do not usually read books before bed.',
      'Переведи далее: Я обычно читаю книги перед сном.',
      'Переведи на английский.',
    ].join('\n')
    const ru = extractRussianTranslationTaskFromAssistantContent(card)
    expect(ru).toContain('Я обычно читаю')
    const out = appendTranslationCanonicalRepeatRefLine(card, ru)
    expect(out).toMatch(/__TRAN_REPEAT_REF__:\s*I usually read books before bed\./i)
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
      { role: 'assistant', content: 'Переведи далее: Новое предложение.\nПереведи на английский.' },
    ]
    expect(extractLastTranslationPromptFromMessages(messages)).toBe('Новое предложение.')
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
})
