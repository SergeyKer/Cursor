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
