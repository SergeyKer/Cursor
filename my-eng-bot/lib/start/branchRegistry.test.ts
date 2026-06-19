import { describe, expect, it, vi } from 'vitest'
import { BRANCH_IDS, branchLoaders, prefetchBranch, prefetchBranches } from '@/lib/start/branchRegistry'

describe('branchRegistry', () => {
  it('exposes all seven branch ids', () => {
    expect(BRANCH_IDS).toEqual([
      'hub',
      'chat',
      'lesson',
      'practice',
      'engvo',
      'accent',
      'vocabulary',
    ])
  })

  it('prefetchBranch invokes loader', async () => {
    const loader = vi.fn(async () => ({}))
    const original = branchLoaders.engvo
    branchLoaders.engvo = loader
    try {
      prefetchBranch('engvo')
      await Promise.resolve()
      expect(loader).toHaveBeenCalledTimes(1)
    } finally {
      branchLoaders.engvo = original
    }
  })

  it('prefetchBranches invokes each loader', async () => {
    const loader = vi.fn(async () => ({}))
    const original = branchLoaders.accent
    branchLoaders.accent = loader
    try {
      prefetchBranches(['accent'])
      await Promise.resolve()
      expect(loader).toHaveBeenCalledTimes(1)
    } finally {
      branchLoaders.accent = original
    }
  })
})
