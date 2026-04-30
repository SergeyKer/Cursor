import { describe, expect, it } from 'vitest'
import { LocalPracticeStorage } from '@/lib/practice/storage/practiceStorage'

describe('LocalPracticeStorage', () => {
  it('is safe on the server when window storage is unavailable', () => {
    const storage = new LocalPracticeStorage()

    expect(storage.loadActiveSession()).toBeNull()
    expect(storage.listCompletedSessions()).toEqual([])
    expect(() => storage.clearActiveSession()).not.toThrow()
  })
})

