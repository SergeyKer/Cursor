import { describe, expect, it } from 'vitest'
import { getAllTheoryTagsForMenu } from '@/lib/lessonTheoryTags'
import { getReferenceSyllabusTopics } from '@/lib/reference/syllabus'

describe('reference menu contract', () => {
  it('keeps syllabus themes separate from Theory tags', () => {
    const syllabusKeys = new Set(getReferenceSyllabusTopics().map((topic) => topic.topicKey))
    const theoryTagIds = getAllTheoryTagsForMenu().map((tag) => tag.id)

    expect(syllabusKeys.size).toBeGreaterThan(6)
    expect(syllabusKeys.size).not.toBe(theoryTagIds.length)
  })

  it('keeps the six Theory menu tag ids stable', () => {
    expect(getAllTheoryTagsForMenu().map((tag) => tag.id).sort()).toEqual([
      'formal-it',
      'present-simple',
      'reported-speech',
      'special-questions',
      'subject-questions',
      'word-order',
    ])
  })
})
