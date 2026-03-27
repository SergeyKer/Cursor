import { describe, expect, it } from 'vitest'
import { buildFreeTalkTopicAnchorQuestion, buildFreeTalkTopicLabel } from './freeTalkQuestionAnchor'

describe('freeTalkQuestionAnchor', () => {
  it('keeps the topic as a single phrase', () => {
    expect(buildFreeTalkTopicLabel(['interesting', 'serial'])).toBe('interesting serial')
  })

  it('uses the phrase in the generated question', () => {
    const question = buildFreeTalkTopicAnchorQuestion({
      keywords: ['interesting', 'serial'],
      topicLabel: 'interesting serial',
      tense: 'past_simple',
      audience: 'adult',
      diversityKey: 'unit-test',
    })

    expect(question).toContain('interesting serial')
    expect(question).not.toContain('interesting, serial')
  })

  it('keeps Future Simple form for free-talk anchor', () => {
    const q = buildFreeTalkTopicAnchorQuestion({
      keywords: ['movies'],
      tense: 'future_simple',
      audience: 'child',
      diversityKey: 'future-case',
    })
    expect(q.includes('?')).toBe(true)
    expect(/\bwill\b/i.test(q)).toBe(true)
  })

  it('generates different tone pools for child and adult', () => {
    const childQ = buildFreeTalkTopicAnchorQuestion({
      keywords: ['music'],
      tense: 'present_simple',
      audience: 'child',
      diversityKey: 'tone-case',
    })
    const adultQ = buildFreeTalkTopicAnchorQuestion({
      keywords: ['music'],
      tense: 'present_simple',
      audience: 'adult',
      diversityKey: 'tone-case',
    })
    expect(childQ).not.toEqual(adultQ)
  })

  it('avoids near-duplicate with recent assistant question', () => {
    const repeated = 'Do you like movies?'
    const q = buildFreeTalkTopicAnchorQuestion({
      keywords: ['movies'],
      tense: 'present_simple',
      audience: 'child',
      diversityKey: 'dup-case',
      recentAssistantQuestions: [repeated],
    })
    expect(q).not.toEqual(repeated)
  })
})
