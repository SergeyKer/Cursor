import { describe, expect, it } from 'vitest'
import { createEmptyPracticeTopicProgress } from '@/types/practiceTopicProgress'
import type { UserLessonProgress } from '@/types/userProgress'
import {
  formatPracticeProgressBadge,
  pickDefaultLessonIdForMenu,
  resolveLessonMenuRewardIcons,
  resolveLessonMenuRewardIconsFromProgress,
} from '@/lib/practice/pickBestPracticeRewardOpportunity'

const baseLessonProgress = {
  lessonId: '1',
  topic: 'Test',
  level: 'A2',
  completedSteps: [],
  completedVariants: [],
  xp: 0,
  combo: 0,
  coreXp: 0,
  comboXp: 0,
  totalXp: 0,
  maxCoreXp: 140,
  corePercent: 0,
  strengthPercent: 0,
  maxCombo: 0,
  bestCoreXp: 0,
  medal: null,
  mistakes: [],
  lastCompleted: '',
} satisfies UserLessonProgress

describe('formatPracticeProgressBadge (cups)', () => {
  it('shows ring progress for gold without cup', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 3 }
    const badge = formatPracticeProgressBadge(progress, 'gold')
    expect(badge).toMatch(/📝/)
    expect(badge).toContain('3/5')
    expect(badge).not.toMatch(/🏆/)
  })

  it('shows trophy when cup claimed', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 5, cupClaimed: true }
    expect(formatPracticeProgressBadge(progress, 'gold')).toBe('🏆')
  })

  it('shows practice progress for silver', () => {
    const progress = { ...createEmptyPracticeTopicProgress('1'), ringCount: 2 }
    expect(formatPracticeProgressBadge(progress, 'silver')).toBe('📝 2/5')
  })
})

describe('resolveLessonMenuRewardIconsFromProgress', () => {
  it('returns null when lesson started but no saved medal', () => {
    expect(
      resolveLessonMenuRewardIconsFromProgress('1', {
        ...baseLessonProgress,
        coreXp: 35,
        cycle1Started: true,
      })
    ).toBeNull()
  })

  it('returns ring when saved bronze medal', () => {
    const icons = resolveLessonMenuRewardIconsFromProgress('1', {
      ...baseLessonProgress,
      medal: 'bronze',
    })
    expect(icons?.showRing).toBe(true)
    expect(icons?.cupEarned).toBe(false)
  })
})

describe('resolveLessonMenuRewardIcons', () => {
  it('returns cup slot when topic is complete', () => {
    const progress = { ...createEmptyPracticeTopicProgress('a'), ringCount: 5, cupClaimed: true }
    const icons = resolveLessonMenuRewardIcons('a', 'gold', progress)
    expect(icons?.cupEarned).toBe(true)
    expect(icons?.showRing).toBe(false)
  })

  it('returns ring slot when gold without cup', () => {
    const progress = { ...createEmptyPracticeTopicProgress('a'), ringCount: 2 }
    const icons = resolveLessonMenuRewardIcons('a', 'gold', progress)
    expect(icons?.cupEarned).toBe(false)
    expect(icons?.showRing).toBe(true)
    expect(icons?.ringCount).toBe(2)
  })
})

describe('pickDefaultLessonIdForMenu', () => {
  it('prefers lesson without cup over completed topic', () => {
    const items = [
      { id: 'done', enabled: true },
      { id: 'active', enabled: true },
    ]
    const map: Record<string, UserLessonProgress> = {
      done: { lessonId: 'done', medal: 'gold' } as UserLessonProgress,
      active: { lessonId: 'active', medal: 'gold' } as UserLessonProgress,
    }
    const getProgress = (lessonId: string) =>
      lessonId === 'done'
        ? { ...createEmptyPracticeTopicProgress(lessonId), ringCount: 5, cupClaimed: true }
        : { ...createEmptyPracticeTopicProgress(lessonId), ringCount: 1 }

    expect(pickDefaultLessonIdForMenu(items, map, getProgress)).toBe('active')
  })
})
