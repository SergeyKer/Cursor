import { describe, expect, it } from 'vitest'
import { extractLemmaMistake } from '@/lib/vocabulary/mistakesList'

describe('extractLemmaMistake', () => {
  it('allows near typo', () => {
    expect(extractLemmaMistake({ userText: 'circu', focusEn: 'circus' })).toBeNull()
  })

  it('flags code-switch cyrillic', () => {
    const hit = extractLemmaMistake({
      userText: 'I will prepare шашлык tomorrow',
      focusEn: 'shashlik',
      correctedEn: 'shashlik',
    })
    expect(hit?.en).toBe('shashlik')
  })

  it('passes when focus present', () => {
    expect(
      extractLemmaMistake({ userText: 'I love the circus', focusEn: 'circus' })
    ).toBeNull()
  })
})
