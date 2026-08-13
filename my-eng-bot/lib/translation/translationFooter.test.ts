import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH, formatFooterDynamicLine } from '@/lib/footerVoice'
import {
  TRANSLATION_DAILY_GLOBAL_XP_CAP,
  createDefaultTranslationSession,
} from '@/lib/translation/translationSessionEconomy'
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
          r: 8,
        })
        const shown = formatFooterDynamicLine(raw)
        expect(shown.length).toBeLessThanOrEqual(FOOTER_DYNAMIC_MAX_LENGTH)
      }
    }
  })

  it('builds session meter with glyph status labels', () => {
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
    expect(view.sessionMeter.statusLabel).toBe('🎯5')
    expect(view.dynamicText).toContain('3/8')
    expect(view.dynamicText).not.toContain('+4 XP')
  })

  it('shows 🎯8 at zero progress', () => {
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
    expect(view.sessionMeter.statusLabel).toBe('🎯8')
  })

  it('shows 🏁 when session is completed', () => {
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
    expect(view.sessionMeter.statusLabel).toBe('🏁')
  })

  it('keeps round coaching when daily XP cap is already full', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 2,
      dailyXpAwarded: TRANSLATION_DAILY_GLOBAL_XP_CAP,
      sessionStartedAt: new Date().toISOString(),
    }
    expect(
      resolveTranslationFooterMoment({
        loading: false,
        protocolStatus: 'success',
        session,
        justCompleted: false,
      })
    ).toBe('success')
    const view = buildTranslationFooterView({
      session,
      moment: 'success',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('🎯6')
    expect(view.dynamicText).toBe('Верно. 2/8.')
  })

  it('shows 🔁 on error moment', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 2,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'error',
      audience: 'adult',
    })
    expect(view.sessionMeter.statusLabel).toBe('🔁')
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

  it('uses idle_mid after progress', () => {
    const session = {
      ...createDefaultTranslationSession(),
      status: 'in_progress' as const,
      progress: 3,
      sessionStartedAt: new Date().toISOString(),
    }
    const view = buildTranslationFooterView({
      session,
      moment: 'idle',
      audience: 'adult',
    })
    expect(view.dynamicText).toBe('Ещё 5 до цели. 3/8.')
  })
})
