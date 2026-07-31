import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH, formatFooterDynamicLine } from '@/lib/footerVoice'
import { createDefaultTranslationSession } from '@/lib/translation/translationSessionEconomy'
import {
  buildTranslationFooterView,
  resolveTranslationFooterMoment,
} from '@/lib/translation/translationFooter'
import { TRANSLATION_FOOTER_TOP, formatTranslationFooterTop } from '@/lib/uiCopy/translationFooter'

describe('translationFooter', () => {
  it('keeps all top-line templates within footer max length', () => {
    for (const moment of Object.keys(TRANSLATION_FOOTER_TOP) as (keyof typeof TRANSLATION_FOOTER_TOP)[]) {
      for (const audience of ['adult', 'child'] as const) {
        const raw = formatTranslationFooterTop(TRANSLATION_FOOTER_TOP[moment][audience], {
          n: 8,
          xp: 40,
        })
        const shown = formatFooterDynamicLine(raw)
        expect(shown.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
      }
    }
  })

  it('builds session meter for in-progress session', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 3,
      sessionXpAwarded: 12,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'success',
      audience: 'adult',
    })
    expect(view.sessionMeter.current).toBe(3)
    expect(view.sessionMeter.target).toBe(8)
    expect(view.sessionMeter.sessionXp).toBe(12)
    expect(view.sessionMeter.statusLabel).toBe('в работе')
    expect(view.dynamicText).toContain('3/8')
    expect(view.dynamicText).toContain('+4 XP')
  })

  it('shows цель at zero progress even when session is in_progress', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 0,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'idle',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('цель')
  })

  it('shows готово when session is completed', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'completed' as const,
      progress: 8,
      sessionXpAwarded: 40,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'post_complete',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('готово')
  })

  it('shows лимит when daily XP cap is reached', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 0,
      dailyXpAwarded: 40,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'daily_cap',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('лимит')
  })

  it('resolves checking while loading', () => {
    expect(
      resolveTranslationFooterMoment({
        loading: true,
        protocolStatus: 'success',
        session: createDefaultTranslationSession(),
        justCompleted: false,
      })
    ).toBe('checking')
  })
})
