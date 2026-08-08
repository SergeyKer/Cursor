import { describe, expect, it } from 'vitest'
import {
  followUpLegacyFlags,
  initialFollowUpHopState,
  nextFollowUpHopState,
  resolveFollowUpHopFromSnapshot,
  visibleFollowUpHop,
} from '@/lib/tutor/followUpHop'

describe('nextFollowUpHopState', () => {
  it('newExplain → hop 1', () => {
    const next = nextFollowUpHopState(initialFollowUpHopState(), { type: 'newExplain' })
    expect(next).toEqual({ hop: 1, awaitingHop2: false })
    expect(visibleFollowUpHop(next)).toBe(1)
  })

  it('tap thematic hop1 → awaiting; continueOk → hop 2', () => {
    let s = nextFollowUpHopState(initialFollowUpHopState(), { type: 'newExplain' })
    s = nextFollowUpHopState(s, { type: 'tapFollowUp', hop1WasExit: false })
    expect(s).toEqual({ hop: 0, awaitingHop2: true })
    expect(visibleFollowUpHop(s)).toBe(0)
    s = nextFollowUpHopState(s, { type: 'continueExplainOk' })
    expect(s).toEqual({ hop: 2, awaitingHop2: false })
    expect(visibleFollowUpHop(s)).toBe(2)
  })

  it('tap exit hop1 → 0 without hop2', () => {
    let s = nextFollowUpHopState(initialFollowUpHopState(), { type: 'newExplain' })
    s = nextFollowUpHopState(s, { type: 'tapFollowUp', hop1WasExit: true })
    expect(s).toEqual({ hop: 0, awaitingHop2: false })
    s = nextFollowUpHopState(s, { type: 'continueExplainOk' })
    expect(s.hop).toBe(0)
  })

  it('tap hop2 → 0', () => {
    let s = { hop: 2 as const, awaitingHop2: false }
    s = nextFollowUpHopState(s, { type: 'tapFollowUp', hop1WasExit: false })
    expect(s).toEqual({ hop: 0, awaitingHop2: false })
  })

  it('continueExplainFail clears awaiting', () => {
    const s = nextFollowUpHopState(
      { hop: 0, awaitingHop2: true },
      { type: 'continueExplainFail' }
    )
    expect(s).toEqual({ hop: 0, awaitingHop2: false })
  })

  it('userTypedOwn clears', () => {
    const s = nextFollowUpHopState({ hop: 1, awaitingHop2: false }, { type: 'userTypedOwn' })
    expect(s).toEqual({ hop: 0, awaitingHop2: false })
  })
})

describe('resolveFollowUpHopFromSnapshot', () => {
  it('prefers explicit followUpHop', () => {
    expect(
      resolveFollowUpHopFromSnapshot({
        followUpHop: 2,
        followUpNudgeConsumed: true,
        followUpNudgeArmed: true,
      })
    ).toEqual({ hop: 2, awaitingHop2: false })
  })

  it('legacy consumed → 0', () => {
    expect(
      resolveFollowUpHopFromSnapshot({
        followUpNudgeConsumed: true,
        followUpNudgeArmed: true,
      })
    ).toEqual({ hop: 0, awaitingHop2: false })
  })

  it('legacy armed only → 1', () => {
    expect(
      resolveFollowUpHopFromSnapshot({
        followUpNudgeConsumed: false,
        followUpNudgeArmed: true,
      })
    ).toEqual({ hop: 1, awaitingHop2: false })
  })
})

describe('followUpLegacyFlags', () => {
  it('maps hop1 / hop2 / awaiting', () => {
    expect(followUpLegacyFlags({ hop: 1, awaitingHop2: false })).toEqual({
      followUpNudgeArmed: true,
      followUpNudgeConsumed: false,
    })
    expect(followUpLegacyFlags({ hop: 2, awaitingHop2: false })).toEqual({
      followUpNudgeArmed: true,
      followUpNudgeConsumed: false,
    })
    expect(followUpLegacyFlags({ hop: 0, awaitingHop2: true })).toEqual({
      followUpNudgeArmed: true,
      followUpNudgeConsumed: true,
    })
    expect(followUpLegacyFlags({ hop: 0, awaitingHop2: false })).toEqual({
      followUpNudgeArmed: false,
      followUpNudgeConsumed: true,
    })
  })
})
