import { describe, expect, it } from 'vitest'
import { splitFooterStaticSegments } from '@/lib/footerStaticSegments'

describe('splitFooterStaticSegments', () => {
  it('returns empty array for blank input', () => {
    expect(splitFooterStaticSegments('')).toEqual([])
    expect(splitFooterStaticSegments('   ')).toEqual([])
  })

  it('returns single segment when there is no pipe', () => {
    expect(splitFooterStaticSegments('Теория')).toEqual(['Теория'])
  })

  it('splits on pipe with optional spaces', () => {
    expect(splitFooterStaticSegments('Шаг 1/7 | 0 XP | COMBO x0')).toEqual(['Шаг 1/7', '0 XP', 'COMBO x0'])
    expect(splitFooterStaticSegments('a|b')).toEqual(['a', 'b'])
    expect(splitFooterStaticSegments('a | b')).toEqual(['a', 'b'])
  })

  it('trims outer and inner whitespace', () => {
    expect(splitFooterStaticSegments('  x  |  y  ')).toEqual(['x', 'y'])
  })
})
