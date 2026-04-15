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
    expect(q).toMatch(/\b(hobby|game|sport|activity)\b/i)
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

  it('for narrow topic escalates to parent after three contextual questions', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What do you like about shovel?' },
      { role: 'user', content: 'I use shovel in my garden.' },
      { role: 'assistant', content: 'What did you try with shovel last weekend?' },
      { role: 'user', content: 'I cleaned soil with shovel.' },
      { role: 'assistant', content: 'What have you learned about shovel?' },
      { role: 'user', content: 'Shovel helps a lot.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'narrow-to-parent',
    })
    expect(q).toBeTruthy()
    expect(q?.toLowerCase()).toContain('tools')
  })

  it('keeps broad topic without forced escalation', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What do you think about nature?' },
      { role: 'user', content: 'Nature is calming.' },
      { role: 'assistant', content: 'What have you learned about nature?' },
      { role: 'user', content: 'I enjoy forests and rivers.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'broad-keep',
    })
    expect(q).toBeTruthy()
    expect(q?.toLowerCase()).toContain('nature')
  })

  it('filters verb-echo tokens and keeps real topic keyword', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What sports have you tried this year?' },
      { role: 'user', content: 'I tried karting.' },
      { role: 'assistant', content: 'Комментарий: Требуется Present Perfect.\nСкажи: I have tried karting.' },
      { role: 'user', content: 'I have tried karting.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_perfect',
      audience: 'adult',
      diversityKey: 'verb-echo-filter',
    })
    expect(q).toBeTruthy()
    expect(q?.toLowerCase()).toContain('karting')
    expect(q?.toLowerCase()).not.toContain('tried enjoyed swim')
    expect(q?.toLowerCase()).not.toContain('tried')
    expect(q?.toLowerCase()).not.toContain('enjoyed')
  })

  it('filters russian verb-echo tokens and keeps concrete topic', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What sports have you tried this year?' },
      { role: 'user', content: 'Я пробовал karting.' },
      { role: 'assistant', content: 'Комментарий: Используем Present Perfect.\nСкажи: I have tried karting.' },
      { role: 'user', content: 'Я делал karting.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_perfect',
      audience: 'adult',
      diversityKey: 'ru-verb-echo-filter',
    })
    expect(q).toBeTruthy()
    expect(q?.toLowerCase()).toContain('karting')
    expect(q?.toLowerCase()).not.toContain('пробовал')
    expect(q?.toLowerCase()).not.toContain('делал')
  })

  it('does not build malformed topic phrase from quantifier words', () => {
    const recentMessages: ChatMessage[] = [
      { role: 'assistant', content: 'What do you want to say about short term goals?' },
      { role: 'user', content: 'I have many goals.' },
    ]
    const q = buildNextFreeTalkQuestionFromContext({
      recentMessages,
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'quantifier-filter',
    })
    expect(q).toBeTruthy()
    expect(q?.toLowerCase()).not.toContain('goals many')
    expect(q?.toLowerCase()).toContain('goals')
  })
})
