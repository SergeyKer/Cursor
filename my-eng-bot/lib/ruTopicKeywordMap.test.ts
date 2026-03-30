import { describe, expect, it } from 'vitest'
import { normalizeRuTopicKeyword, RU_TOPIC_KEYWORD_TO_EN } from './ruTopicKeywordMap'

describe('normalizeRuTopicKeyword', () => {
  it('normalizes common accusative forms', () => {
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('природу')]).toBe('nature')
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('реку')]).toBe('river')
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('кошку')]).toBe('cat')
  })

  it('normalizes prepositional and instrumental forms when safe', () => {
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('природе')]).toBe('nature')
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('рекой')]).toBe('river')
    expect(RU_TOPIC_KEYWORD_TO_EN[normalizeRuTopicKeyword('лесу')]).toBe('forest')
  })

  it('falls back to normalized token when no safe mapping found', () => {
    expect(normalizeRuTopicKeyword('непонятно')).toBe('непонятно')
  })
})
