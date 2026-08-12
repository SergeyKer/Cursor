import { ENGVO_XAI_PCM_SAMPLE_RATE } from '@/lib/engvo/constants'
import { concatUint8, takeEvenPcmFrames } from '@/lib/tts/pcmFrames'

export type StreamTtsCallbacks = {
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

let audioCtx: AudioContext | null = null
let pcmGeneration = -1
let nextPlayTime = 0
const activeSources = new Set<AudioBufferSourceNode>()
let activeAudio: HTMLAudioElement | null = null
let activeObjectUrl: string | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctor()
  }
  return audioCtx
}

function pcm16ToWavBlob(pcm: Uint8Array, sampleRate: number): Blob {
  const dataSize = pcm.byteLength - (pcm.byteLength % 2)
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const out = new Uint8Array(buffer)
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataSize, true)
  out.set(pcm.subarray(0, dataSize), 44)
  return new Blob([buffer], { type: 'audio/wav' })
}

function stopHtmlAudio(): void {
  if (activeAudio) {
    activeAudio.onended = null
    activeAudio.onerror = null
    try {
      activeAudio.pause()
      activeAudio.removeAttribute('src')
      activeAudio.load()
    } catch {
      // ignore
    }
    activeAudio = null
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
}

/** Call synchronously from a click/tap before any await (Safari). */
export function unlockTtsAudioContext(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
  const silent = pcm16ToWavBlob(new Uint8Array(2), ENGVO_XAI_PCM_SAMPLE_RATE)
  const url = URL.createObjectURL(silent)
  const audio = new Audio(url)
  audio.volume = 0
  void audio.play().finally(() => {
    audio.pause()
    URL.revokeObjectURL(url)
  })
}

export function stopStreamPcmPlayback(): void {
  pcmGeneration = -1
  nextPlayTime = 0
  for (const source of activeSources) {
    try {
      source.onended = null
      source.stop()
    } catch {
      // ignore
    }
  }
  activeSources.clear()
  stopHtmlAudio()
}

function schedulePcm16(
  pcm: Uint8Array,
  generation: number,
  sampleRate: number,
  onEndedLast?: () => void
): void {
  const ctx = getAudioContext()
  if (!ctx || pcm.byteLength < 2) return
  const aligned = pcm.byteLength % 2 === 0 ? pcm : pcm.subarray(0, pcm.byteLength - 1)
  const int16 = new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2)
  if (int16.length === 0) return
  const dstRate = ctx.sampleRate || sampleRate
  const ratio = dstRate / sampleRate
  const dstLen = Math.max(1, Math.round(int16.length * ratio))
  const buffer = ctx.createBuffer(1, dstLen, dstRate)
  const out = buffer.getChannelData(0)
  if (Math.abs(ratio - 1) < 0.001) {
    for (let i = 0; i < int16.length; i++) {
      out[i] = (int16[i] ?? 0) / 0x8000
    }
  } else {
    for (let i = 0; i < dstLen; i++) {
      const srcPos = i / ratio
      const i0 = Math.min(int16.length - 1, Math.floor(srcPos))
      const i1 = Math.min(int16.length - 1, i0 + 1)
      const t = srcPos - i0
      const s0 = (int16[i0] ?? 0) / 0x8000
      const s1 = (int16[i1] ?? 0) / 0x8000
      out[i] = s0 + (s1 - s0) * t
    }
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  const startAt = Math.max(ctx.currentTime + 0.02, nextPlayTime)
  nextPlayTime = startAt + buffer.duration
  activeSources.add(source)
  source.onended = () => {
    activeSources.delete(source)
    if (generation !== pcmGeneration) return
    if (activeSources.size === 0) onEndedLast?.()
  }
  try {
    source.start(startAt)
  } catch {
    activeSources.delete(source)
  }
}

function playWavFromPcm(
  bytes: ArrayBuffer,
  generation: number,
  isCurrent: () => boolean,
  options: StreamTtsCallbacks,
  sampleRate: number
): void {
  if (!isCurrent() || bytes.byteLength < 2) {
    options.onError?.()
    return
  }
  const pcm = new Uint8Array(bytes)
  const blob = pcm16ToWavBlob(pcm, sampleRate)
  const url = URL.createObjectURL(blob)
  activeObjectUrl = url
  const audio = new Audio(url)
  audio.preload = 'auto'
  activeAudio = audio
  audio.onended = () => {
    if (activeAudio === audio) stopHtmlAudio()
    if (!isCurrent() || pcmGeneration !== generation) return
    options.onEnd?.()
  }
  audio.onerror = () => {
    if (activeAudio === audio) stopHtmlAudio()
    options.onError?.()
  }
  options.onStart?.()
  void audio.play().catch(() => {
    if (activeAudio === audio) stopHtmlAudio()
    options.onError?.()
  })
}

export function playPcmBuffer(
  bytes: ArrayBuffer,
  generation: number,
  isCurrent: () => boolean,
  options: StreamTtsCallbacks = {},
  sampleRate: number = ENGVO_XAI_PCM_SAMPLE_RATE
): void {
  stopStreamPcmPlayback()
  pcmGeneration = generation
  playWavFromPcm(bytes, generation, isCurrent, options, sampleRate)
}

export async function playTtsPcmResponse(
  response: Response,
  generation: number,
  isCurrent: () => boolean,
  options: StreamTtsCallbacks = {},
  sampleRate: number = ENGVO_XAI_PCM_SAMPLE_RATE
): Promise<ArrayBuffer> {
  const mode = response.headers.get('X-Engvo-Tts-Mode')
  if (!response.body) throw new Error('tts empty body')
  if (mode === 'stream') {
    return playPcmReadableStream(response.body, generation, isCurrent, options, sampleRate)
  }
  const bytes = await response.arrayBuffer()
  if (isCurrent()) playPcmBuffer(bytes, generation, isCurrent, options, sampleRate)
  return bytes
}

export async function playPcmReadableStream(
  stream: ReadableStream<Uint8Array>,
  generation: number,
  isCurrent: () => boolean,
  options: StreamTtsCallbacks = {},
  sampleRate: number = ENGVO_XAI_PCM_SAMPLE_RATE
): Promise<ArrayBuffer> {
  stopStreamPcmPlayback()
  pcmGeneration = generation
  nextPlayTime = 0
  const ctx = getAudioContext()
  if (!ctx) {
    options.onError?.()
    throw new Error('no audio context')
  }
  if (ctx.state === 'suspended') void ctx.resume()

  const reader = stream.getReader()
  const collected: Uint8Array<ArrayBufferLike>[] = []
  let pending: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
  let started = false
  let streamDone = false

  const maybeEnd = () => {
    if (!streamDone) return
    if (!isCurrent() || pcmGeneration !== generation) return
    if (activeSources.size === 0) options.onEnd?.()
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (!isCurrent() || pcmGeneration !== generation) {
        await reader.cancel().catch(() => undefined)
        return concatUint8(collected)
      }
      if (done) {
        if (pending.length >= 2) {
          collected.push(pending)
          schedulePcm16(pending, generation, sampleRate, maybeEnd)
        }
        streamDone = true
        maybeEnd()
        break
      }
      if (!value?.byteLength) continue
      const split = takeEvenPcmFrames(pending, value)
      pending = split.rest
      if (split.frames.byteLength === 0) continue
      collected.push(split.frames)
      if (!started) {
        started = true
        options.onStart?.()
      }
      schedulePcm16(split.frames, generation, sampleRate, maybeEnd)
    }
  } catch (error) {
    if (!isCurrent() || pcmGeneration !== generation) {
      return concatUint8(collected)
    }
    options.onError?.()
    throw error
  }

  return concatUint8(collected)
}
