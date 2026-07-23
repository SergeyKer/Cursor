import { describe, expect, it } from 'vitest'
import { dedupeReviewTopics } from '@/lib/engvo/callReview/dedupeReviewTopics'

describe('dedupeReviewTopics', () => {
  it('dedupes by id then title and caps at 3', () => {
    const topics = dedupeReviewTopics([
      { id: 'a', title: 'Past Simple — прошедшее' },
      { id: 'a', title: 'Past Simple — other' },
      { id: 'b', title: 'Articles' },
      { id: 'c', title: 'past simple — прошедшее' },
      { id: 'd', title: 'Present Simple' },
      { id: 'e', title: 'Extra' },
    ])
    expect(topics).toHaveLength(3)
    expect(topics.map((t) => t.id)).toEqual(['a', 'b', 'd'])
  })

  it('skips empty titles', () => {
    expect(dedupeReviewTopics([{ id: 'x', title: '  ' }])).toEqual([])
  })
})
