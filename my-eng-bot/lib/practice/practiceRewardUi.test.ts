import { describe, expect, it } from 'vitest'
import {
  buildPracticeRewardTopLine,
  createPracticeRewardUi,
} from '@/lib/practice/practiceRewardUi'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

describe('practiceRewardUi', () => {
  it('joins all earned reward parts', () => {
    const topLine = buildPracticeRewardTopLine({
      sessionXp: 50,
      globalAmount: 18,
      tier: 2,
      ringCount: 3,
      ringIncremented: true,
      coinsAwarded: 1,
      gemsAwarded: 0,
      cupAwarded: 0,
      audience: 'adult',
    })

    expect(topLine).toContain(' · ')
    expect(topLine).toContain('📝 3/5')
    expect(topLine).toContain('+1 🪙')
  })

  it('shows popup for a ring or coins even with zero global XP', () => {
    const progress = { ...createEmptyPracticeTopicProgress('topic-1'), ringCount: 3 }
    const rewardUi = createPracticeRewardUi({
      sessionId: 'session-1',
      sessionXp: 0,
      globalAmount: 0,
      globalReason: 'daily_cap_reached',
      tier: 2,
      progress,
      ringIncremented: true,
      coinsAwarded: 1,
      gemsAwarded: 0,
      cupAwarded: 0,
      audience: 'adult',
    })

    expect(rewardUi.showPopup).toBe(true)
  })
})
