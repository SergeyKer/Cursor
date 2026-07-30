import { describe, expect, it, beforeEach } from 'vitest'
import { clearTutorStorageMemoryForTests } from '@/lib/tutor/storageAdapter'
import { buildIdleFaqFilters } from '@/lib/tutor/localFaq/idlePickContext'
import { clearShownFaqForTests, recordShownFaqIds, listShownFaqIds } from '@/lib/tutor/localFaq'

describe('buildIdleFaqFilters', () => {
  beforeEach(() => {
    clearTutorStorageMemoryForTests()
    clearShownFaqForTests()
  })

  it('returns shown ids from store on client-like memory adapter', () => {
    recordShownFaqIds(['a1.to_be.001'])
    const filters = buildIdleFaqFilters()
    // In vitest node, window is undefined → empty filters (SSR-safe).
    if (typeof window === 'undefined') {
      expect(filters).toEqual({ shownIds: [], bannedTopicKeys: [], boostTopicKeys: [] })
      expect(listShownFaqIds()).toEqual(['a1.to_be.001'])
    } else {
      expect(filters.shownIds).toContain('a1.to_be.001')
    }
  })
})
