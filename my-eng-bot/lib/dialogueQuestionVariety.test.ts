import { describe, expect, it } from 'vitest'
import { isNearDuplicateQuestion, normalizeQuestionForCompare } from './dialogueQuestionVariety'

describe('dialogueQuestionVariety', () => {
  it('normalizes punctuation and casing for comparison', () => {
    expect(normalizeQuestionForCompare('Will you WATCH Simpsons next week?!')).toBe(
      'will you watch simpsons next week?'
    )
  })

  it('detects exact duplicate questions', () => {
    expect(
      isNearDuplicateQuestion('Will you watch Simpsons next week?', 'Will you watch Simpsons next week?')
    ).toBe(true)
  })

  it('detects near duplicates with same core tokens', () => {
    expect(
      isNearDuplicateQuestion('Will you watch Simpsons next week?', 'Will you watch The Simpsons next week?')
    ).toBe(true)
  })

  it('does not mark different open questions as duplicates', () => {
    expect(
      isNearDuplicateQuestion('Will you watch Simpsons next week?', 'Why do you want to watch Simpsons next week?')
    ).toBe(false)
  })
})
