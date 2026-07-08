import { describe, expect, it } from 'vitest'
import {
  clampEngvoRealtimeSpeed,
  engvoSpeechSpeedFromPreset,
  getEngvoDefaultSpeechSpeedPreset,
} from './constants'
import { resolveEngvoSpeechSpeedPreset } from './preferences'

describe('Engvo speech speed helpers', () => {
  it('clamps speed to Realtime API bounds', () => {
    expect(clampEngvoRealtimeSpeed(1)).toBe(1)
    expect(clampEngvoRealtimeSpeed(0)).toBe(0.25)
    expect(clampEngvoRealtimeSpeed(2)).toBe(1.5)
    expect(clampEngvoRealtimeSpeed(Number.NaN)).toBe(1)
  })

  it('maps presets to numeric speed', () => {
    expect(engvoSpeechSpeedFromPreset('conversational')).toBe(1.0)
    expect(engvoSpeechSpeedFromPreset('normal')).toBe(0.9)
    expect(engvoSpeechSpeedFromPreset('calm')).toBe(0.8)
  })

  it('defaults preset by audience when level is not A1', () => {
    expect(getEngvoDefaultSpeechSpeedPreset('child', 'a2')).toBe('normal')
    expect(getEngvoDefaultSpeechSpeedPreset('adult', 'b1')).toBe('conversational')
  })

  it('defaults to calm speech speed for A1 at any audience', () => {
    expect(getEngvoDefaultSpeechSpeedPreset('child', 'a1')).toBe('calm')
    expect(getEngvoDefaultSpeechSpeedPreset('adult', 'a1')).toBe('calm')
  })

  it('resolveEngvoSpeechSpeedPreset prefers stored user choice', () => {
    expect(
      resolveEngvoSpeechSpeedPreset({
        audience: 'child',
        level: 'a1',
        stored: 'conversational',
      })
    ).toBe('conversational')
    expect(
      resolveEngvoSpeechSpeedPreset({
        audience: 'adult',
        level: 'a1',
        stored: null,
      })
    ).toBe('calm')
  })
})
