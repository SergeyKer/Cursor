import { describe, expect, it } from 'vitest'
import { needsTutorMicroSessionExitGuard } from '@/lib/tutor/needsTutorMicroSessionExitGuard'

describe('needsTutorMicroSessionExitGuard', () => {
  it('is true while loading micro pack', () => {
    expect(
      needsTutorMicroSessionExitGuard({ loadingMicro: true, microPhase: 'idle' })
    ).toBe(true)
  })

  it('is true for revealing and active phases', () => {
    expect(
      needsTutorMicroSessionExitGuard({ loadingMicro: false, microPhase: 'revealing' })
    ).toBe(true)
    expect(
      needsTutorMicroSessionExitGuard({ loadingMicro: false, microPhase: 'active' })
    ).toBe(true)
  })

  it('is false for idle and finale when not loading', () => {
    expect(
      needsTutorMicroSessionExitGuard({ loadingMicro: false, microPhase: 'idle' })
    ).toBe(false)
    expect(
      needsTutorMicroSessionExitGuard({ loadingMicro: false, microPhase: 'finale' })
    ).toBe(false)
  })
})
