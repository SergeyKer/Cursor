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

  it('скрытый __TRAN_REPEAT_REF__ важнее видимого Повтори (эталон по русскому заданию)', () => {
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
