import { describe, expect, it } from 'vitest'
import {
  buildVoiceLabPasswordForDate,
  getMoscowDateKey,
  isValidVoiceLabPassword,
} from './gatePassword'

describe('voiceLab gatePassword', () => {
  it('builds KSA0904726! for Thursday 9 July 2026 Moscow', () => {
    const date = new Date('2026-07-09T12:00:00.000Z')
    expect(buildVoiceLabPasswordForDate(date)).toBe('KSA0904726!')
    expect(isValidVoiceLabPassword('KSA0904726!', date)).toBe(true)
    expect(isValidVoiceLabPassword('09074', date)).toBe(false)
    expect(isValidVoiceLabPassword('KSA0907426!', date)).toBe(false)
  })

  it('builds KSA1007526! for Friday 10 July 2026 Moscow', () => {
    const date = new Date('2026-07-10T12:00:00.000Z')
    expect(buildVoiceLabPasswordForDate(date)).toBe('KSA1007526!')
  })

  it('builds KSA2330926! for Wednesday 23 September 2026 Moscow', () => {
    const date = new Date('2026-09-23T12:00:00.000Z')
    expect(buildVoiceLabPasswordForDate(date)).toBe('KSA2330926!')
  })

  it('inserts Sunday weekday at 7th digit position', () => {
    // 2026-07-12 is Sunday → base 120726, N=7 → 1207267
    const date = new Date('2026-07-12T12:00:00.000Z')
    expect(buildVoiceLabPasswordForDate(date)).toBe('KSA1207267!')
  })

  it('always has length 11 with 7 digits', () => {
    const pwd = buildVoiceLabPasswordForDate(new Date('2026-07-09T12:00:00.000Z'))
    expect(pwd).toHaveLength(11)
    expect(pwd.replace(/\D/g, '')).toHaveLength(7)
    expect(pwd.startsWith('KSA')).toBe(true)
    expect(pwd.endsWith('!')).toBe(true)
  })

  it('returns Moscow date key', () => {
    expect(getMoscowDateKey(new Date('2026-07-09T12:00:00.000Z'))).toBe('2026-07-09')
  })
})
