import { describe, expect, it } from 'vitest'
import { normalizeAttitudeVerbGerundOrInfinitive } from './englishAttitudeGerundInfinitive'
import { normalizeEnglishForLearnerAnswerMatch } from './normalizeEnglishForLearnerAnswerMatch'

describe('normalizeAttitudeVerbGerundOrInfinitive', () => {
  it('unifies like cooking and like to cook', () => {
    const a = normalizeAttitudeVerbGerundOrInfinitive('i like cooking')
    const b = normalizeAttitudeVerbGerundOrInfinitive('i like to cook')
    expect(a).toBe(b)
  })

  it('unifies hate swimming and hate to swim', () => {
    const a = normalizeAttitudeVerbGerundOrInfinitive("i hate swimming")
    const b = normalizeAttitudeVerbGerundOrInfinitive('i hate to swim')
    expect(a).toBe(b)
  })

  it("unifies don't like waiting and don't like to wait", () => {
    const a = normalizeAttitudeVerbGerundOrInfinitive("i don't like waiting")
    const b = normalizeAttitudeVerbGerundOrInfinitive("i don't like to wait")
    expect(a).toBe(b)
  })

  it("unifies don't mind waiting and don't mind to wait", () => {
    const a = normalizeAttitudeVerbGerundOrInfinitive("i don't mind waiting")
    const b = normalizeAttitudeVerbGerundOrInfinitive("i don't mind to wait")
    expect(a).toBe(b)
  })
})

describe('normalizeEnglishForLearnerAnswerMatch + attitude', () => {
  it('matches full sentences for translation scope', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('I like cooking.', 'translation')
    const b = normalizeEnglishForLearnerAnswerMatch('I like to cook.', 'translation')
    expect(a).toBe(b)
  })
})
