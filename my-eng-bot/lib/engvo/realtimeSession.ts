import {
  buildEngvoInputAudioTranscriptionConfig,
  clampEngvoRealtimeSpeed,
  ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION,
  ENGVO_XAI_MODEL,
  ENGVO_XAI_PCM_SAMPLE_RATE,
  ENGVO_XAI_SERVER_VAD_TURN_DETECTION,
  type EngvoRealtimeVoice,
  type EngvoXaiCallVoice,
} from '@/lib/engvo/constants'

function buildEngvoAudioOutput(params: {
  voice: EngvoRealtimeVoice
  speed?: number
}): { voice: EngvoRealtimeVoice; speed: number } {
  return {
    voice: params.voice,
    speed: clampEngvoRealtimeSpeed(params.speed ?? 1, 'openai'),
  }
}

export const ENGVO_REALTIME_SESSION_TYPE = 'realtime' as const

export type EngvoRealtimeSessionType = typeof ENGVO_REALTIME_SESSION_TYPE

type EngvoRealtimeSessionBase = {
  type: EngvoRealtimeSessionType
}

export function assertEngvoRealtimeSessionHasType(
  session: Record<string, unknown>
): asserts session is EngvoRealtimeSessionBase & Record<string, unknown> {
  if (session.type !== ENGVO_REALTIME_SESSION_TYPE) {
    throw new Error(`Engvo Realtime session must include type: "${ENGVO_REALTIME_SESSION_TYPE}"`)
  }
}

/** Session JSON for `POST /v1/realtime/calls` (GA unified WebRTC). Voice and speed live under `audio.output`. */
export function buildEngvoCallsApiSession(params: {
  model: string
  voice: EngvoRealtimeVoice
  instructions: string
  speed?: number
}): EngvoRealtimeSessionBase & {
  model: string
  instructions: string
  audio: {
    input: {
      transcription: ReturnType<typeof buildEngvoInputAudioTranscriptionConfig>
      turn_detection: typeof ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION
    }
    output: { voice: EngvoRealtimeVoice; speed: number }
  }
} {
  const session = {
    type: ENGVO_REALTIME_SESSION_TYPE,
    model: params.model,
    instructions: params.instructions,
    audio: {
      input: {
        transcription: buildEngvoInputAudioTranscriptionConfig(),
        turn_detection: { ...ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION },
      },
      output: buildEngvoAudioOutput({ voice: params.voice, speed: params.speed }),
    },
  }
  assertEngvoRealtimeSessionHasType(session)
  return session
}

/** Payload `session` for client `session.update` (GA shape: nested `audio`, top-level `model`). */
export function buildEngvoClientSessionUpdate(params: {
  model: string
  instructions: string
  voice?: EngvoRealtimeVoice
  speed?: number
  inputAudioTranscription?: ReturnType<typeof buildEngvoInputAudioTranscriptionConfig> & {
    language?: string
  }
  turnDetection?: typeof ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION
}): EngvoRealtimeSessionBase & Record<string, unknown> {
  const audio: Record<string, unknown> = {
    input: {
      transcription: params.inputAudioTranscription ?? buildEngvoInputAudioTranscriptionConfig(),
      turn_detection: params.turnDetection ?? { ...ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION },
    },
  }
  if (params.voice) {
    audio.output = buildEngvoAudioOutput({ voice: params.voice, speed: params.speed })
  }
  const session: Record<string, unknown> = {
    type: ENGVO_REALTIME_SESSION_TYPE,
    model: params.model,
    instructions: params.instructions,
    output_modalities: ['audio'],
    audio,
  }
  assertEngvoRealtimeSessionHasType(session)
  return session as EngvoRealtimeSessionBase & Record<string, unknown>
}

const ENGVO_XAI_PCM_FORMAT = {
  type: 'audio/pcm' as const,
  rate: ENGVO_XAI_PCM_SAMPLE_RATE,
}

/** xAI Voice Agent `session.update` — PCM 24 kHz, language_hint ru, reasoning none. */
export function buildEngvoXaiClientSessionUpdate(params: {
  instructions: string
  voice: EngvoXaiCallVoice
  speed?: number
}): { type: 'session.update'; session: Record<string, unknown> } {
  const speed = clampEngvoRealtimeSpeed(params.speed ?? 1, 'xai')
  return {
    type: 'session.update',
    session: {
      instructions: params.instructions,
      voice: params.voice,
      audio: {
        input: {
          format: { ...ENGVO_XAI_PCM_FORMAT },
          transcription: {
            model: 'grok-transcribe',
            language_hint: 'ru',
          },
          turn_detection: { ...ENGVO_XAI_SERVER_VAD_TURN_DETECTION },
        },
        output: {
          format: { ...ENGVO_XAI_PCM_FORMAT },
          voice: params.voice,
          speed,
        },
      },
      reasoning: {
        effort: 'none',
      },
    },
  }
}

export { ENGVO_XAI_MODEL }
