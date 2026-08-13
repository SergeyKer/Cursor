import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH, formatFooterDynamicLine } from '@/lib/footerVoice'
import {
  buildCommunicationFooterView,
  resolveCommunicationFooterMoment,
} from './communicationFooter'
import {
  COMMUNICATION_DAILY_GLOBAL_XP_CAP,
  createDefaultCommunicationSession,
} from './communicationSessionEconomy'
import {
  COMMUNICATION_FOOTER_TOP,
  formatCommunicationFooterTop,
} from '@/lib/uiCopy/communicationFooter'

describe('communicationFooter', () => {
  it('keeps all top lines within 38 chars', () => {
    for (const moment of Object.keys(COMMUNICATION_FOOTER_TOP) as Array<
      keyof typeof COMMUNICATION_FOOTER_TOP
    >) {
      for (const audience of ['adult', 'child'] as const) {
        const line = formatFooterDynamicLine(
          formatCommunicationFooterTop(COMMUNICATION_FOOTER_TOP[moment][audience], {
            n: 8,
            xp: 24,
            r: 8,
          })
        )
        expect(line.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
      }
    }
  })

  it('uses no_xp when the last step awarded zero XP', () => {
    const session = {
      ...createDefaultCommunicationSession(),
      status: 'in_progress' as const,
      progress: 2,
      lastAwardedAssistantKey: 'c:1',
      lastStepAwardedXp: 0,
    }
    expect(
      resolveCommunicationFooterMoment({
        loading: false,
        lastOutcome: 'no_xp',
        session,
        justCompleted: false,
      })
    ).toBe('no_xp')
    const view = buildCommunicationFooterView({
      session,
      moment: 'no_xp',
      audience: 'child',
    })
    expect(view.dynamicText).toMatch(/Добавь слово на En/)
    expect(view.dynamicText).not.toMatch(/XP/)
    expect(view.sessionMeter.sessionXp).toBe(0)
  })

  it('keeps round coaching when daily XP cap is already full', () => {
    const session = {
      ...createDefaultCommunicationSession(),
      status: 'in_progress' as const,
      progress: 2,
      dailyXpAwarded: COMMUNICATION_DAILY_GLOBAL_XP_CAP,
      lastStepAwardedXp: 2,
    }
    expect(
      resolveCommunicationFooterMoment({
        loading: false,
        lastOutcome: 'success',
        session,
        justCompleted: false,
      })
    ).toBe('success')
    const view = buildCommunicationFooterView({
      session,
      moment: 'success',
      audience: 'adult',
    })
    expect(view.dynamicText).toBe('Идём дальше. 2/8.')
    expect(view.sessionMeter.statusLabel).toBe('🎯6')
    expect(view.sessionMeter.fillPercent).toBe(25)
  })

  it('uses idle_mid after progress and ignores voice override', () => {
    const session = {
      ...createDefaultCommunicationSession(),
      status: 'in_progress' as const,
      progress: 3,
    }
    const view = buildCommunicationFooterView({
      session,
      moment: 'idle',
      audience: 'adult',
      voiceTopOverride: 'говори на En/Ru - ответ на английском',
    })
    expect(view.dynamicText).toBe('Ещё 5 до цели. 3/8.')
  })

  it('uses voice override only at idle progress 0', () => {
    const session = createDefaultCommunicationSession()
    const view = buildCommunicationFooterView({
      session,
      moment: 'idle',
      audience: 'adult',
      voiceTopOverride: 'говори на En/Ru - ответ на английском',
    })
    expect(view.dynamicText).toBe('говори на En/Ru - ответ на английском')
  })

  it('uses complete_zero when 8/8 with no session XP', () => {
    const session = {
      ...createDefaultCommunicationSession(),
      status: 'completed' as const,
      progress: 8,
      sessionXpAwarded: 0,
      lastStepAwardedXp: 0,
    }
    expect(
      resolveCommunicationFooterMoment({
        loading: false,
        lastOutcome: 'no_xp',
        session,
        justCompleted: true,
      })
    ).toBe('complete_zero')
  })
})
