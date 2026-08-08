import { describe, expect, it } from 'vitest'
import {
  TUTOR_DAILY_GLOBAL_XP_CAP,
  TUTOR_XP_EXPLAIN,
  TUTOR_XP_MICRO_FINALE,
  clampTutorDailyXp,
  createDefaultTutorSession,
  tutorExplainKey,
  tutorMicroKey,
} from './tutorSessionEconomy'

describe('tutorSessionEconomy', () => {
  it('canon constants', () => {
    expect(TUTOR_XP_EXPLAIN).toBe(1)
    expect(TUTOR_XP_MICRO_FINALE).toBe(6)
    expect(TUTOR_DAILY_GLOBAL_XP_CAP).toBe(14)
    expect(TUTOR_XP_EXPLAIN + TUTOR_XP_MICRO_FINALE).toBe(7)
    expect((TUTOR_XP_EXPLAIN + TUTOR_XP_MICRO_FINALE) * 2).toBe(14)
  })

  it('clamp daily', () => {
    expect(clampTutorDailyXp(0, 6)).toBe(6)
    expect(clampTutorDailyXp(12, 6)).toBe(2)
    expect(clampTutorDailyXp(14, 1)).toBe(0)
  })

  it('keys and default', () => {
    expect(tutorExplainKey('pp')).toBe('r:e:pp')
    expect(tutorMicroKey('pp')).toBe('r:m:pp')
    expect(tutorExplainKey('  ')).toBe('')
    expect(createDefaultTutorSession().status).toBe('not_started')
  })
})
