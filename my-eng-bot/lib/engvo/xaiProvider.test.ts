import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  clampEngvoRealtimeSpeed,
  ENGVO_XAI_CLASSIC_VOICES,
  ENGVO_XAI_NEW_VOICES,
  ENGVO_XAI_VOICES,
  getEngvoDefaultVoice,
  getEngvoXaiVoiceSection,
  isEngvoVoiceForProvider,
  shouldSendOutputAudioBufferClear,
} from './constants'
import {
  loadEngvoProvider,
  loadEngvoXaiVoice,
  saveEngvoProvider,
  saveEngvoXaiVoice,
} from './preferences'
import { buildEngvoXaiClientSessionUpdate } from './realtimeSession'
import { getEngvoStopPlaybackEvents } from './xaiRealtimeTransport'
import { normalizeEngvoRealtimeServerEvent } from './normalizeRealtimeEvent'

describe('Engvo xAI voices and clamp', () => {
  it('has Classic 5 + New 21 = 26 without overlap', () => {
    expect(ENGVO_XAI_CLASSIC_VOICES).toHaveLength(5)
    expect(ENGVO_XAI_NEW_VOICES).toHaveLength(21)
    expect(ENGVO_XAI_VOICES).toHaveLength(26)
    const set = new Set(ENGVO_XAI_VOICES)
    expect(set.size).toBe(26)
    for (const v of ENGVO_XAI_CLASSIC_VOICES) {
      expect(ENGVO_XAI_NEW_VOICES).not.toContain(v)
      expect(getEngvoXaiVoiceSection(v)).toBe('classic')
    }
    for (const v of ENGVO_XAI_NEW_VOICES) {
      expect(getEngvoXaiVoiceSection(v)).toBe('new')
    }
  })

  it('clamps xAI speed to 0.7–1.5 and OpenAI to 0.25–1.5', () => {
    expect(clampEngvoRealtimeSpeed(0.69, 'xai')).toBe(0.7)
    expect(clampEngvoRealtimeSpeed(1.6, 'xai')).toBe(1.5)
    expect(clampEngvoRealtimeSpeed(0.8, 'xai')).toBe(0.8)
    expect(clampEngvoRealtimeSpeed(0, 'openai')).toBe(0.25)
    expect(clampEngvoRealtimeSpeed(2, 'openai')).toBe(1.5)
  })

  it('validates voices per provider', () => {
    expect(isEngvoVoiceForProvider('openai', 'marin')).toBe(true)
    expect(isEngvoVoiceForProvider('openai', 'eve')).toBe(false)
    expect(isEngvoVoiceForProvider('xai', 'eve')).toBe(true)
    expect(isEngvoVoiceForProvider('xai', 'marin')).toBe(false)
    expect(getEngvoDefaultVoice('openai')).toBe('marin')
    expect(getEngvoDefaultVoice('xai')).toBe('luna')
  })

  it('stop policy differs by provider', () => {
    expect(shouldSendOutputAudioBufferClear('openai')).toBe(true)
    expect(shouldSendOutputAudioBufferClear('xai')).toBe(false)
    expect(getEngvoStopPlaybackEvents('openai')).toEqual([
      { type: 'response.cancel' },
      { type: 'output_audio_buffer.clear' },
    ])
    expect(getEngvoStopPlaybackEvents('xai')).toEqual([{ type: 'response.cancel' }])
  })
})

describe('buildEngvoXaiClientSessionUpdate', () => {
  it('includes language_hint ru, reasoning none, pcm formats, no openai-only fields', () => {
    const event = buildEngvoXaiClientSessionUpdate({
      instructions: 'Speak English.',
      voice: 'eve',
      speed: 0.8,
    })
    expect(event.type).toBe('session.update')
    const session = event.session as {
      voice: string
      reasoning: { effort: string }
      audio: {
        input: {
          transcription: { model: string; language_hint: string }
          format: { rate: number }
          turn_detection: Record<string, unknown>
        }
        output: { voice: string; speed: number; format: { rate: number } }
      }
    }
    expect(session.voice).toBe('eve')
    expect(session.reasoning.effort).toBe('none')
    expect(session.audio.input.transcription.model).toBe('grok-transcribe')
    expect(session.audio.input.transcription.language_hint).toBe('ru')
    expect(session.audio.input.format.rate).toBe(24_000)
    expect(session.audio.input.turn_detection).toEqual({
      type: 'server_vad',
      threshold: 0.78,
      prefix_padding_ms: 300,
      silence_duration_ms: 900,
      create_response: true,
      interrupt_response: false,
    })
    expect(session.audio.output.speed).toBe(0.8)
    expect(session.audio.output.voice).toBe('eve')
    expect(session).not.toHaveProperty('output_modalities')
  })
})

describe('normalizeEngvoRealtimeServerEvent', () => {
  it('maps session and transcript events', () => {
    expect(normalizeEngvoRealtimeServerEvent(JSON.stringify({ type: 'session.updated' }))).toEqual({
      kind: 'session_ready',
    })
    expect(
      normalizeEngvoRealtimeServerEvent(
        JSON.stringify({
          type: 'response.output_audio_transcript.done',
          transcript: 'Hello',
          response_id: 'r1',
        })
      )
    ).toEqual({ kind: 'assistant_transcript_final', text: 'Hello', responseId: 'r1' })
  })

  it('maps partial user completed to delta and updated to delta', () => {
    expect(
      normalizeEngvoRealtimeServerEvent(
        JSON.stringify({
          type: 'conversation.item.input_audio_transcription.completed',
          transcript: 'Hi',
          item_id: 'i1',
          status: 'in_progress',
        })
      )
    ).toEqual({ kind: 'user_transcript_delta', text: 'Hi' })

    expect(
      normalizeEngvoRealtimeServerEvent(
        JSON.stringify({
          type: 'conversation.item.input_audio_transcription.completed',
          transcript: 'Hi there',
          item_id: 'i1',
          status: 'completed',
        })
      )
    ).toEqual({ kind: 'user_transcript_final', text: 'Hi there', itemId: 'i1' })

    expect(
      normalizeEngvoRealtimeServerEvent(
        JSON.stringify({
          type: 'conversation.item.input_audio_transcription.updated',
          transcript: 'Hello world',
          item_id: 'i1',
        })
      )
    ).toEqual({ kind: 'user_transcript_delta', text: 'Hello world' })
  })
})

describe('Engvo provider preferences', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    const localStorageMock = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    }
    vi.stubGlobal('window', { localStorage: localStorageMock })
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults provider to openai and stores xai voice separately', () => {
    expect(loadEngvoProvider()).toBe('openai')
    saveEngvoProvider('xai')
    expect(loadEngvoProvider()).toBe('xai')
    saveEngvoXaiVoice('carina')
    expect(loadEngvoXaiVoice()).toBe('carina')
  })
})
