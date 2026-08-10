/** Shared silence thresholds (aligned with lesson MediaRecorder VAD). */

export const VOCAB_SILENCE_MS = 1_200
export const VOCAB_SILENCE_WARMUP_MS = 450
export const VOCAB_SILENCE_RMS_THRESHOLD = 0.024
export const VOCAB_RECORD_MAX_MS = 15_000

export type RmsSilenceVadOptions = {
  stream: MediaStream
  onSilence: () => void
  silenceMs?: number
  warmupMs?: number
  rmsThreshold?: number
  /** Existing context from cue beeps (preferred on iOS). */
  audioContext?: AudioContext | null
}

export type RmsSilenceVadHandle = {
  stop: () => void
  /** True after RMS crossed threshold past warmup. */
  getHasHeardSpeech: () => boolean
}

/**
 * RAF loop on analyser RMS; fires onSilence once after speech then silenceMs of quiet.
 */
export function startRmsSilenceVad(options: RmsSilenceVadOptions): RmsSilenceVadHandle {
  const silenceMs = options.silenceMs ?? VOCAB_SILENCE_MS
  const warmupMs = options.warmupMs ?? VOCAB_SILENCE_WARMUP_MS
  const rmsThreshold = options.rmsThreshold ?? VOCAB_SILENCE_RMS_THRESHOLD

  const AudioContextCtor =
    typeof window !== 'undefined'
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined

  let stopped = false
  let rafId: number | null = null
  let hasHeardSpeech = false
  let ownedContext = false
  let audioCtx: AudioContext | null = options.audioContext ?? null

  if (!audioCtx && AudioContextCtor) {
    audioCtx = new AudioContextCtor()
    ownedContext = true
  }

  const stop = () => {
    stopped = true
    if (rafId != null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    if (ownedContext && audioCtx) {
      void audioCtx.close().catch(() => undefined)
      audioCtx = null
    }
  }

  if (!audioCtx) {
    return { stop, getHasHeardSpeech: () => hasHeardSpeech }
  }

  void audioCtx.resume().catch(() => undefined)

  try {
    const source = audioCtx.createMediaStreamSource(options.stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.5
    source.connect(analyser)
    const timeData = new Uint8Array(analyser.fftSize)
    let lastSpeechAt = performance.now()
    const warmupUntil = performance.now() + warmupMs

    const tick = () => {
      if (stopped) return
      analyser.getByteTimeDomainData(timeData)
      let sumSq = 0
      for (let i = 0; i < timeData.length; i += 1) {
        const x = (timeData[i]! - 128) / 128
        sumSq += x * x
      }
      const rms = Math.sqrt(sumSq / timeData.length)
      const now = performance.now()

      if (rms >= rmsThreshold && now >= warmupUntil) {
        hasHeardSpeech = true
        lastSpeechAt = now
      }

      if (hasHeardSpeech && now - lastSpeechAt >= silenceMs) {
        options.onSilence()
        stop()
        return
      }

      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
  } catch {
    stop()
  }

  return {
    stop,
    getHasHeardSpeech: () => hasHeardSpeech,
  }
}
