import { describe, expect, it } from 'vitest'
import { readReferenceLessonIdFromSearch } from '@/lib/reference/openReferenceIntent'

describe('readReferenceLessonIdFromSearch', () => {
  it('reads reference query', () => {
    expect(readReferenceLessonIdFromSearch('?reference=4')).toBe('4')
  })

  it('reads topic alias', () => {
    expect(readReferenceLessonIdFromSearch('topic=1')).toBe('1')
  })

  it('returns null when missing', () => {
    expect(readReferenceLessonIdFromSearch('')).toBeNull()
  })
})
