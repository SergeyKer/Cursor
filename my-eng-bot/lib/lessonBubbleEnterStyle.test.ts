import { describe, expect, it } from 'vitest'
import { resolveDetachedSectionEnterStyle } from '@/lib/lessonBubbleEnterStyle'

describe('resolveDetachedSectionEnterStyle', () => {
  it('reading mode returns undefined (no both+delay hide)', () => {
    expect(
      resolveDetachedSectionEnterStyle({
        enterMode: 'reading',
        shouldAnimate: true,
        useStaggeredReveal: false,
        bubbleIndex: 2,
      })
    ).toBeUndefined()
  })

  it('default mode keeps both + delay', () => {
    expect(
      resolveDetachedSectionEnterStyle({
        enterMode: 'default',
        shouldAnimate: true,
        useStaggeredReveal: false,
        bubbleIndex: 2,
      })
    ).toEqual({
      animationDelay: '160ms',
      animationDuration: undefined,
      animationFillMode: 'both',
    })
  })
})
