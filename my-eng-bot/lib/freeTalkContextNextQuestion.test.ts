import { describe, expect, it } from 'vitest'
import type { ChatMessage } from './types'
import { buildNextFreeTalkQuestionFromContext } from './freeTalkContextNextQuestion'

describe('buildNextFreeTalkQuestionFromContext', () => {
  it('returns a contextual question about car/speed, not the generic free time stub', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What do you like about your car?' },
      { role: 'user', content: 'I like the speed.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'test-car',
    })
    expect(q).toBeTruthy()
    expect(q).not.toMatch(/free time/i)
    expect(q).toMatch(/\?/)
  })

  it('ignores standalone Yes and No as topic words', () => {
    const yesOnly = buildNextFreeTalkQuestionFromContext({
      recentMessages: [
        { role: 'assistant', content: 'What do you like about your hobby?' },
        { role: 'user', content: 'Yes' },
      ],
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'test-yes-only',
    })

    const noOnly = buildNextFreeTalkQuestionFromContext({
      recentMessages: [
        { role: 'assistant', content: 'What do you like about your hobby?' },
        { role: 'user', content: 'No' },
      ],
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'test-no-only',
    })

    expect(yesOnly).toBeTruthy()
    expect(noOnly).toBeTruthy()
    expect(yesOnly).not.toMatch(/\byes\b/i)
    expect(yesOnly).not.toMatch(/\bno\b/i)
    expect(noOnly).not.toMatch(/\byes\b/i)
    expect(noOnly).not.toMatch(/\bno\b/i)
  })

  it('does not turn Yes, I like to play into yes play', () => {
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages: [
        { role: 'assistant', content: 'What do you like about your hobby?' },
        { role: 'user', content: 'Yes, I like to play' },
      ],
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'test-yes-play',
    })

    expect(q).toBeTruthy()
    expect(q).not.toMatch(/yes play/i)
    expect(q).toMatch(/\bplay\b/i)
  })

  it('returns null when there is no extractable topic signal', () => {
    const recentMessages: ChatMessage[] = [{ role: 'user', content: 'ok' }]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'test-empty',
    })
    expect(q).toBeNull()
  })
})
