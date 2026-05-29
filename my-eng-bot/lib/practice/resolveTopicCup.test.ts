import { describe, expect, it } from 'vitest'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import { applyTopicCupProgress, resolveTopicCup } from '@/lib/practice/resolveTopicCup'

describe('resolveTopicCup', () => {
  it('awards cup on tier 2 when ring reaches 5 with increment', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 5 }
    expect(resolveTopicCup({ tier: 2, progress, ringIncremented: true }).awarded).toBe(1)
  })

  it('does not award when cup already claimed', () => {
    const progress = {
      ...createEmptyPracticeTopicProgress('1'),
      ringCount: 5,
      cupClaimed: true,
    }
    expect(resolveTopicCup({ tier: 2, progress, ringIncremented: true }).awarded).toBe(0)
  })

  it('does not award without ring increment', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 5 }
    expect(resolveTopicCup({ tier: 2, progress, ringIncremented: false }).awarded).toBe(0)
  })

  it('does not award on tier 1', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 5 }
    expect(resolveTopicCup({ tier: 1, progress, ringIncremented: true }).awarded).toBe(0)
  })

  it('applyTopicCupProgress sets cupClaimed', () => {
    const progress = createEmptyPracticeTopicProgress('1')
    const next = applyTopicCupProgress(progress, { awarded: 1 })
    expect(next.cupClaimed).toBe(true)
  })
})
