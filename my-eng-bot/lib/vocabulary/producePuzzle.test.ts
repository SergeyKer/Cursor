import { describe, expect, it } from 'vitest'
import {
  applyProduceResult,
  produceAccept,
  scrambleProduceLetters,
} from '@/lib/vocabulary/producePuzzle'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'

describe('producePuzzle', () => {
  it('accepts exact lemma ignoring case/spaces', () => {
    expect(produceAccept('Home', 'home')).toBe(true)
    expect(produceAccept('hom', 'home')).toBe(false)
  })

  it('scrambles letters and avoids identical order when possible', () => {
    const tiles = scrambleProduceLetters('cat', () => 0.9)
    expect(tiles.sort().join('')).toBe('act'.split('').sort().join(''))
    expect(tiles).toHaveLength(3)
  })

  it('applies +1 / -2 stage on produce', () => {
    const base = { ...createEmptyWordProgress(1), stage: 3 }
    expect(applyProduceResult(base, true).stage).toBe(4)
    expect(applyProduceResult(base, false).stage).toBe(1)
  })
})
