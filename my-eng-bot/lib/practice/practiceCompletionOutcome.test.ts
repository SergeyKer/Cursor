import { describe, expect, it } from 'vitest'
import { resolvePracticeMilestoneOutcome } from '@/lib/practice/practiceCompletionOutcome'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

describe('resolvePracticeMilestoneOutcome', () => {
  it('awards ring 3 and ring 5 coins only on their transitions', () => {
    const base = createEmptyPracticeTopicProgress('topic-1')
    const ring3 = resolvePracticeMilestoneOutcome({
      previousProgress: { ...base, ringCount: 2 },
      progress: { ...base, ringCount: 3 },
      tier: 2,
      ringIncremented: true,
      cupEnabled: true,
    })
    expect(ring3.coinsAwarded).toBe(1)
    expect(ring3.coinMilestones.map((item) => item.key)).toEqual(['topic-1:ring3'])

    const ring5 = resolvePracticeMilestoneOutcome({
      previousProgress: { ...ring3.progress, ringCount: 4 },
      progress: { ...ring3.progress, ringCount: 5 },
      tier: 2,
      ringIncremented: true,
      cupEnabled: true,
    })
    expect(ring5.coinsAwarded).toBe(2)
    expect(ring5.coinMilestones.map((item) => item.key)).toEqual(['topic-1:ring5'])
    expect(ring5.cupAwarded).toBe(1)
  })

  it('keeps rewards pending without gold and releases them after gold', () => {
    const base = createEmptyPracticeTopicProgress('topic-1')
    const pending = resolvePracticeMilestoneOutcome({
      previousProgress: { ...base, ringCount: 2 },
      progress: { ...base, ringCount: 3 },
      tier: 1,
      ringIncremented: true,
      cupEnabled: true,
    })
    expect(pending.coinsAwarded).toBe(0)
    expect(pending.progress.pendingPracticeCoins).toBe(1)

    const claimed = resolvePracticeMilestoneOutcome({
      previousProgress: pending.progress,
      progress: pending.progress,
      tier: 2,
      ringIncremented: false,
      cupEnabled: true,
    })
    expect(claimed.coinsAwarded).toBe(1)
    expect(claimed.progress.pendingPracticeCoins).toBe(0)
  })

  it('does not turn a ring-5-only pending reward into a ring-3 payout', () => {
    const base = {
      ...createEmptyPracticeTopicProgress('topic-1'),
      ringCount: 5,
      pendingPracticeCoins: 2,
    }
    const claimed = resolvePracticeMilestoneOutcome({
      previousProgress: base,
      progress: base,
      tier: 2,
      ringIncremented: false,
      cupEnabled: true,
    })
    expect(claimed.coinsAwarded).toBe(2)
    expect(claimed.coinMilestones.map((item) => item.key)).toEqual(['topic-1:ring5'])
  })
})
