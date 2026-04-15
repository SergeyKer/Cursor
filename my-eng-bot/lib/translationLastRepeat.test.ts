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
      { role: 'assistant', content: 'Скажи: Old sentence.' },
      { role: 'user', content: 'x' },
      { role: 'assistant', content: 'Комментарий: Ошибка.\nСкажи: Do you have a cat?' },
      { role: 'user', content: 'Do you have a favorite dog?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have a cat?')
  })

  it('returns null if last assistant has no Скажи line', () => {
    const messages = [
      { role: 'assistant', content: 'Скажи: First.' },
      { role: 'user', content: 'First.' },
      { role: 'assistant', content: 'Комментарий: Отлично!\nПереведи далее: Следующее задание.\nПереведи на английский.' },
      { role: 'user', content: 'ok' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('ignores older Скажи when last assistant has no repeat', () => {
    const messages = [
      { role: 'assistant', content: 'Скажи: Only old.' },
      { role: 'user', content: 'Only old.' },
      { role: 'assistant', content: 'Комментарий: Хорошо!' },
      { role: 'user', content: 'provocation' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('возвращает скрытый эталон, если нет видимого Скажи', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Отлично!\nПереведи далее: Я обычно читаю.\n__TRAN_REPEAT_REF__: I usually read books.',
      },
      { role: 'user', content: 'wrong' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('I usually read books.')
  })

  it('извлекает эталон из строки «- Скажи:» без __TRAN_REPEAT_REF__', () => {
    const messages = [
      {
        role: 'assistant',
        content: 'Переведи далее: Ты любишь читать?\nПереведи на английский.\n- Скажи: Do you like to read?',
      },
      { role: 'user', content: 'wrong' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you like to read?')
  })

  it('для drill-карточки скрытый __TRAN_REPEAT_REF__ важнее видимого Скажи/Скажи', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Скажи: What is your favorite color?\n' +
          'Скажи: It\'s great that you used the correct question structure!\n' +
          '__TRAN_REPEAT_REF__: Hidden line.',
      },
      { role: 'user', content: 'What is your favorite colore' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Hidden line.')
  })

  it('скрытый __TRAN_REPEAT_REF__ важнее видимого Скажи, если есть оба', () => {
    const messages = [
      { role: 'assistant', content: 'Скажи: Visible line.\n__TRAN_REPEAT_REF__: Hidden line.' },
      { role: 'user', content: 'x' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Hidden line.')
  })

  it('эталон для enforce — скрытая строка с карточки «Переведи далее», не старое Скажи из истории', () => {
    const messages = [
      { role: 'assistant', content: 'Скажи: I love to cook pasta for dinner.' },
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

  it('не подмешивает Скажи из прошлой карточки, если перед user только задание без эталона', () => {
    const messages = [
      { role: 'assistant', content: 'Скажи: I love to cook pasta for dinner.' },
      { role: 'user', content: 'wrong' },
      { role: 'assistant', content: 'Переведи далее: Я готовлю пасту с овощами.\nПереведи на английский.' },
      { role: 'user', content: 'I cook pasta with vegetables.' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBeNull()
  })

  it('не берёт Скажи из прошлой темы после нового «Переведи далее»; эталон — __TRAN__ текущего задания (книги, не color)', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Ошибка.\nСкажи: What is your favorite color?\nСкажи: What is your favorite color?',
      },
      { role: 'user', content: 'wrong color answer' },
      {
        role: 'assistant',
        content:
          'Комментарий: Молодец!\nПереведи далее: Я люблю читать книги.\n__TRAN_REPEAT_REF__: I love to read books.\nПереведи на английский.',
      },
      { role: 'user', content: 'I like to читать' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('I love to read books.')
  })

  it('не выбирает эталон по overlap с user: берёт __TRAN__ с карточки текущего Переведи далее', () => {
    const messages = [
      {
        role: 'assistant',
        content:
          'Комментарий: Ошибка.\nСкажи: Do you like to play games?\nСкажи: Do you like to play games?',
      },
      { role: 'user', content: 'Do you like to play game' },
      {
        role: 'assistant',
        content:
          'Переведи далее: Ты любишь играть в игры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you like to play games?',
      },
      { role: 'user', content: 'Do you like to play game' },
      {
        role: 'assistant',
        content:
          'Скажи: Do you like to play that?\nСкажи: Do you like to play that?',
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

describe('frozen repeat survives childish provocations', () => {
  const drillCard = {
    role: 'assistant' as const,
    content:
      'Переведи далее: У тебя есть братья или сёстры?\nПереведи на английский.\n__TRAN_REPEAT_REF__: Do you have brothers or sisters?',
  }

  it('keeps the same gold when user adds extra words', () => {
    const messages = [
      drillCard,
      { role: 'user', content: 'Do you have beautiful brothers or sisters?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have brothers or sisters?')
  })

  it('keeps the same gold when user shortens the phrase', () => {
    const messages = [
      drillCard,
      { role: 'user', content: 'Do you have brothers?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have brothers or sisters?')
  })

  it('keeps the same gold for mixed Latin+Cyrillic answer', () => {
    const messages = [
      drillCard,
      { role: 'user', content: 'Do you have красивые brothers?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have brothers or sisters?')
  })

  it('keeps the same gold for gibberish answer', () => {
    const messages = [
      drillCard,
      { role: 'user', content: '@@@ asd zxc ???' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have brothers or sisters?')
  })

  it('ignores repeat drift in multi-step correction chain', () => {
    const messages = [
      drillCard,
      { role: 'user', content: 'Do you have brothers?' },
      {
        role: 'assistant',
        content:
          'Комментарий_перевод: Исправь фразу.\nОшибки:\n📖 Добавлено лишнее слово.\nСкажи: Do you have beautiful brothers?',
      },
      { role: 'user', content: 'Do you have super beautiful brothers?' },
      {
        role: 'assistant',
        content:
          'Комментарий_перевод: Еще раз.\nОшибки:\n📖 Убери лишние слова.\nСкажи: Do you have amazing brothers?',
      },
      { role: 'user', content: 'Do you have amazing brothers?' },
    ]
    expect(extractPriorAssistantRepeatEnglish(messages)).toBe('Do you have brothers or sisters?')
  })
})
