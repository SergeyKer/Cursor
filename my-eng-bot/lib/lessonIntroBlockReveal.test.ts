import { describe, expect, it } from 'vitest'
import {
  resolveIntroBlockChipsVisible,
  resolveIntroBlockTaskCardReached,
} from '@/lib/lessonIntroBlockReveal'

const baseRevealParams = {
  revealEnabled: true,
  taskBubbleIndex: 2,
  isRevealInitializedForKey: true,
  isShellEnterActive: false,
  textRevealedThroughIndex: 1,
  textAnimatingIndex: null as number | null,
}

describe('resolveIntroBlockTaskCardReached', () => {
  it('shows strip during pause between theory and task', () => {
    expect(resolveIntroBlockTaskCardReached(baseRevealParams)).toBe(true)
  })

  it('shows strip while section before task is animating', () => {
    expect(
      resolveIntroBlockTaskCardReached({
        ...baseRevealParams,
        textRevealedThroughIndex: 0,
        textAnimatingIndex: 1,
      })
    ).toBe(true)
  })

  it('shows strip during shell enter after init', () => {
    expect(
      resolveIntroBlockTaskCardReached({
        ...baseRevealParams,
        isShellEnterActive: true,
        textRevealedThroughIndex: -1,
        textAnimatingIndex: null,
      })
    ).toBe(true)
  })

  it('shows strip from first text section reveal', () => {
    expect(
      resolveIntroBlockTaskCardReached({
        ...baseRevealParams,
        textRevealedThroughIndex: 0,
        textAnimatingIndex: 0,
      })
    ).toBe(true)
  })

  it('hides strip before reveal init', () => {
    expect(
      resolveIntroBlockTaskCardReached({
        ...baseRevealParams,
        isRevealInitializedForKey: false,
        textRevealedThroughIndex: -1,
      })
    ).toBe(false)
  })

  it('shows strip when reveal is disabled', () => {
    expect(
      resolveIntroBlockTaskCardReached({
        ...baseRevealParams,
        revealEnabled: false,
      })
    ).toBe(true)
  })
})

describe('resolveIntroBlockChipsVisible', () => {
  it('hides chips during pause between theory and task', () => {
    expect(
      resolveIntroBlockChipsVisible({
        ...baseRevealParams,
        stripVisible: true,
      })
    ).toBe(false)
  })

  it('shows chips when task text starts animating', () => {
    expect(
      resolveIntroBlockChipsVisible({
        ...baseRevealParams,
        stripVisible: true,
        textAnimatingIndex: 2,
      })
    ).toBe(true)
  })

  it('shows chips after task text is fully revealed', () => {
    expect(
      resolveIntroBlockChipsVisible({
        ...baseRevealParams,
        stripVisible: true,
        textRevealedThroughIndex: 2,
      })
    ).toBe(true)
  })
})
