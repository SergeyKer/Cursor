import { describe, expect, it } from 'vitest'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
  getPracticeTtsSpeedPreset,
  PRACTICE_TTS_SPEED_PRESETS,
} from '@/lib/practice/practiceTtsSpeedPresets'

describe('practiceTtsSpeedPresets', () => {
  it('cycles through 1.0x, 0.85x and 0.7x', () => {
    expect(getPracticeTtsSpeedPreset(0).label).toBe('1.0×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(0)).label).toBe('0.85×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(1)).label).toBe('0.7×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(2)).label).toBe('1.0×')
  })

  it('maps preset index to playback rate', () => {
    expect(getPracticeTtsRateByIndex(0)).toBe(1)
    expect(getPracticeTtsRateByIndex(1)).toBe(0.85)
    expect(getPracticeTtsRateByIndex(2)).toBe(0.7)
  })

  it('exposes standard multiplier labels', () => {
    expect(PRACTICE_TTS_SPEED_PRESETS.map((preset) => preset.label)).toEqual(['1.0×', '0.85×', '0.7×'])
  })
})
