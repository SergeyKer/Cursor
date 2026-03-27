import { describe, expect, it } from 'vitest'
import { buildFreeTalkTopicAcknowledgement } from './freeTalkTopicAcknowledgement'

describe('buildFreeTalkTopicAcknowledgement', () => {
  it('returns deterministic phrase from allowed pool', () => {
    const result1 = buildFreeTalkTopicAcknowledgement({
      audience: 'child',
      level: 'A1',
      topicLabel: 'school',
      seedText: 'seed-1',
      lastAssistantContent: null,
    })
    const result2 = buildFreeTalkTopicAcknowledgement({
      audience: 'child',
      level: 'A1',
      topicLabel: 'school',
      seedText: 'seed-1',
      lastAssistantContent: null,
    })

    expect(result1).toBe(result2)
    expect(result1).toMatch(/school/i)
  })

  it('avoids immediate repetition when previous assistant line matches candidate', () => {
    const seedText = 'seed-repeat-check'
    const first = buildFreeTalkTopicAcknowledgement({
      audience: 'adult',
      level: 'B2',
      topicLabel: 'work',
      seedText,
      lastAssistantContent: null,
    })
    const second = buildFreeTalkTopicAcknowledgement({
      audience: 'adult',
      level: 'B2',
      topicLabel: 'work',
      seedText,
      lastAssistantContent: first,
    })

    expect(second).not.toBe(first)
    expect(second).toMatch(/work/i)
  })

  it('returns short english fallback when topic label is empty', () => {
    const childFallback = buildFreeTalkTopicAcknowledgement({
      audience: 'child',
      level: 'A2',
      topicLabel: '   ',
      seedText: 'empty-topic',
      lastAssistantContent: null,
    })
    const adultFallback = buildFreeTalkTopicAcknowledgement({
      audience: 'adult',
      level: 'C1',
      topicLabel: '',
      seedText: 'empty-topic',
      lastAssistantContent: null,
    })

    expect(childFallback).toBe('Got it.')
    expect(adultFallback).toBe('Got it.')
  })
})
