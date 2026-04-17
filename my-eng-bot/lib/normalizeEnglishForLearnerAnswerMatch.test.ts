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

  it('normalizes it is and it’s for translation', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('It is very cold.', 'translation')
    const b = normalizeEnglishForLearnerAnswerMatch("It's very cold.", 'translation')
    expect(a).toBe(b)
  })

  it('normalizes it is and it’s for dialogue', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('It is late.', 'dialogue')
    const b = normalizeEnglishForLearnerAnswerMatch("It's late.", 'dialogue')
    expect(a).toBe(b)
  })

  it('normalizes want and would like for translation', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('I want tea.', 'translation')
    const b = normalizeEnglishForLearnerAnswerMatch('I would like tea.', 'translation')
    expect(a).toBe(b)
  })

  it('normalizes want and would like for dialogue', () => {
    const a = normalizeEnglishForLearnerAnswerMatch('They want tea.', 'dialogue')
    const b = normalizeEnglishForLearnerAnswerMatch("They'd like tea.", 'dialogue')
    expect(a).toBe(b)
  })
})
