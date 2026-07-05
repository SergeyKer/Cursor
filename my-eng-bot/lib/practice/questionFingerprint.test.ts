import { describe, expect, it } from 'vitest'
import { buildPracticeQuestionFingerprint } from '@/lib/practice/questionFingerprint'

describe('buildPracticeQuestionFingerprint', () => {
  const base = {
    type: 'word-builder-pro',
    prompt: 'Ситуация: Пора домой. Расставьте слова.',
    targetAnswer: "It's time to go home.",
  }

  it('includes extraWords only for word-builder-pro', () => {
    const withTraps = buildPracticeQuestionFingerprint({
      ...base,
      extraWords: ['times', 'goes'],
    })
    const withoutTraps = buildPracticeQuestionFingerprint({
      ...base,
      extraWords: undefined,
    })
    expect(withTraps).not.toBe(withoutTraps)
    expect(withTraps).toContain('goes')
    expect(withTraps).toContain('times')
  })

  it('does not include extraWords for sentence-surgery', () => {
    const key = buildPracticeQuestionFingerprint({
      type: 'sentence-surgery',
      prompt: base.prompt,
      targetAnswer: base.targetAnswer,
      extraWords: ['goes', 'times'],
    })
    expect(key).not.toContain('goes')
    expect(key.split('|').length).toBe(3)
  })
})
