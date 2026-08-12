import { speak, stopSpeaking } from '@/lib/speech'
import { featureFlags } from '@/lib/featureFlags'
import { clampVocabTtsSpeed } from '@/lib/vocabulary/clampVocabTtsSpeed'
import { getVocabTtsEnginePref } from '@/lib/vocabulary/ttsEnginePref'
import { getVocabTtsVoicePref } from '@/lib/vocabulary/ttsVoicePref'
import { getVocabTtsCache, makeVocabTtsCacheKey } from '@/lib/vocabulary/vocabTtsCachePort'

export type PlayVocabTtsOptions = {
  rate?: number
  /** Browser speechSynthesis voice URI when engine is system. */
  browserVoiceId?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

let activeAudio: HTMLAudioElement | null = null
let activeObjectUrl: string | null = null
let activeAbort: AbortController | null = null
let playbackGeneration = 0

function revokeObjectUrl(): void {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
}

function stopAudioElement(): void {
  if (activeAudio) {
    try {
      activeAudio.onended = null
      activeAudio.onerror = null
      activeAudio.pause()
      activeAudio.removeAttribute('src')
      activeAudio.load()
    } catch {
      // ignore
    }
    activeAudio = null
  }
  revokeObjectUrl()
}

export function stopVocabTts(): void {
  playbackGeneration += 1
  if (activeAbort) {
    activeAbort.abort()
    activeAbort = null
  }
  stopAudioElement()
  stopSpeaking()
}

async function fetchGrokAudio(
  text: string,
  voiceId: string,
  speed: number,
  signal: AbortSignal
): Promise<ArrayBuffer> {
  const cache = getVocabTtsCache()
  const key = makeVocabTtsCacheKey(text, voiceId, speed)
  const cached = cache.get(key)
  if (cached) return cached

  const response = await fetch('/api/vocab/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId, speed }),
    signal,
  })
  if (!response.ok) {
    throw new Error(`vocab tts ${response.status}`)
  }
  const bytes = await response.arrayBuffer()
  cache.set(key, bytes)
  return bytes
}

function playArrayBuffer(
  bytes: ArrayBuffer,
  generation: number,
  options: PlayVocabTtsOptions
): void {
  stopAudioElement()
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  activeObjectUrl = url
  const audio = new Audio(url)
  activeAudio = audio

  audio.onended = () => {
    if (playbackGeneration !== generation) return
    stopAudioElement()
    options.onEnd?.()
  }
  audio.onerror = () => {
    if (playbackGeneration !== generation) return
    stopAudioElement()
    options.onError?.()
  }

  void audio.play().then(
    () => {
      if (playbackGeneration !== generation) {
        stopAudioElement()
        return
      }
      options.onStart?.()
    },
    () => {
      if (playbackGeneration !== generation) return
      stopAudioElement()
      options.onError?.()
    }
  )
}

function playSystem(text: string, options: PlayVocabTtsOptions): void {
  speak(text, options.browserVoiceId ?? '', {
    rate: options.rate ?? 0.9,
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
  })
}

/**
 * Play vocab etalon / preview. Reads engine+voice prefs on each call.
 * Grok path caches by text|voice|speed; failures fall back to speechSynthesis once.
 */
export function playVocabTts(text: string, options: PlayVocabTtsOptions = {}): void {
  const normalized = text.trim()
  if (!normalized) return

  stopVocabTts()
  const generation = playbackGeneration

  const useGrok = featureFlags.vocabGrokTtsV1 && getVocabTtsEnginePref() === 'grok'
  if (!useGrok) {
    playSystem(normalized, options)
    return
  }

  const voiceId = getVocabTtsVoicePref()
  const speed = clampVocabTtsSpeed(options.rate ?? 1)
  const abort = new AbortController()
  activeAbort = abort

  void (async () => {
    try {
      const bytes = await fetchGrokAudio(normalized, voiceId, speed, abort.signal)
      if (playbackGeneration !== generation || abort.signal.aborted) return
      activeAbort = null
      playArrayBuffer(bytes, generation, options)
    } catch (error) {
      if (abort.signal.aborted || playbackGeneration !== generation) return
      activeAbort = null
      // Network/API failure → one-shot system fallback (pref unchanged).
      playSystem(normalized, options)
      void error
    }
  })()
}
