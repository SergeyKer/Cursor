import { describe, expect, it, vi } from 'vitest'
import { resolveMenuReferenceSearch } from '@/lib/reference/resolveMenuReferenceSearch'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: {
    referenceV1: true,
    referenceGenerate: false,
  },
}))

describe('resolveMenuReferenceSearch', () => {
  it('opens gold present continuous for is doing', async () => {
    const sheets: string[] = []
    const lessons: string[] = []
    const result = await resolveMenuReferenceSearch({
      query: 'is doing',
      openLocalLesson: (id) => {
        lessons.push(id)
      },
      openSheet: (sheet) => {
        sheets.push(sheet.id)
      },
    })
    expect(result.kind).toBe('opened')
    expect(sheets.length + lessons.length).toBe(1)
  })

  it('returns choose for get', async () => {
    const result = await resolveMenuReferenceSearch({
      query: 'get',
      openLocalLesson: () => {},
      openSheet: () => {},
    })
    expect(result.kind).toBe('choose')
    if (result.kind === 'choose') {
      expect(result.candidates.map((c) => c.topicKey).sort()).toEqual(['get_become', 'get_up'])
    }
  })

  it('miss soft when generate off', async () => {
    const result = await resolveMenuReferenceSearch({
      query: 'привет',
      openLocalLesson: () => {},
      openSheet: () => {},
    })
    expect(result.kind).toBe('miss')
  })
})
