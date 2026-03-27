import { describe, expect, it } from 'vitest'
import { hasIntentionInfinitive, isRepeatSemanticallySafe } from './dialogueSemanticGuard'

describe('dialogueSemanticGuard', () => {
  it('detects intention pattern with infinitive', () => {
    expect(hasIntentionInfinitive('I plan to improve my English.')).toBe(true)
    expect(hasIntentionInfinitive('I want to read more.')).toBe(true)
  })

  it('rejects semantic downgrade when intention is removed', () => {
    expect(
      isRepeatSemanticallySafe({
        userText: 'I plan to find my work.',
        repeatSentence: 'I find my work.',
      })
    ).toBe(false)
  })

  it('accepts repeat when intention marker and infinitive are preserved', () => {
    expect(
      isRepeatSemanticallySafe({
        userText: 'I want to learn English every day.',
        repeatSentence: 'I want to learn English every day.',
      })
    ).toBe(true)
  })

  it('checks supported intention verbs consistently', () => {
    expect(
      isRepeatSemanticallySafe({
        userText: 'I hope to find better words.',
        repeatSentence: 'I find better words.',
      })
    ).toBe(false)
    expect(
      isRepeatSemanticallySafe({
        userText: 'I try to speak clearly.',
        repeatSentence: 'I try to speak clearly.',
      })
    ).toBe(true)
  })
})
