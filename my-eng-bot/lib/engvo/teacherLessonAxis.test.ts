import { describe, expect, it } from 'vitest'
import {
  clampEngvoCefrForLessonAxis,
  filterEngvoLevelsForLessonAxis,
  isEngvoTeacherLessonAxisIncomplete,
  isEngvoTeacherLevelLocked,
  resolveTeacherLessonAxis,
  toTeacherLessonAxisPrompt,
} from '@/lib/engvo/teacherLessonAxis'
import { ENGVO_LEVEL_OPTIONS } from '@/lib/engvo/constants'

describe('resolveTeacherLessonAxis', () => {
  it('is inactive for free_call and tense_drill', () => {
    expect(
      resolveTeacherLessonAxis({
        sessionKind: 'free_call',
        drillKind: 'lesson_topic',
        lessonId: '4',
        level: 'a1',
        sessionSeed: 's1',
      }).active
    ).toBe(false)
    expect(
      resolveTeacherLessonAxis({
        sessionKind: 'teacher',
        drillKind: 'tense_drill',
        lessonId: '4',
        level: 'a1',
        sessionSeed: 's1',
      }).active
    ).toBe(false)
  })

  it('activates for valid concrete lesson', () => {
    const axis = resolveTeacherLessonAxis({
      sessionKind: 'teacher',
      drillKind: 'lesson_topic',
      lessonId: '4',
      level: 'a1',
      sessionSeed: 's1',
    })
    expect(axis.active).toBe(true)
    if (!axis.active) return
    expect(axis.effectiveLessonId).toBe('4')
    expect(axis.grammarFocusLines.length).toBeGreaterThan(0)
    expect(axis.ruSeeds.length).toBeGreaterThan(0)
    expect(toTeacherLessonAxisPrompt(axis).title).toBeTruthy()
  })

  it('pins effective lesson for all', () => {
    const first = resolveTeacherLessonAxis({
      sessionKind: 'teacher',
      drillKind: 'lesson_topic',
      lessonId: 'all',
      level: 'a1',
      sessionSeed: 'seed-stable',
    })
    expect(first.active).toBe(true)
    if (!first.active) return
    const second = resolveTeacherLessonAxis({
      sessionKind: 'teacher',
      drillKind: 'lesson_topic',
      lessonId: 'all',
      level: 'a1',
      sessionSeed: 'seed-other',
      pinnedEffectiveLessonId: first.effectiveLessonId,
    })
    expect(second.active).toBe(true)
    if (!second.active) return
    expect(second.effectiveLessonId).toBe(first.effectiveLessonId)
  })

  it('fails soft on invalid lesson', () => {
    expect(
      resolveTeacherLessonAxis({
        sessionKind: 'teacher',
        drillKind: 'lesson_topic',
        lessonId: 'no-such-lesson-xyz',
        level: 'a1',
        sessionSeed: 's1',
      }).active
    ).toBe(false)
  })
})

describe('teacher lesson axis menu helpers', () => {
  it('incomplete when lesson null on lesson axis', () => {
    expect(
      isEngvoTeacherLessonAxisIncomplete({
        sessionKind: 'teacher',
        drillKind: 'lesson_topic',
        lessonId: null,
        level: 'a1',
      })
    ).toBe(true)
  })

  it('not incomplete for all with pool', () => {
    expect(
      isEngvoTeacherLessonAxisIncomplete({
        sessionKind: 'teacher',
        drillKind: 'lesson_topic',
        lessonId: 'all',
        level: 'a1',
      })
    ).toBe(false)
  })

  it('locks level on concrete lesson', () => {
    expect(
      isEngvoTeacherLevelLocked({
        sessionKind: 'teacher',
        drillKind: 'lesson_topic',
        lessonId: '4',
      })
    ).toBe(true)
    expect(
      isEngvoTeacherLevelLocked({
        sessionKind: 'teacher',
        drillKind: 'lesson_topic',
        lessonId: 'all',
      })
    ).toBe(false)
  })

  it('filters levels for lesson axis', () => {
    const adult = filterEngvoLevelsForLessonAxis(ENGVO_LEVEL_OPTIONS, 'adult').map((l) => l.id)
    expect(adult).toEqual(['a1', 'a2', 'b1', 'b2'])
    const child = filterEngvoLevelsForLessonAxis(ENGVO_LEVEL_OPTIONS, 'child').map((l) => l.id)
    expect(child).toEqual(['a1', 'a2'])
    expect(clampEngvoCefrForLessonAxis('c1', 'adult')).toBe('a2')
    expect(clampEngvoCefrForLessonAxis('b1', 'child')).toBe('a2')
  })
})
