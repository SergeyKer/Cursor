import { describe, expect, it } from 'vitest'
import {
  DIALOGUE_DAILY_GLOBAL_XP_CAP,
  DIALOGUE_SESSION_LENGTH,
  DIALOGUE_XP_COMPLETION,
  DIALOGUE_XP_RECOVERED,
  DIALOGUE_XP_SUCCESS,
  clampDialogueDailyXp,
  createDefaultDialogueSession,
  dialogueFillPercent,
  hashDialogueAssistantKey,
  xpForDialogueStep,
} from '@/lib/dialogue/dialogueSessionEconomy'

describe('dialogueSessionEconomy', () => {
  it('defines session constants', () => {
    expect(DIALOGUE_SESSION_LENGTH).toBe(8)
    expect(DIALOGUE_XP_SUCCESS).toBe(3)
    expect(DIALOGUE_XP_RECOVERED).toBe(1)
    expect(DIALOGUE_XP_COMPLETION).toBe(10)
    expect(DIALOGUE_DAILY_GLOBAL_XP_CAP).toBe(28)
  })

  it('maps step XP by outcome', () => {
    expect(xpForDialogueStep('success')).toBe(3)
    expect(xpForDialogueStep('recovered')).toBe(1)
  })

  it('clamps daily XP against remaining budget', () => {
    expect(clampDialogueDailyXp(0, 34)).toBe(28)
    expect(clampDialogueDailyXp(25, 10)).toBe(3)
    expect(clampDialogueDailyXp(28, 3)).toBe(0)
    expect(clampDialogueDailyXp(-1, 10)).toBe(10)
  })

  it('computes fill percent for the session bar', () => {
    expect(dialogueFillPercent(0)).toBe(0)
    expect(dialogueFillPercent(3)).toBe(38)
    expect(dialogueFillPercent(8)).toBe(100)
    expect(dialogueFillPercent(99)).toBe(100)
  })

  it('hashes assistant content stably for idempotency', () => {
    const a = hashDialogueAssistantKey('What did you do yesterday?')
    const b = hashDialogueAssistantKey('What did you do yesterday?')
    const c = hashDialogueAssistantKey('What do you do every day?')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a.startsWith('d:')).toBe(true)
  })

  it('creates empty default session', () => {
    expect(createDefaultDialogueSession()).toEqual({
      target: 8,
      progress: 0,
      sessionXpAwarded: 0,
      status: 'not_started',
      sessionStartedAt: null,
      completedAt: null,
      lastAwardedAssistantKey: null,
      dailyXpAwarded: 0,
      dailyXpDate: null,
    })
  })
})
