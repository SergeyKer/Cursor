/** Vocab/lab cue tones: single = ready to speak; double = recording stopped. */

export type CueBeepKind = 'single' | 'double'

const DEFAULT_FREQ_HZ = 880
const BEEP_MS = 90
const GAP_MS = 70
const GAIN = 0.09

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  )
}

function scheduleTone(
  ctx: AudioContext,
  startAt: number,
  durationSec: number,
  freqHz: number
): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = freqHz
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(GAIN, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + durationSec + 0.02)
}

/**
 * Plays cue beeps on a shared AudioContext (resume in the same user gesture when possible).
 * Returns when tones are scheduled; duration is approximate wall time for awaiting.
 */
export async function playCueBeeps(
  kind: CueBeepKind,
  options?: { ctx?: AudioContext | null; freqHz?: number }
): Promise<AudioContext | null> {
  const Ctor = getAudioContextCtor()
  if (!Ctor) return options?.ctx ?? null

  const ctx = options?.ctx && options.ctx.state !== 'closed' ? options.ctx : new Ctor()
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // iOS may still block outside gesture; caller should unlock on mic tap.
    }
  }

  const freq = options?.freqHz ?? DEFAULT_FREQ_HZ
  const now = ctx.currentTime + 0.02
  const beepSec = BEEP_MS / 1000
  const gapSec = GAP_MS / 1000

  scheduleTone(ctx, now, beepSec, freq)
  if (kind === 'double') {
    scheduleTone(ctx, now + beepSec + gapSec, beepSec, freq)
  }

  const waitMs = kind === 'double' ? BEEP_MS * 2 + GAP_MS + 40 : BEEP_MS + 40
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, waitMs)
  })

  return ctx
}

export function estimateCueBeepMs(kind: CueBeepKind): number {
  return kind === 'double' ? BEEP_MS * 2 + GAP_MS + 40 : BEEP_MS + 40
}
