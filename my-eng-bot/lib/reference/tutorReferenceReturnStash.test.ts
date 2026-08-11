import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearTutorReferenceReturnStashForTests,
  peekTutorReferenceReturnStash,
  setTutorReferenceReturnStash,
  takeTutorReferenceReturnStash,
} from '@/lib/reference/tutorReferenceReturnStash'

describe('tutorReferenceReturnStash', () => {
  beforeEach(() => {
    clearTutorReferenceReturnStashForTests()
  })

  it('sets peeks and takes', () => {
    expect(peekTutorReferenceReturnStash()).toBeNull()
    setTutorReferenceReturnStash({ searchQuery: '  be invited  ' })
    expect(peekTutorReferenceReturnStash()).toEqual({ searchQuery: 'be invited' })
    expect(takeTutorReferenceReturnStash()).toEqual({ searchQuery: 'be invited' })
    expect(peekTutorReferenceReturnStash()).toBeNull()
  })

  it('clear via set null', () => {
    setTutorReferenceReturnStash({ searchQuery: 'x' })
    setTutorReferenceReturnStash(null)
    expect(peekTutorReferenceReturnStash()).toBeNull()
  })
})
