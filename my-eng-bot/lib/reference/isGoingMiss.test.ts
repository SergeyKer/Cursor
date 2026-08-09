import { describe, expect, it, vi } from 'vitest'
import { resolveMenuReferenceSearch } from '@/lib/reference/resolveMenuReferenceSearch'
import { resolveReferenceOpen } from '@/lib/reference/resolveReferenceOpen'
import { findReferenceTopicCandidates } from '@/lib/reference/findReferenceTopicCandidates'

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { referenceV1: true, referenceGenerate: false },
}))

describe('is going miss path', () => {
  it('does not open I am lesson; menu miss for tutor CTA', async () => {
    const r = resolveReferenceOpen({ rawQuery: 'is going' })
    expect(r.kind).not.toBe('open')
    expect(findReferenceTopicCandidates('is going', 'adult', 8)).toEqual([])
    const menu = await resolveMenuReferenceSearch({
      query: 'is going',
      openLocalLesson: () => {},
      openSheet: () => {},
    })
    expect(menu.kind).toBe('miss')
  })
})
