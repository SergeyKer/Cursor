import { describe, expect, it } from 'vitest'
import { buildFreeTalkFirstQuestion } from './freeTalkFirstQuestion'

describe('buildFreeTalkFirstQuestion', () => {
  it('keeps the first question short and chatty for child A0', () => {
    const q = buildFreeTalkFirstQuestion({
      audience: 'child',
      level: 'a0',
      dialogSeed: 'child-a0',
      topicSuggestions: ['toys', 'pets', 'games'],
    })

    expect(q).toContain('What do you want to talk about?')
    expect(q).toContain('Your topic, or one of these:')
    expect(q).toContain('- toys')
    expect(q).toContain('- pets')
    expect(q).toContain('- games')
    expect(q).toMatch(/What do you want to talk about\?\nYour topic, or one of these:\n- toys\n- pets\n- games/)
    expect(q).not.toMatch(/pick one|choose one|suggested topics|suggest your own topic/i)
  })

  it('keeps the first question short and chatty for adult B1+', () => {
    const q = buildFreeTalkFirstQuestion({
      audience: 'adult',
      level: 'b1+',
      dialogSeed: 'adult-b1',
      topicSuggestions: ['films', 'work', 'travel'],
    })

    expect(q).toContain('What would you like to talk about?')
    expect(q).toContain('Your topic, or one of these:')
    expect(q).toContain('- films')
    expect(q).toContain('- work')
    expect(q).toContain('- travel')
    expect(q).toMatch(/What would you like to talk about\?\nYour topic, or one of these:\n- films\n- work\n- travel/)
    expect(q).not.toMatch(/pick one|choose one|suggested topics|suggest your own topic/i)
  })
})
