import { describe, expect, it } from 'vitest'
import {
  practiceWordMultisetsEqual,
  rebuildPracticeWordTokensFromAnswer,
  tokensFromTargetAnswer,
} from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'

describe('rebuildPracticeWordTokensFromAnswer', () => {
  it('prefers shuffled order when multiset matches target', () => {
    const target = "It's time to go home."
    const shuffled = ['go', 'home', "It's", 'time', 'to']
    expect(rebuildPracticeWordTokensFromAnswer(target, shuffled)).toEqual(shuffled)
  })

  it('falls back to target tokens when shuffle multiset mismatches', () => {
    const target = "It's dark."
    const shuffled = ["It's", 'time', 'to']
    expect(rebuildPracticeWordTokensFromAnswer(target, shuffled)).toEqual(tokensFromTargetAnswer(target))
  })

  it('compares multisets with duplicate tokens', () => {
    expect(practiceWordMultisetsEqual(['to', 'go', 'to'], ['to', 'to', 'go'])).toBe(true)
    expect(practiceWordMultisetsEqual(['to', 'go'], ['to', 'to', 'go'])).toBe(false)
  })
})
