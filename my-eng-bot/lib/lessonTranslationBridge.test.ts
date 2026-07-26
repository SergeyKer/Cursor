import { describe, expect, it } from 'vitest'
import {
  clampLevelForLessonAxis,
  listEnabledTranslationLessonsForLevel,
  normalizeLessonForLevel,
  normalizeTranslationDrillKind,
  pickTranslationLessonId,
  resolveEffectiveTranslationLessonId,
} from '@/lib/lessonTranslationBridge'

describe('lessonTranslationBridge', () => {
  it('normalizeTranslationDrillKind defaults to tense_drill', () => {
    expect(normalizeTranslationDrillKind(undefined)).toBe('tense_drill')
    expect(normalizeTranslationDrillKind('lesson_topic')).toBe('lesson_topic')
    expect(normalizeTranslationDrillKind('nope')).toBe('tense_drill')
  })

  it('normalizeLessonForLevel keeps compatible id and resets A2→A1', () => {
    expect(normalizeLessonForLevel('4', 'a1')).toBe('4')
    expect(normalizeLessonForLevel('1', 'a1')).toBe('4') // A2 lesson not in A1 pool → first A1
    expect(normalizeLessonForLevel('all', 'a1')).toBe('all')
    expect(normalizeLessonForLevel('1', 'a2')).toBe('1')
    expect(normalizeLessonForLevel('missing', 'a2')).toBe(
      listEnabledTranslationLessonsForLevel('a2')[0]?.id ?? null
    )
  })

  it('normalizeLessonForLevel all on empty high level → null', () => {
    // B1 currently has no enabled practice lessons
    expect(listEnabledTranslationLessonsForLevel('b1')).toEqual([])
    expect(normalizeLessonForLevel('all', 'b1')).toBeNull()
    expect(normalizeLessonForLevel('4', 'b1')).toBeNull()
  })

  it('clampLevelForLessonAxis maps c1/c2 to a2', () => {
    expect(clampLevelForLessonAxis('c2')).toBe('a2')
    expect(clampLevelForLessonAxis('c1')).toBe('a2')
    expect(clampLevelForLessonAxis('a1')).toBe('a1')
    expect(clampLevelForLessonAxis('all')).toBe('all')
    expect(clampLevelForLessonAxis('starter')).toBe('a1')
  })

  it('pickTranslationLessonId is stable for same seed/index', () => {
    const a = pickTranslationLessonId({
      level: 'all',
      dialogSeed: 'seed-x',
      drillIndex: 0,
    })
    const b = pickTranslationLessonId({
      level: 'all',
      dialogSeed: 'seed-x',
      drillIndex: 0,
    })
    expect(a).toBe(b)
    expect(a).toBeTruthy()
  })

  it('pickTranslationLessonId can exclude previous when pool > 1', () => {
    const first = pickTranslationLessonId({
      level: 'all',
      dialogSeed: 'seed-y',
      drillIndex: 1,
    })
    const second = pickTranslationLessonId({
      level: 'all',
      dialogSeed: 'seed-y',
      drillIndex: 2,
      excludeId: first,
    })
    expect(second).toBeTruthy()
    if (listEnabledTranslationLessonsForLevel('all').length > 1) {
      expect(second).not.toBe(first)
    }
  })

  it('resolveEffectiveTranslationLessonId uses pin for all; invalid id → null', () => {
    expect(
      resolveEffectiveTranslationLessonId({
        translationLessonId: 'all',
        level: 'a1',
        dialogSeed: 's',
        drillIndex: 0,
        pinnedLessonId: '4',
      })
    ).toBe('4')
    expect(
      resolveEffectiveTranslationLessonId({
        translationLessonId: '4',
        level: 'a1',
        dialogSeed: 's',
        drillIndex: 0,
        pinnedLessonId: '1',
      })
    ).toBe('4')
    expect(
      resolveEffectiveTranslationLessonId({
        translationLessonId: 'missing',
        level: 'a1',
        dialogSeed: 's',
        drillIndex: 0,
      })
    ).toBeNull()
  })
})
