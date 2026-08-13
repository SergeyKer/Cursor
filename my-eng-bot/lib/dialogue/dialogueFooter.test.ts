import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH, formatFooterDynamicLine } from '@/lib/footerVoice'
import {
  DIALOGUE_DAILY_GLOBAL_XP_CAP,
  createDefaultDialogueSession,
} from '@/lib/dialogue/dialogueSessionEconomy'
import {
  buildDialogueFooterView,
  dialogueStatusLabel,
  resolveDialogueFooterMoment,
} from '@/lib/dialogue/dialogueFooter'
import { DIALOGUE_FOOTER_TOP, formatDialogueFooterTop } from '@/lib/uiCopy/dialogueFooter'

describe('dialogueFooter', () => {
  it('keeps all top lines within 38 chars', () => {
    for (const moment of Object.keys(DIALOGUE_FOOTER_TOP) as Array<keyof typeof DIALOGUE_FOOTER_TOP>) {
      for (const audience of ['adult', 'child'] as const) {
        const line = formatFooterDynamicLine(
          formatDialogueFooterTop(DIALOGUE_FOOTER_TOP[moment][audience], {
            n: 8,
            xp: 28,
            r: 8,
          })
        )
        expect(line.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
      }
    }
  })

  it('uses glyph status labels', () => {
    expect(
      dialogueStatusLabel({
        moment: 'idle',
        remaining: 8,
        status: 'in_progress',
      })
    ).toBe('🎯8')
    expect(
      dialogueStatusLabel({
        moment: 'error',
        remaining: 5,
        status: 'in_progress',
      })
    ).toBe('🔁')
    expect(
      dialogueStatusLabel({
        moment: 'complete',
        remaining: 0,
        status: 'completed',
      })
    ).toBe('🏁')
    expect(
      dialogueStatusLabel({
        moment: 'success',
        remaining: 3,
        status: 'in_progress',
      })
    ).toBe('🎯3')
  })

  it('prefers complete over an already full daily cap', () => {
    const session = {
      ...createDefaultDialogueSession(),
      status: 'completed' as const,
      progress: 8,
      dailyXpAwarded: 28,
    }
    expect(
      resolveDialogueFooterMoment({
        loading: false,
        lastAssistantContent: null,
        lastOutcome: null,
        session,
        justCompleted: false,
      })
    ).toBe('post_complete')
  })

  it('keeps round coaching when daily XP cap is already full', () => {
    const session = {
      ...createDefaultDialogueSession(),
      status: 'in_progress' as const,
      progress: 2,
      dailyXpAwarded: DIALOGUE_DAILY_GLOBAL_XP_CAP,
    }
    expect(
      resolveDialogueFooterMoment({
        loading: false,
        lastAssistantContent: null,
        lastOutcome: 'success',
        session,
        justCompleted: false,
      })
    ).toBe('success')
    const view = buildDialogueFooterView({
      session,
      moment: 'success',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('🎯6')
    expect(view.dynamicText).toBe('Верно. 2/8.')
  })

  it('prefers repeat error over daily cap', () => {
    const session = {
      ...createDefaultDialogueSession(),
      status: 'in_progress' as const,
      progress: 2,
      dailyXpAwarded: DIALOGUE_DAILY_GLOBAL_XP_CAP,
    }
    expect(
      resolveDialogueFooterMoment({
        loading: false,
        lastAssistantContent: 'Повтори: Hello',
        lastOutcome: 'success',
        session,
        justCompleted: false,
      })
    ).toBe('error')
  })

  it('builds meter from session', () => {
    const session = {
      ...createDefaultDialogueSession(),
      status: 'in_progress' as const,
      progress: 3,
      sessionXpAwarded: 9,
    }
    const view = buildDialogueFooterView({
      session,
      moment: 'success',
      audience: 'adult',
    })
    expect(view.sessionMeter.current).toBe(3)
    expect(view.sessionMeter.target).toBe(8)
    expect(view.sessionMeter.statusLabel).toBe('🎯5')
    expect(view.dynamicText).toContain('3/8')
    expect(view.dynamicText).not.toMatch(/XP/)
  })

  it('uses idle_mid after progress', () => {
    const session = {
      ...createDefaultDialogueSession(),
      status: 'in_progress' as const,
      progress: 3,
    }
    const view = buildDialogueFooterView({
      session,
      moment: 'idle',
      audience: 'adult',
    })
    expect(view.dynamicText).toBe('Ещё 5 до цели. 3/8.')
  })
})
