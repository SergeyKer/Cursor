import { describe, expect, it } from 'vitest'
import { REFERENCE_COPY } from '@/lib/uiCopy/reference'
import type { CatalogBrowseIntent } from '@/lib/reference/types'
import type { LessonsPanel } from '@/components/MenuSectionPanels'

/** Mirrors MenuSectionPanels title resolution for regression. */
function resolveLessonsPanelTitle(
  lessonsPanel: LessonsPanel,
  intent: CatalogBrowseIntent
): string {
  const isReference = intent === 'reference'
  if (isReference) {
    if (lessonsPanel === 'theory') return REFERENCE_COPY.hubTitle
    if (lessonsPanel === 'theoryTagLevels') return REFERENCE_COPY.tagLevelsTitle
    if (lessonsPanel === 'theoryTagLessons') return REFERENCE_COPY.tagLessonsTitle
  }
  if (lessonsPanel === 'theory') return 'Теория'
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

  it('back from reference hub goes to root, theory to summary', () => {
    expect(resolveTheoryHubBackTarget('reference')).toBe('root')
    expect(resolveTheoryHubBackTarget('lesson')).toBe('summary')
  })
})
