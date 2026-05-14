import { describe, expect, it } from 'vitest'
import { findTutorCatalogLessonCandidates, TUTOR_CATALOG_MIN_SCORE } from '@/lib/tutorCatalogMatch'

describe('findTutorCatalogLessonCandidates', () => {
  it('matches "Present" to present-simple catalog lesson via tag aliases', () => {
    const hits = findTutorCatalogLessonCandidates('Present', 'adult', 'a2')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]!.lessonId).toBe('4')
    expect(hits[0]!.score).toBeGreaterThanOrEqual(TUTOR_CATALOG_MIN_SCORE)
  })

  it('matches embedded questions phrasing to lesson 3', () => {
    const hits = findTutorCatalogLessonCandidates('вложенные вопросы', 'adult', 'a2')
    expect(hits.some((h) => h.lessonId === '3')).toBe(true)
  })

  it('matches who-style query to lesson 2', () => {
    const hits = findTutorCatalogLessonCandidates('who questions', 'child', 'a2')
    expect(hits.some((h) => h.lessonId === '2')).toBe(true)
  })

  it('returns empty for noise-like short non-grammar input', () => {
    const hits = findTutorCatalogLessonCandidates('xx', 'adult', 'a2')
    expect(hits).toEqual([])
  })
})
