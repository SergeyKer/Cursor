import { describe, expect, it } from 'vitest'
import {
  applyPracticeBadgeProgressAfterCompletion,
  buildPracticeBadgeFinaleLine,
  isStrongPracticePass,
  practiceBadgeRankEmoji,
  resolvePracticeBadgeRankFromProgress,
} from '@/lib/practice/practiceBadges'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'

describe('practiceBadges', () => {
  it('maps ranks to color circles', () => {
    expect(practiceBadgeRankEmoji(0)).toBe('·')
    expect(practiceBadgeRankEmoji(1)).toBe('🔵')
    expect(practiceBadgeRankEmoji(2)).toBe('⚪')
    expect(practiceBadgeRankEmoji(3)).toBe('🟡')
  })

  it('detects strong passes by mode thresholds', () => {
    expect(
      isStrongPracticePass({
        mode: 'relaxed',
        tier: 1,
        masteryScore: 6,
        effectiveMasteryScore: 6,
        plannedLength: 6,
      })
    ).toBe(true)
    expect(
      isStrongPracticePass({
        mode: 'balanced',
        tier: 1,
        masteryScore: 8,
        effectiveMasteryScore: 8,
        plannedLength: 9,
      })
    ).toBe(true)
    expect(
      isStrongPracticePass({
        mode: 'balanced',
        tier: 1,
        masteryScore: 7,
        effectiveMasteryScore: 7,
        plannedLength: 9,
      })
    ).toBe(false)
    expect(
      isStrongPracticePass({
        mode: 'challenge',
        tier: 1,
        masteryScore: 10,
        effectiveMasteryScore: 11,
        plannedLength: 12,
      })
    ).toBe(true)
  })

  it('awards rank 1 on first strong balanced pass', () => {
    const previous = createEmptyPracticeTopicProgress('4')
    const result = applyPracticeBadgeProgressAfterCompletion({
      progress: previous,
      mode: 'balanced',
      tier: 1,
      masteryScore: 8,
      effectiveMasteryScore: 8,
      plannedLength: 9,
    })
    expect(result.newRank).toBe(1)
    expect(result.rankAwarded).toBe(1)
    expect(result.progress.strongPassEasyNormalCount).toBe(1)
  })

  it('reaches rank 2 via five easy/normal strong passes', () => {
    let progress = createEmptyPracticeTopicProgress('4')
    for (let i = 0; i < 5; i += 1) {
      const result = applyPracticeBadgeProgressAfterCompletion({
        progress,
        mode: 'balanced',
        tier: 1,
        masteryScore: 8,
        effectiveMasteryScore: 8,
        plannedLength: 9,
      })
      progress = result.progress
    }
    expect(resolvePracticeBadgeRankFromProgress(progress)).toBe(2)
  })

  it('reaches rank 3 via five challenge rings', () => {
    const progress = {
      ...createEmptyPracticeTopicProgress('2'),
      ringCount: 5,
      badgeRank: 2 as const,
      strongPassEasyNormalCount: 0,
    }
    expect(resolvePracticeBadgeRankFromProgress(progress)).toBe(3)
  })

  it('builds miss finale line with deficit', () => {
    const line = buildPracticeBadgeFinaleLine({
      lessonId: '4',
      previousRank: 0,
      newRank: 0,
      rankAwarded: null,
      strongPassThisRun: false,
      masteryScore: 7,
      plannedLength: 9,
      strongPassEasyNormalCount: 0,
      ringCount: 0,
      mode: 'balanced',
    })
    expect(line.kind).toBe('miss_threshold')
    expect(line.text).toContain('не хватило')
    expect(line.text).toContain('7/9')
    expect(line.text).toContain('🔵')
  })

  it('builds awarded finale line with rank emoji', () => {
    const line = buildPracticeBadgeFinaleLine({
      lessonId: '4',
      previousRank: 0,
      newRank: 1,
      rankAwarded: 1,
      strongPassThisRun: true,
      masteryScore: 8,
      plannedLength: 9,
      strongPassEasyNormalCount: 1,
      ringCount: 0,
      mode: 'balanced',
    })
    expect(line.kind).toBe('awarded')
    expect(line.text).toBe('🔵 Начинающий собеседник!')
  })
})
