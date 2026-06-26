export type PracticeTtsSpeedPreset = {
  rate: number
  label: string
  ariaLabel: string
}

export const PRACTICE_TTS_SPEED_PRESETS: readonly PracticeTtsSpeedPreset[] = [
  {
    rate: 1,
    label: '1.0×',
    ariaLabel: 'Скорость воспроизведения: 1.0×. Нажмите, чтобы сменить',
  },
  {
    rate: 0.85,
    label: '0.85×',
    ariaLabel: 'Скорость воспроизведения: 0.85×. Нажмите, чтобы сменить',
  },
  {
    rate: 0.7,
    label: '0.7×',
    ariaLabel: 'Скорость воспроизведения: 0.7×. Нажмите, чтобы сменить',
  },
] as const

export const PRACTICE_TTS_SPEED_PRESET_COUNT = PRACTICE_TTS_SPEED_PRESETS.length

export function cyclePracticeTtsSpeedIndex(current: number): number {
  return (current + 1) % PRACTICE_TTS_SPEED_PRESET_COUNT
}

export function getPracticeTtsSpeedPreset(index: number): PracticeTtsSpeedPreset {
  return PRACTICE_TTS_SPEED_PRESETS[index] ?? PRACTICE_TTS_SPEED_PRESETS[0]
}

export function getPracticeTtsRateByIndex(index: number): number {
  return getPracticeTtsSpeedPreset(index).rate
}
