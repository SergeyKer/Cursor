import { describe, expect, it } from 'vitest'
import { resolveGlobalLessonXpDelta } from '@/lib/lessonGlobalXpAward'

describe('resolveGlobalLessonXpDelta', () => {
  it('awards full session on first ideal run', () => {
    expect(
      resolveGlobalLessonXpDelta({
        sessionTotalXp: 170,
        previousBestTotalXp: 0,
        alreadyAwardedThisRun: 0,
      })
    ).toEqual({ amount: 170, entitledTotal: 170 })
  })

  it('awards zero when repeating same score', () => {
    expect(
      resolveGlobalLessonXpDelta({
        sessionTotalXp: 170,
        previousBestTotalXp: 170,
        alreadyAwardedThisRun: 0,
      })
    ).toEqual({ amount: 0, entitledTotal: 0 })
  })

  it('awards only improvement delta', () => {
    expect(
      resolveGlobalLessonXpDelta({
        sessionTotalXp: 130,
        previousBestTotalXp: 100,
        alreadyAwardedThisRun: 0,
      })
    ).toEqual({ amount: 30, entitledTotal: 30 })
  })

  it('increments alreadyAwarded across steps', () => {
    const first = resolveGlobalLessonXpDelta({
      sessionTotalXp: 130,
      previousBestTotalXp: 100,
      alreadyAwardedThisRun: 0,
    })
    expect(first).toEqual({ amount: 30, entitledTotal: 30 })

    const second = resolveGlobalLessonXpDelta({
      sessionTotalXp: 130,
      previousBestTotalXp: 100,
      alreadyAwardedThisRun: 30,
    })
    expect(second).toEqual({ amount: 0, entitledTotal: 30 })
  })

  it('returns zero when session below previous best', () => {
    expect(
      resolveGlobalLessonXpDelta({
        sessionTotalXp: 80,
        previousBestTotalXp: 170,
        alreadyAwardedThisRun: 0,
      })
    ).toEqual({ amount: 0, entitledTotal: 0 })
  })
})
