import { describe, expect, it } from 'vitest'
import { extractPriorAssistantRepeatEnglish } from './translationLastRepeat'
import { normalizeEnglishForRepeatMatch } from './normalizeEnglishForRepeatMatch'

function userMatchesRepeatForGate(user: string, repeat: string): boolean {
  const u = normalizeEnglishForRepeatMatch(user)
  const r = normalizeEnglishForRepeatMatch(repeat)
  return Boolean(u && r && u === r)
}

describe('extractPriorAssistantRepeatEnglish', () => {
  it('returns repeat only from the last assistant before user', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: Old sentence.' },
      { role: 'user', content: 'x' },
      { role: 'assistant', content: 'Комментарий: Ошибка.\nПовтори: Do you have a cat?' },
      { role: 'user', content: 'Do you have a favorite dog?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have a cat?')
  })

  it('returns null if last assistant has no Повтори line', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: First.' },
      { role: 'user', content: 'First.' },
      { role: 'assistant', content: 'Комментарий: Отлично!\nКонструкция: test\nФормы:\n+: A.' },
      { role: 'user', content: 'ok' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('ignores older Повтори when last assistant has no repeat', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: Only old.' },
      { role: 'user', content: 'Only old.' },
      { role: 'assistant', content: 'Комментарий: Хорошо!' },
      { role: 'user', content: 'provocation' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('возвращает скрытый эталон, если нет видимого Повтори', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Формы:\n+: I usually read books.\nПереведи далее: Я обычно читаю.\n__TRAN_REPEAT_REF__: I usually read books.',
      },
      { role: 'user', content: 'wrong' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('I usually read books.')
  })

  it('извлекает эталон из строки «- Повтори:» без __TRAN_REPEAT_REF__', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Переведи далее: Ты любишь читать?\nПереведи на английский.\n- Повтори: Do you like to read?',
      },
      { role: 'user', content: 'wrong' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you like to read?')
  })

  it('видимый Повтори_перевод важнее __TRAN_REPEAT_REF__ и Повтори (ветка ошибки, замкнутый цикл)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Повтори_перевод: What is your favorite color?\n' +
          'Повтори: It\'s great that you used the correct question structure!\n' +
          '__TRAN_REPEAT_REF__: Hidden line.',
      },
      { role: 'user', content: 'What is your favorite colore' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('What is your favorite color?')
  })

  it('скрытый __TRAN_REPEAT_REF__ важнее видимого Повтори, если нет Повтори_перевод', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: Visible line.\n__TRAN_REPEAT_REF__: Hidden line.' },
      { role: 'user', content: 'x' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Hidden line.')
  })

  it('эталон для enforce — скрытая строка с карточки «Переведи далее», не старое Повтори из истории', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: I love to cook pasta for dinner.' },
      { role: 'user', content: 'wrong' },
      {
        role: 'assistant',
        content:
          'Переведи далее: Я готовлю пасту с овощами.\nПереведи на английский.\n__TRAN_REPEAT_REF__: I am cooking pasta with vegetables.',
      },
      { role: 'user', content: 'I cook pasta with vegetables.' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('I am cooking pasta with vegetables.')
  })

  it('не подмешивает Повтори из прошлой карточки, если перед user только задание без эталона', () => {
    const messages = [
      { role: 'assistant', content: 'Повтори: I love to cook pasta for dinner.' },
      { role: 'user', content: 'wrong' },
      { role: 'assistant', content: 'Переведи далее: Я готовлю пасту с овощами.\nПереведи на английский.' },
      { role: 'user', content: 'I cook pasta with vegetables.' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('не берёт Повтори_перевод из прошлой темы после нового «Переведи далее»; эталон — __TRAN__ текущего задания (книги, не color)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Ошибка.\nПовтори_перевод: What is your favorite color?\nПовтори: What is your favorite color?',
      },
      { role: 'user', content: 'wrong color answer' },
      {
        role: 'assistant',
        content:
          'Комментарий: Молодец!\nФормы:\n+: I love to read books.\nПереведи далее: Я люблю читать книги.\n__TRAN_REPEAT_REF__: I love to read books.\nПереведи на английский.',
      },
      { role: 'user', content: 'I like to читать' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('I love to read books.')
  })

  it('при двух Повтори_перевод в цепочке ошибок — эталон с лучшим совпадением с ответом; при ничьей — более ранняя карточка (games, не that)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Ошибка.\nПовтори_перевод: Do you like to play games?\nПовтори: Do you like to play games?',
      },
      { role: 'user', content: 'Do you like to play game' },
      {
        role: 'assistant',
        content:
          'Комментарий: Лексика.\nПовтори_перевод: Do you like to play that?\nПовтори: Do you like to play that?',
      },
      { role: 'user', content: 'Do you like to play game' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you like to play games?')
  })
})

describe('provocation gate (cat vs dog)', () => {
  it('does not treat as match when user substitutes dog for cat', () => {
    const repeat = 'Do you have a cat?'
    const user = 'Do you have a favorite dog?'
    expect(userMatchesRepeatForGate(user, repeat)).toBe(false)
  })

  it('treats as match when strings align after normalization', () => {
    const repeat = 'Do you have a cat?'
    const user = 'do you have a cat'
    expect(userMatchesRepeatForGate(user, repeat)).toBe(true)
  })
})
