import {
  ENGVO_XAI_DEFAULT_VOICE,
  ENGVO_XAI_VOICES,
  isEngvoXaiVoice,
  type EngvoXaiCallVoice,
  type EngvoXaiVoice,
  type EngvoXaiVoiceRotationMode,
} from '@/lib/engvo/constants'

export type XaiVoicePickResult = {
  voice: EngvoXaiVoice
  shuffleRemaining: EngvoXaiVoice[]
}

function pool(): readonly EngvoXaiVoice[] {
  return ENGVO_XAI_VOICES
}

/** Fisher–Yates shuffle of built-in Grok voices. */
export function createXaiVoiceShuffleDeck(rng: () => number = Math.random): EngvoXaiVoice[] {
  const deck = [...pool()]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/** Prefer not starting a fresh deck with the same voice as last call. */
export function avoidLeadingSameAsLast(
  deck: EngvoXaiVoice[],
  lastVoice: string | null | undefined,
  rng: () => number = Math.random
): EngvoXaiVoice[] {
  if (deck.length <= 1 || !lastVoice || deck[0] !== lastVoice) return deck
  const next = [...deck]
  const swapAt = 1 + Math.floor(rng() * (next.length - 1))
  ;[next[0], next[swapAt]] = [next[swapAt], next[0]]
  return next
}

/** Drop ids that are no longer in the built-in pool. */
export function sanitizeXaiVoiceShuffleRemaining(
  remaining: readonly string[] | null | undefined
): EngvoXaiVoice[] {
  if (!remaining?.length) return []
  const allowed = new Set<string>(pool())
  return remaining.filter((id): id is EngvoXaiVoice => allowed.has(id))
}

function pickSequential(lastVoice: string | null | undefined): EngvoXaiVoice {
  const voices = pool()
  if (!lastVoice || !isEngvoXaiVoice(lastVoice)) {
    return voices[0]!
  }
  const idx = voices.indexOf(lastVoice)
  if (idx < 0) return voices[0]!
  return voices[(idx + 1) % voices.length]!
}

function pickRandom(
  lastVoice: string | null | undefined,
  rng: () => number
): EngvoXaiVoice {
  const voices = pool()
  if (voices.length === 1) return voices[0]!
  const candidates =
    lastVoice && isEngvoXaiVoice(lastVoice)
      ? voices.filter((v) => v !== lastVoice)
      : [...voices]
  const poolPick = candidates.length > 0 ? candidates : [...voices]
  return poolPick[Math.floor(rng() * poolPick.length)]!
}

function pickShuffle(
  lastVoice: string | null | undefined,
  remaining: readonly string[] | null | undefined,
  rng: () => number
): XaiVoicePickResult {
  let bag = sanitizeXaiVoiceShuffleRemaining(remaining)
  if (bag.length === 0) {
    bag = avoidLeadingSameAsLast(createXaiVoiceShuffleDeck(rng), lastVoice, rng)
  }
  const voice = bag[0]!
  return { voice, shuffleRemaining: bag.slice(1) }
}

/**
 * Pick next built-in Grok voice for a new call.
 * Custom / unknown lastVoice is treated as outside the pool (start of sequential, any random, fresh shuffle).
 */
export function pickNextXaiVoice(params: {
  mode: EngvoXaiVoiceRotationMode
  lastVoice: EngvoXaiCallVoice | string | null | undefined
  shuffleRemaining?: readonly string[] | null
  rng?: () => number
}): XaiVoicePickResult {
  const rng = params.rng ?? Math.random
  const mode = params.mode
  if (mode === 'none') {
    const fallback =
      params.lastVoice && isEngvoXaiVoice(params.lastVoice)
        ? params.lastVoice
        : ENGVO_XAI_DEFAULT_VOICE
    return {
      voice: fallback,
      shuffleRemaining: sanitizeXaiVoiceShuffleRemaining(params.shuffleRemaining),
    }
  }
  if (mode === 'sequential') {
    return { voice: pickSequential(params.lastVoice), shuffleRemaining: [] }
  }
  if (mode === 'random') {
    return { voice: pickRandom(params.lastVoice, rng), shuffleRemaining: [] }
  }
  return pickShuffle(params.lastVoice, params.shuffleRemaining, rng)
}

/** When enabling rotation while current voice is custom / outside pool. */
export function ensureBuiltInXaiVoiceForRotation(
  current: EngvoXaiCallVoice | string | null | undefined
): EngvoXaiVoice | null {
  if (current && isEngvoXaiVoice(current)) return null
  return ENGVO_XAI_DEFAULT_VOICE
}
