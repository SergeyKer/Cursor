import {
  ENGVO_XAI_MODEL,
  ENGVO_XAI_PCM_SAMPLE_RATE,
  ENGVO_XAI_REALTIME_URL,
  shouldSendOutputAudioBufferClear,
  type EngvoProvider,
} from '@/lib/engvo/constants'
import {
  applyInputGain,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  downsampleToRate,
  ENGVO_XAI_SCRIPT_PROCESSOR_BUFFER,
  ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT,
  floatTo16BitPCM,
} from '@/lib/engvo/pcm'

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

export function buildXaiRealtimeWsUrl(model: string = ENGVO_XAI_MODEL): string {
  const url = new URL(ENGVO_XAI_REALTIME_URL)
  url.searchParams.set('model', model)
  return url.toString()
}

export function connectEngvoXaiRealtime(params: {
  token: string
  model?: string
  mediaStream: MediaStream
  /** Owned by AppShell; must be resumed in the same user gesture as getUserMedia. */
  audioContext: AudioContext
  handlers: EngvoXaiTransportHandlers
}): EngvoXaiTransport {
  const model = params.model ?? ENGVO_XAI_MODEL
  const wsUrl = buildXaiRealtimeWsUrl(model)
  const ws = new WebSocket(wsUrl, [`xai-client-secret.${params.token}`])

  let closed = false
  const audioContext = params.audioContext
  let micSource: MediaStreamAudioSourceNode | null = null
  let processor: ScriptProcessorNode | null = null
  let speakerGain: GainNode | null = null
  let mediaStreamDest: MediaStreamAudioDestinationNode | null = null
  let nextPlayTime = 0
  const activeSources = new Set<AudioBufferSourceNode>()
  let playbackActive = false
  let graphReady = false

  const setPlaybackActive = (active: boolean) => {
    if (playbackActive === active) return
    playbackActive = active
    params.handlers.onPlaybackActiveChange?.(active)
  }

  const ensureAudioGraph = () => {
    if (graphReady && speakerGain && mediaStreamDest) return audioContext
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
    }
    speakerGain = audioContext.createGain()
    mediaStreamDest = audioContext.createMediaStreamDestination()
    speakerGain.connect(audioContext.destination)
    speakerGain.connect(mediaStreamDest)
    params.handlers.onRemoteStream?.(mediaStreamDest.stream)
    graphReady = true
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

  const playPcmBase64 = (base64: string) => {
    const ctx = ensureAudioGraph()
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

  const startMicCapture = () => {
    const ctx = ensureAudioGraph()
    if (!ctx || closed || micSource || processor) return
    micSource = ctx.createMediaStreamSource(params.mediaStream)
    processor = ctx.createScriptProcessor(ENGVO_XAI_SCRIPT_PROCESSOR_BUFFER, 1, 1)
    processor.onaudioprocess = (event) => {
      if (closed || ws.readyState !== WebSocket.OPEN) return
      if (ws.bufferedAmount > ENGVO_XAI_WS_BUFFERED_AMOUNT_LIMIT) return
      const input = event.inputBuffer.getChannelData(0)
      const boosted = applyInputGain(input)
      const down = downsampleToRate(boosted, ctx.sampleRate, ENGVO_XAI_PCM_SAMPLE_RATE)
      const pcm = floatTo16BitPCM(down)
      const delta = arrayBufferToBase64(pcm)
      try {
        ws.send(
          JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: delta,
          })
        )
      } catch (error) {
        console.warn('[engvo][xai] input_audio_buffer.append failed', error)
      }
    }
    micSource.connect(processor)
    const silent = ctx.createGain()
    silent.gain.value = 0
    processor.connect(silent)
    silent.connect(ctx.destination)
  }

  try {
    ensureAudioGraph()
    startMicCapture()
  } catch (error) {
    console.warn('[engvo][xai] failed to start mic capture graph', error)
  }

  ws.addEventListener('open', () => {
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {})
    }
    startMicCapture()
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
        playPcmBase64(parsed.delta)
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
      // AppShell owns audioContext lifecycle — do not close here.
      speakerGain = null
      mediaStreamDest = null
      graphReady = false
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
