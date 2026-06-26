import { describe, expect, it } from 'vitest'
import {
  cyclePracticeTtsSpeedIndex,
  getPracticeTtsRateByIndex,
  getPracticeTtsSpeedPreset,
  PRACTICE_TTS_SPEED_PRESETS,
} from '@/lib/practice/practiceTtsSpeedPresets'

describe('practiceTtsSpeedPresets', () => {
  it('cycles through 1×, 0.8× and 0.6×', () => {
    expect(getPracticeTtsSpeedPreset(0).label).toBe('1×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(0)).label).toBe('0.8×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(1)).label).toBe('0.6×')
    expect(getPracticeTtsSpeedPreset(cyclePracticeTtsSpeedIndex(2)).label).toBe('1×')
  })

  it('maps preset index to playback rate', () => {
    expect(getPracticeTtsRateByIndex(0)).toBe(1)
    expect(getPracticeTtsRateByIndex(1)).toBe(0.8)
    expect(getPracticeTtsRateByIndex(2)).toBe(0.6)
  })

  it('exposes standard multiplier labels', () => {
    expect(PRACTICE_TTS_SPEED_PRESETS.map((preset) => preset.label)).toEqual(['1×', '0.8×', '0.6×'])
  })
})
