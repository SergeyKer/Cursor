import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_DAILY_GLOBAL_XP_CAP,
  COMMUNICATION_SESSION_LENGTH,
  COMMUNICATION_XP_COMPLETION,
  COMMUNICATION_XP_STEP,
  clampCommunicationDailyXp,
  communicationFillPercent,
  createDefaultCommunicationSession,
  hashCommunicationAssistantKey,
  xpForCommunicationStep,
} from './communicationSessionEconomy'

describe('communicationSessionEconomy', () => {
  it('canon constants', () => {
    expect(COMMUNICATION_SESSION_LENGTH).toBe(8)
    expect(COMMUNICATION_XP_STEP).toBe(2)
    expect(COMMUNICATION_XP_COMPLETION).toBe(8)
    expect(COMMUNICATION_DAILY_GLOBAL_XP_CAP).toBe(24)
  })

  it('session max equals daily cap', () => {
    expect(8 * COMMUNICATION_XP_STEP + COMMUNICATION_XP_COMPLETION).toBe(24)
  })

  it('xp and clamp', () => {
    expect(xpForCommunicationStep()).toBe(2)
    expect(clampCommunicationDailyXp(20, 2)).toBe(2)
    expect(clampCommunicationDailyXp(23, 2)).toBe(1)
    expect(clampCommunicationDailyXp(24, 2)).toBe(0)
  })

  it('fill percent and default', () => {
    expect(communicationFillPercent(0)).toBe(0)
    expect(communicationFillPercent(4)).toBe(50)
    expect(communicationFillPercent(8)).toBe(100)
    expect(createDefaultCommunicationSession().status).toBe('not_started')
  })

  it('hashes assistant key with c: prefix', () => {
    expect(hashCommunicationAssistantKey('Hello')).toMatch(/^c:/)
  })
})
