import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from '@/lib/start/branchDynamicLoading'

describe('isChunkLoadError', () => {
  it('detects ChunkLoadError by name', () => {
    const error = new Error('failed')
    error.name = 'ChunkLoadError'
    expect(isChunkLoadError(error)).toBe(true)
  })

  it('detects webpack chunk message', () => {
    expect(
      isChunkLoadError(
        new Error('Loading chunk _app-pages-browser_components_branches_HubBranch_tsx failed.')
      )
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('network'))).toBe(false)
    expect(isChunkLoadError('string')).toBe(false)
  })
})
