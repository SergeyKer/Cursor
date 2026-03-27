import { describe, expect, it } from 'vitest'
import { resolveFreeTalkNumberedChoice } from './freeTalkNumberedChoice'

describe('resolveFreeTalkNumberedChoice', () => {
  const assistantText = [
    'What would you like to talk about?',
    'Your topic, or one of these:',
    '1) my habits and routine',
    '2) how I relax after work',
    '3) what is happening at work',
  ].join('\n')

  it('resolves valid numeric choice', () => {
    const resolved = resolveFreeTalkNumberedChoice({
      userText: '2',
      assistantText,
    })
    expect(resolved).toEqual({
      kind: 'resolved',
      index: 2,
      topic: 'how I relax after work',
    })
  })

  it('accepts numeric choice with punctuation', () => {
    const resolved = resolveFreeTalkNumberedChoice({
      userText: '3)',
      assistantText,
    })
    expect(resolved).toEqual({
      kind: 'resolved',
      index: 3,
      topic: 'what is happening at work',
    })
  })

  it('returns invalid-number for out-of-range number', () => {
    const resolved = resolveFreeTalkNumberedChoice({
      userText: '4',
      assistantText,
    })
    expect(resolved).toEqual({
      kind: 'invalid-number',
      index: 4,
    })
  })

  it('returns not-number for normal topic input', () => {
    const resolved = resolveFreeTalkNumberedChoice({
      userText: 'films',
      assistantText,
    })
    expect(resolved).toEqual({ kind: 'not-number' })
  })
})

