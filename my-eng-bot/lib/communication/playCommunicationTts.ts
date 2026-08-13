import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { isCommunicationGrokTts } from '@/lib/communication/isCommunicationGrokTts'
import { getCommunicationTtsVoicePref, setCommunicationTtsVoicePref } from '@/lib/communication/ttsVoicePref'
import {
  getCommunicationTtsRotationModePref,
  getCommunicationTtsShuffleRemaining,
  setCommunicationTtsShuffleRemaining,
} from '@/lib/communication/ttsRotationPref'
import {
  getCommunicationTtsCache,
  makeCommunicationTtsCacheKey,
} from '@/lib/communication/ttsCache'
import { pickNextXaiVoice } from '@/lib/engvo/xaiVoiceRotation'
import {
  clearUnaryGrokSession,
  isUnaryTtsGenerationCurrent,
  playSystemUnaryTts,
  startUnaryGrokSession,
  stopUnaryTts,
  type UnaryTtsCallbacks,
} from '@/lib/tts/unaryTtsPlayback'
import { playPcmBuffer, playTtsPcmResponse } from '@/lib/tts/streamTtsPlayback'
import { fetchTtsPcmResponse, getPcmInflight, runPcmInflight } from '@/lib/tts/grokPcmClient'

export type PlayCommunicationTtsOptions = {
  rate?: number
  browserVoiceId?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export function stopCommunicationTts(): void {
  stopUnaryTts()
}

function resolveCommunicationGrokVoice(): string {
  const mode = getCommunicationTtsRotationModePref()
  const lastVoice = getCommunicationTtsVoicePref()
  const picked = pickNextXaiVoice({
    mode,
    lastVoice,
    shuffleRemaining: getCommunicationTtsShuffleRemaining(),
  })
  setCommunicationTtsVoicePref(picked.voice)
  setCommunicationTtsShuffleRemaining(mode === 'shuffle' ? picked.shuffleRemaining : [])
  return picked.voice
}

export function playCommunicationTts(text: string, options: PlayCommunicationTtsOptions = {}): void {
  const normalized = text.trim()
  if (!normalized) return

  stopCommunicationTts()
  const callbacks: UnaryTtsCallbacks = {
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
  }
  const systemOpts = {
    ...callbacks,
    browserVoiceId: options.browserVoiceId,
    rate: options.rate ?? 0.9,
  }

  if (!isCommunicationGrokTts(normalized)) {
    playSystemUnaryTts(normalized, systemOpts)
    return
  }

  const voiceId = resolveCommunicationGrokVoice()
  const speed = clampVocabTtsSpeed(options.rate ?? 1)
  const cache = getCommunicationTtsCache()
  const cacheKey = makeCommunicationTtsCacheKey(normalized, voiceId, speed)
  const inflightKey = `communication:${cacheKey}`
  const { generation, signal } = startUnaryGrokSession()
  const isCurrent = () => isUnaryTtsGenerationCurrent(generation) && !signal.aborted

  void (async () => {
    try {
      const cached = cache.get(cacheKey)
      if (cached) {
        if (!isCurrent()) return
        clearUnaryGrokSession()
        playPcmBuffer(cached, generation, isCurrent, callbacks)
        return
      }

      const pending = getPcmInflight(inflightKey)
      if (pending) {
        const bytes = await pending
        if (!isCurrent()) return
        clearUnaryGrokSession()
        playPcmBuffer(bytes, generation, isCurrent, callbacks)
        return
      }

      await runPcmInflight(inflightKey, async () => {
        const response = await fetchTtsPcmResponse(
          '/api/communication/tts',
          { text: normalized, voice_id: voiceId, speed },
          signal
        )
        const bytes = await playTtsPcmResponse(response, generation, isCurrent, callbacks)
        if (isCurrent() && bytes.byteLength > 0) cache.set(cacheKey, bytes)
        return bytes
      })
      if (isCurrent()) clearUnaryGrokSession()
    } catch (error) {
      if (!isCurrent()) return
      clearUnaryGrokSession()
      playSystemUnaryTts(normalized, systemOpts)
      void error
    }
  })()
}
