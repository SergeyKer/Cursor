import { describe, expect, it } from 'vitest'
import {
  clampLevelForLessonAxis,
  isTranslationLevelLocked,
  listEnabledTranslationLessonsForLevel,
  menuLevelIdForConcreteTranslationLesson,
  normalizeLessonForLevel,
  normalizeTranslationDrillKind,
  pickTranslationLessonId,
  resolveEffectiveTranslationLessonId,
  syncTranslationLevelFromConcreteLesson,
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

  it('menuLevelIdForConcreteTranslationLesson maps catalog CEFR', () => {
    expect(menuLevelIdForConcreteTranslationLesson('1')).toBe('a2')
    expect(menuLevelIdForConcreteTranslationLesson('4')).toBe('a1')
    expect(menuLevelIdForConcreteTranslationLesson('all')).toBeNull()
    expect(menuLevelIdForConcreteTranslationLesson(null)).toBeNull()
    expect(menuLevelIdForConcreteTranslationLesson('missing')).toBeNull()
  })

  it('isTranslationLevelLocked only for translation + lesson_topic + concrete id', () => {
    expect(
      isTranslationLevelLocked({
        mode: 'translation',
        translationDrillKind: 'lesson_topic',
        translationLessonId: '1',
      })
    ).toBe(true)
    expect(
      isTranslationLevelLocked({
        mode: 'translation',
        translationDrillKind: 'lesson_topic',
        translationLessonId: 'all',
      })
    ).toBe(false)
    expect(
      isTranslationLevelLocked({
        mode: 'translation',
        translationDrillKind: 'tense_drill',
        translationLessonId: '1',
      })
    ).toBe(false)
    expect(
      isTranslationLevelLocked({
        mode: 'dialogue',
        translationDrillKind: 'lesson_topic',
        translationLessonId: '1',
      })
    ).toBe(false)
  })

  it('syncTranslationLevelFromConcreteLesson returns catalog level when locked', () => {
    expect(
      syncTranslationLevelFromConcreteLesson({
        mode: 'translation',
        translationDrillKind: 'lesson_topic',
        translationLessonId: '4',
      })
    ).toEqual({ level: 'a1' })
    expect(
      syncTranslationLevelFromConcreteLesson({
        mode: 'translation',
        translationDrillKind: 'lesson_topic',
        translationLessonId: 'all',
      })
    ).toBeNull()
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

  it('resolveEffectiveTranslationLessonId keeps concrete lesson even if menu level pool mismatches', () => {
    // A1 lesson while menu level is A2 — concrete id still resolves
    expect(
      resolveEffectiveTranslationLessonId({
        translationLessonId: '4',
        level: 'a2',
        dialogSeed: 's',
        drillIndex: 0,
      })
    ).toBe('4')
  })
})
