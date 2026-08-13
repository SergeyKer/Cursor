import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH } from '@/lib/footerVoice'
import {
  buildCommunicationFooterView,
  resolveCommunicationFooterMoment,
} from './communicationFooter'
import { createDefaultCommunicationSession } from './communicationSessionEconomy'
import { COMMUNICATION_FOOTER_TOP } from '@/lib/uiCopy/communicationFooter'

describe('communicationFooter', () => {
  it('keeps all top lines within 38 chars', () => {
    for (const moment of Object.keys(COMMUNICATION_FOOTER_TOP) as Array<
      keyof typeof COMMUNICATION_FOOTER_TOP
    >) {
      for (const audience of ['adult', 'child'] as const) {
        const line = COMMUNICATION_FOOTER_TOP[moment][audience]
          .replaceAll('{n}', '8')
          .replaceAll('{xp}', '24')
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
    expect(view.dynamicText).toMatch(/Без XP/)
    expect(view.sessionMeter.sessionXp).toBe(0)
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
