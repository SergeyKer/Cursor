import { describe, expect, it } from 'vitest'
import { getTheoryLessonsForTagIdsUnion, groupTheoryLessonsByLevel } from '@/lib/theoryLessonsByTagIds'

describe('getTheoryLessonsForTagIdsUnion', () => {
  it('returns empty for empty tag list', () => {
    expect(getTheoryLessonsForTagIdsUnion([])).toEqual([])
  })

  it('returns lessons for single tag', () => {
    const lessons = getTheoryLessonsForTagIdsUnion(['present-simple'])
    expect(lessons.map((l) => l.id)).toEqual(['4'])
  })

  it('dedupes when multiple tags hit same lesson', () => {
    const lessons = getTheoryLessonsForTagIdsUnion(['reported-speech', 'word-order'])
    expect(lessons.map((l) => l.id)).toEqual(['3'])
  })

  it('merges distinct lessons and sorts by level then order', () => {
    const lessons = getTheoryLessonsForTagIdsUnion(['present-simple', 'special-questions'])
    expect(lessons.map((l) => l.id)).toEqual(['4', '2'])
  })
})

describe('groupTheoryLessonsByLevel', () => {
  it('groups flat list by level and sorts by order within level', () => {
    const flat = getTheoryLessonsForTagIdsUnion(['present-simple', 'special-questions'])
    const grouped = groupTheoryLessonsByLevel(flat)
    const roundTrip = (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).flatMap((lvl) => grouped[lvl]?.map((l) => l.id) ?? [])
    expect(roundTrip.sort()).toEqual(flat.map((l) => l.id).sort())
    for (const lvl of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
      const bucket = grouped[lvl]
      if (!bucket || bucket.length < 2) continue
      const orders = bucket.map((l) => l.order)
      expect([...orders].sort((a, b) => a - b)).toEqual(orders)
    }
  })
})
