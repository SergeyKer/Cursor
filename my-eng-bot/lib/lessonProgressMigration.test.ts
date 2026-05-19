import { describe, expect, it } from 'vitest'
import { mergeLessonProgressOnComplete, migrateUserLessonProgress } from '@/lib/lessonProgressMigration'

describe('lessonProgressMigration', () => {
  it('migrates legacy xp/combo fields', () => {
    const migrated = migrateUserLessonProgress(
      {
        xp: 80,
        combo: 4,
        completedSteps: [1, 2, 3],
        lastCompleted: '2026-01-01',
      },
      '1'
    )
    expect(migrated.coreXp).toBe(80)
    expect(migrated.maxCombo).toBe(4)
    expect(migrated.lessonCompleted).toBe(false)
  })

  it('assigns bronze medal for completed lesson below 50%', () => {
    const merged = mergeLessonProgressOnComplete(null, {
      lessonId: '1',
      topic: 't',
      level: 'A2',
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
      completedVariants: [1],
      coreXp: 40,
      comboXp: 0,
      maxCoreXp: 140,
      maxCombo: 2,
      mistakes: [],
    })
    expect(merged.medal).toBe('bronze')
    expect(merged.lessonCompleted).toBe(true)
  })

  it('upgrades medal on better replay', () => {
    const previous = mergeLessonProgressOnComplete(null, {
      lessonId: '1',
      topic: 't',
      level: 'A2',
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
      completedVariants: [1],
      coreXp: 40,
      comboXp: 0,
      maxCoreXp: 140,
      maxCombo: 2,
      mistakes: [],
    })
    const merged = mergeLessonProgressOnComplete(previous, {
      lessonId: '1',
      topic: 't',
      level: 'A2',
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
      completedVariants: [1],
      coreXp: 130,
      comboXp: 10,
      maxCoreXp: 140,
      maxCombo: 5,
      mistakes: [],
    })
    expect(merged.medal).toBe('gold')
    expect(merged.bestCoreXp).toBe(130)
  })
})
