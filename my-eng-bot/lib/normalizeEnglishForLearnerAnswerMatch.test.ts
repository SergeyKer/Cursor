import { describe, expect, it } from 'vitest'
import { normalizeEnglishForLearnerAnswerMatch } from './normalizeEnglishForLearnerAnswerMatch'

describe('normalizeEnglishForLearnerAnswerMatch', () => {
  it('maps I am and I’m to the same string (translation)', () => {
    const a = normalizeEnglishForLearnerAnswerMatch("I'm fine.", 'translation')
    const b = normalizeEnglishForLearnerAnswerMatch('I am fine.', 'translation')
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('maps I am and I’m to the same string (dialogue)', () => {
    const a = normalizeEnglishForLearnerAnswerMatch("I'm here.", 'dialogue')
    const b = normalizeEnglishForLearnerAnswerMatch('I am here.', 'dialogue')
    expect(a).toBe(b)
  })

  it('normalizes I do not and I don’t like for translation', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('I do not like trips.', 'translation')
    const b = normalizeEnglishForLearnerAnswerMatch("I don't like trips.", 'translation')
    expect(a).toBe(b)
  })

  it('normalizes I do not and I don’t like for dialogue', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('I do not like trips.', 'dialogue')
    const b = normalizeEnglishForLearnerAnswerMatch("I don't like trips.", 'dialogue')
    expect(a).toBe(b)
  })
})
