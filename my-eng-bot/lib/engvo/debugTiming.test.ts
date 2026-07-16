import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEngvoDebugTimingState,
  isEngvoFirstAudioDeltaEvent,
  logEngvoDebugFirstAudioDelta,
  logEngvoDebugTimingEvent,
  markEngvoDebugTimingOrigin,
  recordEngvoDebugSessionUpdate,
  resetEngvoDebugTimingState,
} from './debugTiming'

describe('Engvo debug timing', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENGVO_DEBUG_TIMING

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENGVO_DEBUG_TIMING = '1'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENGVO_DEBUG_TIMING = originalEnv
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('tracks session.update count until first audio delta', () => {
    const state = createEngvoDebugTimingState()
    markEngvoDebugTimingOrigin(state)
    recordEngvoDebugSessionUpdate(state)
    recordEngvoDebugSessionUpdate(state)

    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.setSystemTime(new Date('2026-01-01T00:00:01.500Z'))
    logEngvoDebugFirstAudioDelta(state)

    expect(state.sessionUpdateCountBeforeFirstAudio).toBe(2)
    expect(info).toHaveBeenCalledWith(
      '[engvo][timing] +1500ms event=first_audio_delta summary: updates=2, firstAudio=1500ms'
    )
    recordEngvoDebugSessionUpdate(state)
    expect(state.sessionUpdateCountBeforeFirstAudio).toBe(2)
  })

  it('logs timing events relative to origin', () => {
    const state = createEngvoDebugTimingState()
    markEngvoDebugTimingOrigin(state)
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.setSystemTime(new Date('2026-01-01T00:00:00.250Z'))
    logEngvoDebugTimingEvent(state, 'session.created')
    expect(info).toHaveBeenCalledWith('[engvo][timing] +250ms event=session.created')
  })

  it('reset clears origin and counters', () => {
    const state = createEngvoDebugTimingState()
    markEngvoDebugTimingOrigin(state)
    recordEngvoDebugSessionUpdate(state)
    resetEngvoDebugTimingState(state)
    expect(state.t0).toBeNull()
    expect(state.sessionUpdateCountBeforeFirstAudio).toBe(0)
    expect(state.firstAudioLogged).toBe(false)
  })

  it('recognizes first audio delta event types', () => {
    expect(isEngvoFirstAudioDeltaEvent('response.output_audio.delta')).toBe(true)
    expect(isEngvoFirstAudioDeltaEvent('response.audio.delta')).toBe(true)
    expect(isEngvoFirstAudioDeltaEvent('response.created')).toBe(false)
  })
})
