import {
  buildEngvoInputAudioTranscriptionConfig,
  ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION,
  type EngvoRealtimeVoice,
} from '@/lib/engvo/constants'

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

/** Session JSON for `POST /v1/realtime/calls` (GA unified WebRTC). Voice lives under `audio.output`. */
export function buildEngvoCallsApiSession(params: {
  model: string
  voice: EngvoRealtimeVoice
  instructions: string
}): EngvoRealtimeSessionBase & {
  model: string
  instructions: string
  audio: {
    input: {
      transcription: ReturnType<typeof buildEngvoInputAudioTranscriptionConfig>
      turn_detection: typeof ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION
    }
    output: { voice: EngvoRealtimeVoice }
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
      output: {
        voice: params.voice,
      },
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
    audio.output = { voice: params.voice }
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
