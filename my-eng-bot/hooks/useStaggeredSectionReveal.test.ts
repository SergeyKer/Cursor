import { describe, expect, it } from 'vitest'
import { isStaggeredRevealComplete } from './useStaggeredSectionReveal'

describe('isStaggeredRevealComplete', () => {
  it('returns true when every target reached its section count', () => {
    expect(
      isStaggeredRevealComplete(
        { 'intro-main': 4, details: 3 },
        [
          { id: 'intro-main', sectionCount: 4 },
          { id: 'details', sectionCount: 3 },
        ]
      )
    ).toBe(true)
  })

  it('returns false while intro sections are still revealing', () => {
    expect(
      isStaggeredRevealComplete({ 'intro-main': 2 }, [{ id: 'intro-main', sectionCount: 4 }])
    ).toBe(false)
  })
})
