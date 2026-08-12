import { describe, expect, it } from 'vitest'
import {
  applyProduceResult,
  isProduceFilled,
  produceAccept,
  produceTargetLength,
  returnProduceLetter,
  scrambleProduceLetters,
  selectProduceLetter,
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

  it('selects by tile index and ignores when filled', () => {
    const target = 'bee'
    const targetLen = produceTargetLength(target)
    const step1 = selectProduceLetter(['b', 'e', 'e'], [], 'b', 0, targetLen)
    expect(step1).toEqual({ tiles: ['e', 'e'], selected: ['b'] })

    const step2 = selectProduceLetter(step1.tiles, step1.selected, 'e', 0, targetLen)
    const step3 = selectProduceLetter(step2.tiles, step2.selected, 'e', 0, targetLen)
    expect(step3.selected).toEqual(['b', 'e', 'e'])
    expect(step3.tiles).toEqual([])
    expect(isProduceFilled(step3.selected, target)).toBe(true)

    const blocked = selectProduceLetter(step3.tiles, step3.selected, 'x', 0, targetLen)
    expect(blocked).toEqual(step3)
  })

  it('returns a slot letter to the end of the bank (duplicate-safe)', () => {
    const selected = ['l', 'e', 't', 't']
    const tiles = ['e', 'r']
    const next = returnProduceLetter(tiles, selected, 2)
    expect(next.selected).toEqual(['l', 'e', 't'])
    expect(next.tiles).toEqual(['e', 'r', 't'])
  })

  it('accepts joined selected letters for Health', () => {
    const selected = ['H', 'e', 'a', 'l', 't', 'h']
    expect(isProduceFilled(selected, 'Health')).toBe(true)
    expect(produceAccept(selected.join(''), 'Health')).toBe(true)
  })
})
