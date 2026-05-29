import { describe, expect, it } from 'vitest'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import { formatPracticeProgressBadge } from '@/lib/practice/pickBestPracticeRewardOpportunity'

describe('formatPracticeProgressBadge (cups)', () => {
  it('shows trophy progress for gold without cup', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 3 }
    const badge = formatPracticeProgressBadge(progress, 'gold')
    expect(badge).toMatch(/🏆/)
    expect(badge).toContain('3/5')
  })

  it('shows trophy check when cup claimed', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 5, cupClaimed: true }
    expect(formatPracticeProgressBadge(progress, 'gold')).toBe('🏆 ✓')
  })

  it('shows ring only for silver', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 2 }
    expect(formatPracticeProgressBadge(progress, 'silver')).toBe('🔁 2/5')
  })
})
