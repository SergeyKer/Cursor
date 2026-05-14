import { describe, expect, it } from 'vitest'
import { findTheoryTagCandidatesGlobally, findTheoryTagCandidatesInCategory } from '@/lib/theoryTagSearch'

describe('theoryTagSearch', () => {
  it('finds present simple by Russian query in category', () => {
    const hits = findTheoryTagCandidatesInCategory('verbs_and_tenses', 'знакомство', 5)
    expect(hits.some((h) => h.tagId === 'present-simple')).toBe(true)
  })

  it('returns empty for blank query', () => {
    expect(findTheoryTagCandidatesInCategory('questions', '   ', 5)).toEqual([])
  })

  it('finds tag across categories by global query', () => {
    const hits = findTheoryTagCandidatesGlobally('вложенные', 8)
    expect(hits.some((h) => h.tagId === 'reported-speech')).toBe(true)
  })

  it('finds reported speech by English query globally', () => {
    const hits = findTheoryTagCandidatesGlobally('reported speech', 8)
    expect(hits.some((h) => h.tagId === 'reported-speech')).toBe(true)
  })

  it('returns empty for blank global query', () => {
    expect(findTheoryTagCandidatesGlobally('  ', 8)).toEqual([])
  })
})
