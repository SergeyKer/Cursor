import { speak, stopSpeaking } from '@/lib/speech'
import { stopStreamPcmPlayback } from '@/lib/tts/streamTtsPlayback'

export type UnaryTtsCallbacks = {
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

let activeAbort: AbortController | null = null
let playbackGeneration = 0

export function stopUnaryTts(): void {
  playbackGeneration += 1
  if (activeAbort) {
    activeAbort.abort()
    activeAbort = null
  }
  stopStreamPcmPlayback()
  stopSpeaking()
}

export function playSystemUnaryTts(
  text: string,
  options: UnaryTtsCallbacks & { browserVoiceId?: string; rate?: number } = {}
): void {
  speak(text, options.browserVoiceId ?? '', {
    rate: options.rate ?? 0.9,
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
  })
}

export function startUnaryGrokSession(): { generation: number; signal: AbortSignal } {
  const generation = playbackGeneration
  const abort = new AbortController()
  activeAbort = abort
  return { generation, signal: abort.signal }
}

export function clearUnaryGrokSession(): void {
  activeAbort = null
}

export function isUnaryTtsGenerationCurrent(generation: number): boolean {
  return playbackGeneration === generation
}
