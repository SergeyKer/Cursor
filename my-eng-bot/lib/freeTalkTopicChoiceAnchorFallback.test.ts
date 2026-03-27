import { describe, expect, it } from 'vitest'
import { applyFreeTalkTopicChoiceTenseAnchorFallback } from './freeTalkTopicChoiceAnchorFallback'

describe('applyFreeTalkTopicChoiceTenseAnchorFallback', () => {
  it('replaces a tense-mismatched question with anchor', () => {
    const assistantWithTopics = `What would you like to talk about?
Your topic, or one of these:
1) my weekend
2) my pet
3) my games`
    const out = applyFreeTalkTopicChoiceTenseAnchorFallback({
      content: 'What did you eat yesterday?',
      recentMessages: [
        { role: 'assistant', content: assistantWithTopics },
        { role: 'user', content: '1' },
      ],
      userText: '1',
      tense: 'future_simple',
      audience: 'child',
    })
    expect(out).not.toContain('did you eat')
    expect(/\bwill\b/i.test(out)).toBe(true)
    expect(out).toMatch(/\?$/)
  })

  it('leaves valid future_simple question unchanged', () => {
    const assistantWithTopics = `What would you like to talk about?
Your topic, or one of these:
1) my weekend
2) my pet`
    const valid = 'Will you try my weekend soon?'
    const out = applyFreeTalkTopicChoiceTenseAnchorFallback({
      content: valid,
      recentMessages: [
        { role: 'assistant', content: assistantWithTopics },
        { role: 'user', content: '1' },
      ],
      userText: '1',
      tense: 'future_simple',
      audience: 'child',
    })
    expect(out).toBe(valid)
  })
})
