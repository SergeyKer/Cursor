import { describe, expect, it } from 'vitest'
import {
  LESSONS_HUB_ROW_IDS,
  resolveLessonsRootEntryPanel,
  resolveReferenceRootEntryPanel,
  resolveRootLessonsRestorePanel,
  resolveTheoryCefrLevelsBackTarget,
  resolveTheoryHubBackTarget,
  shouldForceLessonsSummaryOnRequest,
} from '@/lib/menu/lessonsEntry'

describe('lessonsEntry', () => {
  it('opens Уроки on the section hub, not CEFR levels', () => {
    expect(resolveLessonsRootEntryPanel()).toBe('summary')
    expect(shouldForceLessonsSummaryOnRequest()).toBe(false)
  })

  it('opens Справочник on theory hub, not the Уроки section list', () => {
    expect(resolveReferenceRootEntryPanel()).toBe('theory')
    expect(resolveRootLessonsRestorePanel('reference')).toBe('theory')
    expect(resolveRootLessonsRestorePanel('lesson')).toBe('summary')
  })

  it('backs lesson levels to hub and reference levels to theory', () => {
    expect(resolveTheoryCefrLevelsBackTarget('lesson')).toBe('summary')
    expect(resolveTheoryCefrLevelsBackTarget('reference')).toBe('theory')
  })

  it('backs theory hub to lessons hub for lessons and root for reference', () => {
    expect(resolveTheoryHubBackTarget('lesson')).toBe('summary')
    expect(resolveTheoryHubBackTarget('reference')).toBe('root')
  })

  it('keeps hub row ids with CEFR as the first item', () => {
    expect([...LESSONS_HUB_ROW_IDS]).toEqual([
      'cefrLevels',
      'words',
      'pronunciation',
      'tutor',
      'theoryByTag',
    ])
  })
})
