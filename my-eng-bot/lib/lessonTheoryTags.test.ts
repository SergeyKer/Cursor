import { describe, expect, it } from 'vitest'
import {
  getGrammarCategoriesForMenu,
  getTheoryLessonsByTagGroupedByLevel,
  getTheoryTagsForCategory,
} from '@/lib/lessonTheoryTags'

describe('lessonTheoryTags', () => {
  it('exposes grammar categories that have theory-tagged lessons', () => {
    const cats = getGrammarCategoriesForMenu()
    const ids = cats.map((c) => c.id).sort()
    expect(ids).toContain('verbs_and_tenses')
    expect(ids).toContain('questions')
    expect(ids).toContain('sentence_structure')
    expect(ids).toContain('voice_and_clauses')
  })

  it('lists tags per category from catalog', () => {
    expect(getTheoryTagsForCategory('verbs_and_tenses').map((t) => t.id)).toContain('present-simple')
    const questions = getTheoryTagsForCategory('questions').map((t) => t.id).sort()
    expect(questions).toEqual(['special-questions', 'subject-questions'])
  })

  it('groups lessons by level for a tag', () => {
    const grouped = getTheoryLessonsByTagGroupedByLevel('present-simple')
    expect(grouped.A1?.map((t) => t.id)).toEqual(['4'])
  })

  it('maps Who lesson under both question tags', () => {
    expect(getTheoryLessonsByTagGroupedByLevel('special-questions')?.A2?.map((t) => t.id)).toEqual(['2'])
    expect(getTheoryLessonsByTagGroupedByLevel('subject-questions')?.A2?.map((t) => t.id)).toEqual(['2'])
  })

  it('maps embedded-style lesson under reported speech and word order', () => {
    expect(getTheoryLessonsByTagGroupedByLevel('reported-speech')?.A2?.map((t) => t.id)).toEqual(['3'])
    expect(getTheoryLessonsByTagGroupedByLevel('word-order')?.A2?.map((t) => t.id)).toEqual(['3'])
  })
})
