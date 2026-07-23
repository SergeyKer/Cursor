import { describe, expect, it } from 'vitest'
import { pickSoftFocusKey, pushRecentSoftKey } from '@/lib/myPlan/softFocusRotation'

describe('softFocusRotation', () => {
  it('picks first when recent empty', () => {
    expect(pickSoftFocusKey(['a', 'b', 'c'], [])).toBe('a')
  })

  it('skips recent keys', () => {
    expect(pickSoftFocusKey(['a', 'b', 'c'], ['a', 'b'])).toBe('c')
  })

  it('resets when all excluded', () => {
    expect(pickSoftFocusKey(['a', 'b'], ['a', 'b'])).toBe('a')
  })

  it('pushRecentSoftKey keeps newest first and caps', () => {
    expect(pushRecentSoftKey(['b', 'c'], 'a', 3)).toEqual(['a', 'b', 'c'])
    expect(pushRecentSoftKey(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b'])
    expect(pushRecentSoftKey(['a', 'b'], 'a', 3)).toEqual(['a', 'b'])
  })
})
