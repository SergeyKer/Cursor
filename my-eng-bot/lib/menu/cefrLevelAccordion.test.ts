import { describe, expect, it } from 'vitest'
import {
  buildLevelProgressSummary,
  initialExpandedForProfile,
  pickDefaultExpandLevel,
  resolveCefrAccordionRestore,
  resolveTagAccordionRestore,
  settingsLevelToCefr,
  toggleExpandedLevel,
} from '@/lib/menu/cefrLevelAccordion'

describe('settingsLevelToCefr', () => {
  it('maps a1/starter/a2/b1/b2 and defaults unknown to A1', () => {
    expect(settingsLevelToCefr('a1')).toBe('A1')
    expect(settingsLevelToCefr('starter')).toBe('A1')
    expect(settingsLevelToCefr('a2')).toBe('A2')
    expect(settingsLevelToCefr('b1')).toBe('B1')
    expect(settingsLevelToCefr('b2')).toBe('B2')
    expect(settingsLevelToCefr('all')).toBe('A1')
    expect(settingsLevelToCefr(undefined)).toBe('A1')
  })
})

describe('toggleExpandedLevel / initialExpandedForProfile', () => {
  it('toggles membership without mutating input', () => {
    const start = initialExpandedForProfile('a2')
    expect([...start]).toEqual(['A2'])
    const opened = toggleExpandedLevel(start, 'B1')
    expect(opened.has('A2')).toBe(true)
    expect(opened.has('B1')).toBe(true)
    expect(start.has('B1')).toBe(false)
    const closed = toggleExpandedLevel(opened, 'A2')
    expect(closed.has('A2')).toBe(false)
    expect(closed.has('B1')).toBe(true)
  })
})

describe('pickDefaultExpandLevel', () => {
  it('prefers profile level when available else first', () => {
    expect(pickDefaultExpandLevel('A2', ['A1', 'A2'])).toBe('A2')
    expect(pickDefaultExpandLevel('B1', ['A1', 'A2'])).toBe('A1')
    expect(pickDefaultExpandLevel('A1', [])).toBe(null)
  })
})

describe('buildLevelProgressSummary', () => {
  it('counts done and in-progress', () => {
    const summary = buildLevelProgressSummary(['1', '2', '3'], {
      '1': { completedSteps: [1], lastCompleted: '', medal: null },
      '2': { completedSteps: [1], lastCompleted: '2026-01-01', medal: 'gold', lessonCompleted: true },
      '3': { completedSteps: [], lastCompleted: '', medal: null },
    })
    expect(summary).toEqual({
      done: 1,
      total: 3,
      inProgress: 1,
      label: '1/3 · 1 в процессе',
    })
  })

  it('omits in-progress segment when zero', () => {
    const summary = buildLevelProgressSummary(['1'], {
      '1': { completedSteps: [], lastCompleted: '', medal: null },
    })
    expect(summary.label).toBe('0/1')
  })
})

describe('resolveCefrAccordionRestore', () => {
  it('maps a1/a2 cef_levels to theoryCefrLevels', () => {
    expect(
      resolveCefrAccordionRestore({
        lessonsPanel: 'a1',
        theoryLessonSource: 'cef_levels',
        selectedLessonId: '4',
      })
    ).toEqual({
      lessonsPanel: 'theoryCefrLevels',
      expand: 'A1',
      selectedLessonId: '4',
    })
  })

  it('does not remap tag_browse a1/a2', () => {
    expect(
      resolveCefrAccordionRestore({
        lessonsPanel: 'a2',
        theoryLessonSource: 'tag_browse',
        selectedLessonId: '2',
      })
    ).toBe(null)
  })

  it('maps syllabus panels to theoryCefrLevels with expand from theoryTagBrowseLevel', () => {
    expect(
      resolveCefrAccordionRestore({
        lessonsPanel: 'referenceSyllabusThemes',
        theoryTagBrowseLevel: 'B2',
      })
    ).toEqual({
      lessonsPanel: 'theoryCefrLevels',
      expand: 'B2',
      selectedLessonId: null,
    })
  })
})

describe('resolveTagAccordionRestore', () => {
  it('maps theoryTagLessons to theoryTagLevels', () => {
    expect(
      resolveTagAccordionRestore({
        lessonsPanel: 'theoryTagLessons',
        theoryLessonSource: 'tag_browse',
        theoryTagBrowseLevel: 'A2',
        selectedLessonId: '3',
      })
    ).toEqual({
      lessonsPanel: 'theoryTagLevels',
      expand: 'A2',
      selectedLessonId: '3',
    })
  })

  it('maps a1/a2 + tag_browse to theoryTagLevels not CEFR', () => {
    expect(
      resolveTagAccordionRestore({
        lessonsPanel: 'a1',
        theoryLessonSource: 'tag_browse',
        selectedLessonId: '1',
      })
    ).toEqual({
      lessonsPanel: 'theoryTagLevels',
      expand: 'A1',
      selectedLessonId: '1',
    })
  })

  it('ignores cef_levels a1', () => {
    expect(
      resolveTagAccordionRestore({
        lessonsPanel: 'a1',
        theoryLessonSource: 'cef_levels',
      })
    ).toBe(null)
  })
})
