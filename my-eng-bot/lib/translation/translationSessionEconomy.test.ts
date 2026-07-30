import { describe, expect, it } from 'vitest'
import {
  TRANSLATION_DAILY_GLOBAL_XP_CAP,
  TRANSLATION_SESSION_LENGTH,
  TRANSLATION_XP_COMPLETION,
  TRANSLATION_XP_SOFT_FAIL,
  TRANSLATION_XP_SUCCESS,
  clampTranslationDailyXp,
  createDefaultTranslationSession,
  hashTranslationAssistantKey,
  translationFillPercent,
  xpForTranslationStep,
} from '@/lib/translation/translationSessionEconomy'

describe('translationSessionEconomy', () => {
  it('defines session constants', () => {
    expect(TRANSLATION_SESSION_LENGTH).toBe(8)
    expect(TRANSLATION_XP_SUCCESS).toBe(4)
    expect(TRANSLATION_XP_SOFT_FAIL).toBe(1)
    expect(TRANSLATION_XP_COMPLETION).toBe(12)
    expect(TRANSLATION_DAILY_GLOBAL_XP_CAP).toBe(40)
  })

  it('maps step XP by outcome', () => {
    expect(xpForTranslationStep('success')).toBe(4)
    expect(xpForTranslationStep('soft_fail')).toBe(1)
  })

  it('clamps daily XP against remaining budget', () => {
    expect(clampTranslationDailyXp(0, 44)).toBe(40)
    expect(clampTranslationDailyXp(35, 12)).toBe(5)
    expect(clampTranslationDailyXp(40, 4)).toBe(0)
    expect(clampTranslationDailyXp(-1, 10)).toBe(10)
  })

  it('computes fill percent for the session bar', () => {
    expect(translationFillPercent(0)).toBe(0)
    expect(translationFillPercent(3)).toBe(38)
    expect(translationFillPercent(8)).toBe(100)
    expect(translationFillPercent(99)).toBe(100)
  })

  it('hashes assistant content stably for idempotency', () => {
    const a = hashTranslationAssistantKey('Комментарий: Отлично.\nПереведи далее: Я дома.')
    const b = hashTranslationAssistantKey('Комментарий: Отлично.\nПереведи далее: Я дома.')
    const c = hashTranslationAssistantKey('Комментарий: Отлично.\nПереведи далее: Ты дома.')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('creates empty default session', () => {
    expect(createDefaultTranslationSession()).toEqual({
      target: 8,
      progress: 0,
      sessionXpAwarded: 0,
      status: 'not_started',
      sessionStartedAt: null,
      lastAwardedAssistantKey: null,
      dailyXpAwarded: 0,
      dailyXpDate: null,
    })
  })
})
