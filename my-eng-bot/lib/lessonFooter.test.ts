import { describe, expect, it } from 'vitest'
import { buildLessonFooterLive } from '@/lib/lessonFooter'

describe('lessonFooter', () => {
  it('builds spaced segments without dot separators and a single medal', () => {
    const view = buildLessonFooterLive({
      currentStep: 1,
      totalSteps: 7,
      coreXp: 35,
      maxCoreXp: 140,
      coreDelta: 8,
      combo: 3,
      comboDelta: 5,
      accountTotalXp: 350,
      dailyStreak: 2,
    })
    expect(view.lessonSegments.map((segment) => segment.text)).toEqual([
      'Шаг 2/7',
      '35/140 (+8) XP',
      '🥉',
      'COMBO ×3 (+5)',
    ])
    expect(view.accountSegments.map((segment) => segment.text)).toEqual(['⭐350', '🔥2д'])
    expect(view.lessonSegments.join('')).not.toContain('·')
    expect(view.accountLine).toContain('⭐350')
    expect(view.accountLine).toContain('🔥2д')
  })
})
