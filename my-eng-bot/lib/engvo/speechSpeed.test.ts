import { describe, expect, it } from 'vitest'
import {
  clampEngvoRealtimeSpeed,
  engvoSpeechSpeedFromPreset,
  getEngvoDefaultSpeechSpeedPreset,
} from './constants'

describe('Engvo speech speed helpers', () => {
  it('clamps speed to Realtime API bounds', () => {
    expect(clampEngvoRealtimeSpeed(1)).toBe(1)
    expect(clampEngvoRealtimeSpeed(0)).toBe(0.25)
    expect(clampEngvoRealtimeSpeed(2)).toBe(1.5)
    expect(clampEngvoRealtimeSpeed(Number.NaN)).toBe(1)
  })

  it('maps presets to numeric speed', () => {
    expect(engvoSpeechSpeedFromPreset('conversational')).toBe(1.0)
    expect(engvoSpeechSpeedFromPreset('normal')).toBe(0.85)
    expect(engvoSpeechSpeedFromPreset('calm')).toBe(0.7)
  })

  it('defaults preset by audience', () => {
    expect(getEngvoDefaultSpeechSpeedPreset('child')).toBe('normal')
    expect(getEngvoDefaultSpeechSpeedPreset('adult')).toBe('conversational')
  })
})
