import { describe, expect, it } from 'vitest'
import {
  ENGVO_REALTIME_SESSION_TYPE,
  assertEngvoRealtimeSessionHasType,
  buildEngvoCallsApiSession,
  buildEngvoClientSessionUpdate,
} from './realtimeSession'

describe('buildEngvoCallsApiSession', () => {
  it('uses GA shape: voice under audio.output, no top-level voice', () => {
    const session = buildEngvoCallsApiSession({
      model: 'gpt-realtime-mini',
      voice: 'alloy',
      instructions: 'Speak English.',
    })
    expect(session.type).toBe(ENGVO_REALTIME_SESSION_TYPE)
    expect(session.model).toBe('gpt-realtime-mini')
    expect(session).not.toHaveProperty('voice')
    expect(session.audio.output.voice).toBe('alloy')
    expect(session.audio.input.transcription).toBeDefined()
    expect(session.audio.input.turn_detection.type).toBe('server_vad')
  })
})

describe('buildEngvoClientSessionUpdate', () => {
  it('uses GA shape with model and nested audio', () => {
    const session = buildEngvoClientSessionUpdate({
      model: 'gpt-realtime-mini',
      voice: 'marin',
      instructions: 'Hello.',
      inputAudioTranscription: { model: 'gpt-4o-mini-transcribe', language: 'ru' },
    })
    expect(session.type).toBe(ENGVO_REALTIME_SESSION_TYPE)
    expect(session.model).toBe('gpt-realtime-mini')
    expect(session.output_modalities).toEqual(['audio'])
    expect(session).not.toHaveProperty('voice')
    expect(session.audio.output).toEqual({ voice: 'marin' })
    expect(session.audio.input.transcription).toEqual({
      model: 'gpt-4o-mini-transcribe',
      language: 'ru',
    })
  })

  it('omits audio.output when voice not provided', () => {
    const session = buildEngvoClientSessionUpdate({
      model: 'gpt-realtime-mini',
      instructions: 'Hello.',
    })
    expect(session.type).toBe(ENGVO_REALTIME_SESSION_TYPE)
    expect(session.audio.input).toBeDefined()
    expect(session.audio.output).toBeUndefined()
  })
})

describe('assertEngvoRealtimeSessionHasType', () => {
  it('throws when type is missing', () => {
    expect(() => assertEngvoRealtimeSessionHasType({ model: 'x' })).toThrow(/type/)
  })
})
