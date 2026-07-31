import { describe, expect, it } from 'vitest'
import { createDefaultDialogueSession } from '@/lib/dialogue/dialogueSessionEconomy'
import {
  buildDialogueFooterView,
  dialogueStatusLabel,
  resolveDialogueFooterMoment,
} from '@/lib/dialogue/dialogueFooter'

describe('dialogueFooter', () => {
  it('uses glyph status labels', () => {
    expect(
      dialogueStatusLabel({
        moment: 'idle',
        remaining: 8,
        status: 'in_progress',
        dailyXpAwarded: 0,
      })
    ).toBe('🎯8')
    expect(
      dialogueStatusLabel({
        moment: 'error',
        remaining: 5,
        status: 'in_progress',
        dailyXpAwarded: 0,
      })
    ).toBe('🔁')
    expect(
      dialogueStatusLabel({
        moment: 'complete',
        remaining: 0,
        status: 'completed',
        dailyXpAwarded: 28,
      })
    ).toBe('🏁')
    expect(
      dialogueStatusLabel({
        moment: 'daily_cap',
        remaining: 3,
        status: 'in_progress',
        dailyXpAwarded: 28,
      })
    ).toBe('👍')
  })

  it('prefers complete over daily cap', () => {
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
  })
})
