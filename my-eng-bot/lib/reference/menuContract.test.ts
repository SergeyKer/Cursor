import { describe, expect, it } from 'vitest'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'
import type { CatalogBrowseIntent } from '@/lib/reference/types'
import type { LessonsPanel } from '@/components/MenuSectionPanels'
import {
  resolveCefrAccordionRestore,
  resolveTagAccordionRestore,
} from '@/lib/menu/cefrLevelAccordion'

/** Mirrors MenuSectionPanels title resolution for regression. */
function resolveLessonsPanelTitle(
  lessonsPanel: LessonsPanel,
  intent: CatalogBrowseIntent
): string {
  const isReference = intent === 'reference'
  if (isReference) {
    if (lessonsPanel === 'theory') return REFERENCE_COPY.hubTitle
    if (lessonsPanel === 'theoryCefrLevels') return REFERENCE_COPY.byLevelLabel
    if (lessonsPanel === 'theoryTagLevels') return REFERENCE_COPY.tagLevelsTitle
    if (lessonsPanel === 'theoryTagLessons') return REFERENCE_COPY.tagLessonsTitle
  }
  if (lessonsPanel === 'theory') return 'Теория'
  if (lessonsPanel === 'theoryCefrLevels') return 'Уровни'
  if (lessonsPanel === 'summary') return 'Уроки'
  return lessonsPanel
}

function resolveTheoryHubBackTarget(intent: CatalogBrowseIntent): 'root' | 'summary' {
  return intent === 'reference' ? 'root' : 'summary'
}

describe('reference menu titles/back contract', () => {
  it('uses Справочник title in reference hub', () => {
    expect(resolveLessonsPanelTitle('theory', 'reference')).toBe(REFERENCE_COPY.hubTitle)
    expect(resolveLessonsPanelTitle('theory', 'lesson')).toBe('Теория')
  })

  it('CEFR levels title differs by browse intent', () => {
    expect(resolveLessonsPanelTitle('theoryCefrLevels', 'reference')).toBe(REFERENCE_COPY.byLevelLabel)
    expect(resolveLessonsPanelTitle('theoryCefrLevels', 'lesson')).toBe('Уровни')
  })

  it('back from reference hub goes to root, theory to summary', () => {
    expect(resolveTheoryHubBackTarget('reference')).toBe('root')
    expect(resolveTheoryHubBackTarget('lesson')).toBe('summary')
  })
})

describe('accordion restore branch discrimination', () => {
  it('cef and tag restores never claim the same a1 snapshot', () => {
    const cef = resolveCefrAccordionRestore({
      lessonsPanel: 'a1',
      theoryLessonSource: 'cef_levels',
      selectedLessonId: '4',
    })
    const tag = resolveTagAccordionRestore({
      lessonsPanel: 'a1',
      theoryLessonSource: 'tag_browse',
      selectedLessonId: '4',
    })
    expect(cef?.lessonsPanel).toBe('theoryCefrLevels')
    expect(tag?.lessonsPanel).toBe('theoryTagLevels')
    expect(resolveCefrAccordionRestore({ lessonsPanel: 'a1', theoryLessonSource: 'tag_browse' })).toBe(
      null
    )
    expect(resolveTagAccordionRestore({ lessonsPanel: 'a1', theoryLessonSource: 'cef_levels' })).toBe(
      null
    )
  })
})
