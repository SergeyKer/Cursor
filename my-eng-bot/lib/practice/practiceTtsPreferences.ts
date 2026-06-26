import {
  getPracticeTtsRateByIndex,
  PRACTICE_TTS_SPEED_PRESET_COUNT,
} from '@/lib/practice/practiceTtsSpeedPresets'

export const PRACTICE_TTS_SPEED_STORAGE_KEY = 'myeng-practice-tts-speed-index'

export function isPracticeTtsSpeedIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < PRACTICE_TTS_SPEED_PRESET_COUNT
}

export function loadPracticeTtsSpeedDefaultIndex(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(PRACTICE_TTS_SPEED_STORAGE_KEY)?.trim() ?? ''
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return isPracticeTtsSpeedIndex(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

export function savePracticeTtsSpeedDefaultIndex(index: number): void {
  if (typeof window === 'undefined') return
  if (!isPracticeTtsSpeedIndex(index)) return
  try {
    localStorage.setItem(PRACTICE_TTS_SPEED_STORAGE_KEY, String(index))
  } catch {
    // ignore
  }
}

export function getDefaultTtsSpeechRate(index = loadPracticeTtsSpeedDefaultIndex()): number {
  return getPracticeTtsRateByIndex(index)
}

export function resolveEffectivePracticeTtsSpeedIndex(
  sessionOverride: number | null,
  defaultIndex: number
): number {
  if (sessionOverride != null && isPracticeTtsSpeedIndex(sessionOverride)) {
    return sessionOverride
  }
  return isPracticeTtsSpeedIndex(defaultIndex) ? defaultIndex : 0
}
