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
    expect(q).toContain('1) toys')
    expect(q).toContain('2) pets')
    expect(q).toContain('3) games')
    expect(q).toMatch(/What do you want to talk about\?\nYour topic, or one of these:\n1\) toys\n2\) pets\n3\) games/)
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
    expect(q).toContain('1) films')
    expect(q).toContain('2) work')
    expect(q).toContain('3) travel')
    expect(q).toMatch(/What would you like to talk about\?\nYour topic, or one of these:\n1\) films\n2\) work\n3\) travel/)
    expect(q).not.toMatch(/pick one|choose one|suggested topics|suggest your own topic/i)
  })
})
