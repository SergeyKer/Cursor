import { describe, expect, it } from 'vitest'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'

describe('buildWordBuilderProExtraWords', () => {
  it('produces article traps for engineer phrase', () => {
    const extras = buildWordBuilderProExtraWords('I am an engineer.')
    expect(extras).toContain('a')
    expect(extras).not.toContain('ams')
    expect(extras?.some((item) => item === 'Is' || item === 'is')).toBe(false)
  })

  it('produces an trap for student phrase', () => {
    const extras = buildWordBuilderProExtraWords('I am a student.')
    expect(extras).toContain('an')
  })

  it('produces morph traps for go home phrase', () => {
    const extras = buildWordBuilderProExtraWords("It's time to go home.")
    expect(extras).toEqual(expect.arrayContaining(['goes', 'times']))
    expect(extras?.length).toBe(2)
  })

  it('does not morph from preposition for country phrase', () => {
    const extras = buildWordBuilderProExtraWords("I'm from Britain.")
    expect(extras).not.toContain('froms')
  })
})
