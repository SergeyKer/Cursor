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

    expect(q).toMatch(/^(What do you want to talk about\?|What would you like to talk about\?|Tell me what you want to talk about\.)/)
    expect(q).toContain('Topics: toys, pets, or games.')
    expect(q).not.toMatch(/pick one|choose one|suggested topics/i)
  })

  it('keeps the first question short and chatty for adult B1+', () => {
    const q = buildFreeTalkFirstQuestion({
      audience: 'adult',
      level: 'b1+',
      dialogSeed: 'adult-b1',
      topicSuggestions: ['films', 'work', 'travel'],
    })

    expect(q).toMatch(/^(What would you like to talk about today\?|What would you like to talk about\?|Tell me what you want to talk about\.)/)
    expect(q).toContain('Topics: films, work, or travel.')
    expect(q).not.toMatch(/pick one|choose one|suggested topics/i)
  })
})
