import { describe, expect, it } from 'vitest'
import { ACCENT_SECTIONS, RUSSIAN_SPEAKER_GROUPS, getAccentLessonById } from '@/lib/accent/soundCatalog'
import { ALL_ACCENT_LESSONS } from '@/lib/accent/staticContent'

describe('soundCatalog', () => {
  it('ships the full local 48 lesson library', () => {
    expect(ALL_ACCENT_LESSONS).toHaveLength(48)
    expect(new Set(ALL_ACCENT_LESSONS.map((lesson) => lesson.id)).size).toBe(48)
  })

  it('keeps every section linked to existing lessons', () => {
    const allIds = new Set(ALL_ACCENT_LESSONS.map((lesson) => lesson.id))
    expect(ACCENT_SECTIONS.length).toBeGreaterThanOrEqual(10)
    for (const section of ACCENT_SECTIONS) {
      expect(section.lessonIds.length).toBeGreaterThan(0)
      for (const lessonId of section.lessonIds) {
        expect(allIds.has(lessonId)).toBe(true)
      }
    }
  })

  it('exposes the russian-speaker path to TH think', () => {
    const thGroup = RUSSIAN_SPEAKER_GROUPS.find((group) => group.id === 'th-marker')
    expect(thGroup?.lessonIds).toContain('th-think')
    expect(getAccentLessonById('th-think')?.title).toBe('TH think')
  })
})
