import { ENGVO_XAI_SPEED_MAX, ENGVO_XAI_SPEED_MIN } from '@/lib/engvo/constants'

/** Clamp UI practice rates into xAI TTS speed range (0.7–1.5). */
export function clampVocabTtsSpeed(rate: number): number {
  if (!Number.isFinite(rate)) return 1
  return Math.min(ENGVO_XAI_SPEED_MAX, Math.max(ENGVO_XAI_SPEED_MIN, rate))
}
