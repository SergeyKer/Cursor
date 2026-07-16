import { describe, expect, it } from 'vitest'
import { shouldShowPracticeFinaleComposer } from '@/lib/quickTest/shouldShowPracticeFinaleComposer'

describe('shouldShowPracticeFinaleComposer', () => {
  it('hides for quick test completed', () => {
    expect(
      shouldShowPracticeFinaleComposer({ entrySource: 'quick_test' }, 'completed')
    ).toBe(false)
  })

  it('shows for practice completed', () => {
    expect(
      shouldShowPracticeFinaleComposer({ entrySource: 'menu' }, 'completed')
    ).toBe(true)
  })

  it('hides when not completed', () => {
    expect(shouldShowPracticeFinaleComposer({ entrySource: 'menu' }, 'active')).toBe(
      false
    )
  })
})
