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
