import { featureFlags } from '@/lib/featureFlags'
import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { getVocabTtsEnginePref } from '@/lib/vocabulary/ttsEnginePref'
import { getVocabTtsVoicePref, setVocabTtsVoicePref } from '@/lib/vocabulary/ttsVoicePref'
import {
  getVocabTtsRotationModePref,
  getVocabTtsShuffleRemaining,
  setVocabTtsShuffleRemaining,
} from '@/lib/vocabulary/ttsRotationPref'
import { getVocabTtsCache, makeVocabTtsCacheKey } from '@/lib/vocabulary/vocabTtsCachePort'
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
import { fetchTtsPcmResponse, getPcmInflight, loadPcmThroughCache, readStreamToBuffer, runPcmInflight } from '@/lib/tts/grokPcmClient'

export type PlayVocabTtsOptions = {
  rate?: number
  browserVoiceId?: string
  /** When set, skip rotation for this play/prefetch (one voice per card). */
  grokVoiceId?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export function stopVocabTts(): void {
  stopUnaryTts()
}

export function resolveVocabGrokVoice(): string {
  const mode = getVocabTtsRotationModePref()
  const lastVoice = getVocabTtsVoicePref()
  const picked = pickNextXaiVoice({
    mode,
    lastVoice,
    shuffleRemaining: getVocabTtsShuffleRemaining(),
  })
  setVocabTtsVoicePref(picked.voice)
  setVocabTtsShuffleRemaining(mode === 'shuffle' ? picked.shuffleRemaining : [])
  return picked.voice
}

function isVocabGrokEnabled(): boolean {
  return featureFlags.vocabGrokTtsV1 && getVocabTtsEnginePref() === 'grok'
}

function loadVocabPcm(text: string, voiceId: string, speed: number, signal: AbortSignal): Promise<ArrayBuffer> {
  const cache = getVocabTtsCache()
  const cacheKey = makeVocabTtsCacheKey(text, voiceId, speed)
  return loadPcmThroughCache({
    cacheKey: `vocab:${cacheKey}`,
    getCached: () => cache.get(cacheKey),
    setCached: (bytes) => cache.set(cacheKey, bytes),
    load: async () => {
      const response = await fetchTtsPcmResponse(
        '/api/vocab/tts',
        { text, voice_id: voiceId, speed },
        signal
      )
      if (!response.body) throw new Error('vocab tts empty body')
      return readStreamToBuffer(response.body)
    },
  })
}

/** Warm cache for the visible card. Does not start playback or toggle isPlaying. */
export function prefetchVocabTts(text: string, options: { rate?: number; grokVoiceId: string }): void {
  const normalized = text.trim()
  if (!normalized || !isVocabGrokEnabled()) return
  const speed = clampVocabTtsSpeed(options.rate ?? 1)
  const abort = new AbortController()
  void loadVocabPcm(normalized, options.grokVoiceId, speed, abort.signal).catch(() => undefined)
}

/**
 * Play vocab etalon / preview. Reads engine+voice prefs on each call unless grokVoiceId is passed.
 * Grok path caches by text|voice|speed; failures fall back to speechSynthesis once.
 */
export function playVocabTts(text: string, options: PlayVocabTtsOptions = {}): void {
  const normalized = text.trim()
  if (!normalized) return

  stopVocabTts()
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

  if (!isVocabGrokEnabled()) {
    playSystemUnaryTts(normalized, systemOpts)
    return
  }

  const voiceId = options.grokVoiceId ?? resolveVocabGrokVoice()
  const speed = clampVocabTtsSpeed(options.rate ?? 1)
  const cache = getVocabTtsCache()
  const cacheKey = makeVocabTtsCacheKey(normalized, voiceId, speed)
  const inflightKey = `vocab:${cacheKey}`
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
          '/api/vocab/tts',
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
