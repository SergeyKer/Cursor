import {
  ENGVO_XAI_MODEL,
  ENGVO_XAI_PCM_SAMPLE_RATE,
  ENGVO_XAI_REALTIME_URL,
  shouldSendOutputAudioBufferClear,
  type EngvoProvider,
} from '@/lib/engvo/constants'

export { shouldSendOutputAudioBufferClear }

export type EngvoXaiTransportHandlers = {
  onEvent: (raw: string) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (message: string) => void
  onPlaybackActiveChange?: (active: boolean) => void
  onRemoteStream?: (stream: MediaStream | null) => void
}

export type EngvoXaiTransport = {
  send: (payload: Record<string, unknown>) => boolean
  clearLocalPlayback: () => void
  disconnect: () => void
  getRemoteMediaStream: () => MediaStream | null
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function downsampleToRate(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) return input
  const ratio = inputSampleRate / outputSampleRate
  const newLength = Math.max(1, Math.round(input.length / ratio))
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio)
    result[i] = input[start] ?? 0
  }
  return result
}

export function buildXaiRealtimeWsUrl(model: string = ENGVO_XAI_MODEL): string {
  const url = new URL(ENGVO_XAI_REALTIME_URL)
  url.searchParams.set('model', model)
  return url.toString()
}

export function connectEngvoXaiRealtime(params: {
  token: string
  model?: string
  mediaStream: MediaStream
  handlers: EngvoXaiTransportHandlers
}): EngvoXaiTransport {
  const model = params.model ?? ENGVO_XAI_MODEL
  const wsUrl = buildXaiRealtimeWsUrl(model)
  const ws = new WebSocket(wsUrl, [`xai-client-secret.${params.token}`])

  let closed = false
  let audioContext: AudioContext | null = null
  let micSource: MediaStreamAudioSourceNode | null = null
  let processor: ScriptProcessorNode | null = null
  let speakerGain: GainNode | null = null
  let mediaStreamDest: MediaStreamAudioDestinationNode | null = null
  let nextPlayTime = 0
  const activeSources = new Set<AudioBufferSourceNode>()
  let playbackActive = false

  const setPlaybackActive = (active: boolean) => {
    if (playbackActive === active) return
    playbackActive = active
    params.handlers.onPlaybackActiveChange?.(active)
  }

  const ensureAudioGraph = async () => {
    if (audioContext) return audioContext
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioContext = new Ctx({ sampleRate: ENGVO_XAI_PCM_SAMPLE_RATE })
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {})
    }
    speakerGain = audioContext.createGain()
    mediaStreamDest = audioContext.createMediaStreamDestination()
    speakerGain.connect(audioContext.destination)
    speakerGain.connect(mediaStreamDest)
    params.handlers.onRemoteStream?.(mediaStreamDest.stream)
    return audioContext
  }

  const clearLocalPlayback = () => {
    for (const source of activeSources) {
      try {
        source.stop()
      } catch {
        // ignore
      }
    }
    activeSources.clear()
    nextPlayTime = 0
    setPlaybackActive(false)
  }

  const playPcmBase64 = async (base64: string) => {
    const ctx = await ensureAudioGraph()
    if (!ctx || !speakerGain || closed) return
    const pcm = base64ToArrayBuffer(base64)
    const int16 = new Int16Array(pcm)
    if (int16.length === 0) return
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = (int16[i] ?? 0) / 0x8000
    }
    const buffer = ctx.createBuffer(1, float32.length, ENGVO_XAI_PCM_SAMPLE_RATE)
    buffer.copyToChannel(float32, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(speakerGain)
    const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTime)
    nextPlayTime = startAt + buffer.duration
    activeSources.add(source)
    setPlaybackActive(true)
    source.onended = () => {
      activeSources.delete(source)
      if (activeSources.size === 0) setPlaybackActive(false)
    }
    source.start(startAt)
  }

  const startMicCapture = async () => {
    const ctx = await ensureAudioGraph()
    if (!ctx || closed) return
    micSource = ctx.createMediaStreamSource(params.mediaStream)
    // ScriptProcessor is deprecated but widely supported for PCM capture without AudioWorklet bundling.
    processor = ctx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => {
      if (closed || ws.readyState !== WebSocket.OPEN) return
      const input = event.inputBuffer.getChannelData(0)
      const down = downsampleToRate(input, ctx.sampleRate, ENGVO_XAI_PCM_SAMPLE_RATE)
      const pcm = floatTo16BitPCM(down)
      const delta = arrayBufferToBase64(pcm)
      try {
        ws.send(
          JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: delta,
          })
        )
      } catch {
        // ignore
      }
    }
    micSource.connect(processor)
    // Keep processor in the graph without routing mic to speakers (avoid feedback).
    const silent = ctx.createGain()
    silent.gain.value = 0
    processor.connect(silent)
    silent.connect(ctx.destination)
  }

  ws.addEventListener('open', () => {
    void startMicCapture()
    params.handlers.onOpen?.()
  })

  ws.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : ''
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { type?: string; delta?: string }
      if (
        (parsed.type === 'response.output_audio.delta' || parsed.type === 'response.audio.delta') &&
        typeof parsed.delta === 'string' &&
        parsed.delta
      ) {
        void playPcmBase64(parsed.delta)
      }
    } catch {
      // still forward raw
    }
    params.handlers.onEvent(raw)
  })

  ws.addEventListener('error', () => {
    params.handlers.onError?.('WebSocket error')
  })

  ws.addEventListener('close', () => {
    params.handlers.onClose?.()
  })

  return {
    send: (payload) => {
      if (ws.readyState !== WebSocket.OPEN) return false
      try {
        ws.send(JSON.stringify(payload))
        return true
      } catch {
        return false
      }
    },
    clearLocalPlayback,
    disconnect: () => {
      closed = true
      clearLocalPlayback()
      try {
        processor?.disconnect()
        micSource?.disconnect()
      } catch {
        // ignore
      }
      processor = null
      micSource = null
      try {
        ws.close()
      } catch {
        // ignore
      }
      params.handlers.onRemoteStream?.(null)
      if (audioContext) {
        void audioContext.close().catch(() => {})
        audioContext = null
      }
      speakerGain = null
      mediaStreamDest = null
    },
    getRemoteMediaStream: () => mediaStreamDest?.stream ?? null,
  }
}

export function getEngvoStopPlaybackEvents(provider: EngvoProvider): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [{ type: 'response.cancel' }]
  if (shouldSendOutputAudioBufferClear(provider)) {
    events.push({ type: 'output_audio_buffer.clear' })
  }
  return events
}
