export function isEngvoDebugTimingEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENGVO_DEBUG_TIMING === '1'
}

export type EngvoDebugTimingState = {
  t0: number | null
  sessionUpdateCountBeforeFirstAudio: number
  firstAudioLogged: boolean
}

export function createEngvoDebugTimingState(): EngvoDebugTimingState {
  return { t0: null, sessionUpdateCountBeforeFirstAudio: 0, firstAudioLogged: false }
}

export function resetEngvoDebugTimingState(state: EngvoDebugTimingState): void {
  state.t0 = null
  state.sessionUpdateCountBeforeFirstAudio = 0
  state.firstAudioLogged = false
}

export function markEngvoDebugTimingOrigin(state: EngvoDebugTimingState): void {
  if (!isEngvoDebugTimingEnabled()) return
  state.t0 = Date.now()
  state.sessionUpdateCountBeforeFirstAudio = 0
  state.firstAudioLogged = false
}

export function recordEngvoDebugSessionUpdate(state: EngvoDebugTimingState): void {
  if (!isEngvoDebugTimingEnabled() || state.firstAudioLogged) return
  state.sessionUpdateCountBeforeFirstAudio += 1
}

export function logEngvoDebugTimingEvent(state: EngvoDebugTimingState, event: string): void {
  if (!isEngvoDebugTimingEnabled() || state.t0 === null) return
  const ms = Date.now() - state.t0
  console.info(`[engvo][timing] +${ms}ms event=${event}`)
}

export function logEngvoDebugFirstAudioDelta(state: EngvoDebugTimingState): void {
  if (!isEngvoDebugTimingEnabled() || state.firstAudioLogged || state.t0 === null) return
  state.firstAudioLogged = true
  const ms = Date.now() - state.t0
  console.info(
    `[engvo][timing] +${ms}ms event=first_audio_delta summary: updates=${state.sessionUpdateCountBeforeFirstAudio}, firstAudio=${ms}ms`
  )
}

export function isEngvoFirstAudioDeltaEvent(type: string | undefined): boolean {
  return type === 'response.output_audio.delta' || type === 'response.audio.delta'
}
