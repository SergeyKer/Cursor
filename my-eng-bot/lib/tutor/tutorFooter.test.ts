import { describe, expect, it } from 'vitest'
import { FOOTER_DYNAMIC_MAX_LENGTH, formatFooterDynamicLine } from '@/lib/footerVoice'
import { TUTOR_FOOTER_TOP } from '@/lib/uiCopy/tutorFooter'
import {
  buildTutorFooterView,
  resolveTutorFooterMoment,
  tutorMicroStatusLabel,
} from '@/lib/tutor/tutorFooter'

describe('resolveTutorFooterMoment', () => {
  it('prefers micro_loading before pack', () => {
    expect(
      resolveTutorFooterMoment({
        busy: true,
        loadingMicro: true,
        microPhase: 'idle',
        hasMicroPack: false,
        hasLastExplain: true,
        hasTriageChips: false,
      })
    ).toBe('micro_loading')
  })

  it('maps revealing/active/finale when pack exists', () => {
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'revealing',
        hasMicroPack: true,
        hasLastExplain: true,
        hasTriageChips: false,
      })
    ).toBe('micro_revealing')
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'active',
        hasMicroPack: true,
        hasLastExplain: true,
        hasTriageChips: false,
      })
    ).toBe('micro_active')
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'finale',
        hasMicroPack: true,
        hasLastExplain: true,
        hasTriageChips: false,
      })
    ).toBe('micro_finale')
  })

  it('falls back to triage / post_explain / idle', () => {
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'idle',
        hasMicroPack: false,
        hasLastExplain: false,
        hasTriageChips: true,
      })
    ).toBe('triage')
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'idle',
        hasMicroPack: false,
        hasLastExplain: true,
        hasTriageChips: false,
      })
    ).toBe('post_explain')
    expect(
      resolveTutorFooterMoment({
        busy: false,
        loadingMicro: false,
        microPhase: 'idle',
        hasMicroPack: false,
        hasLastExplain: false,
        hasTriageChips: false,
      })
    ).toBe('idle')
  })
})

describe('buildTutorFooterView', () => {
  it('keeps sessionMeter null outside micro pack moments', () => {
    for (const moment of ['idle', 'triage', 'busy_explain', 'post_explain', 'micro_loading'] as const) {
      const view = buildTutorFooterView({ moment, audience: 'adult' })
      expect(view.sessionMeter).toBeNull()
      expect(view.staticText).toBe('')
    }
  })

  it('builds meter from microIndex / total', () => {
    const view = buildTutorFooterView({
      moment: 'micro_active',
      audience: 'adult',
      microIndex: 1,
      microTotal: 4,
      sessionXp: 1,
    })
    expect(view.sessionMeter).toEqual({
      current: 1,
      target: 4,
      sessionXp: 1,
      statusLabel: '🎯3',
      fillPercent: 25,
    })
  })

  it('fills meter on finale', () => {
    const view = buildTutorFooterView({
      moment: 'micro_finale',
      audience: 'child',
      microIndex: 4,
      microTotal: 4,
      sessionXp: 7,
    })
    expect(view.sessionMeter?.current).toBe(4)
    expect(view.sessionMeter?.target).toBe(4)
    expect(view.sessionMeter?.statusLabel).toBe('🏁')
    expect(view.sessionMeter?.fillPercent).toBe(100)
    expect(view.sessionMeter?.sessionXp).toBe(7)
  })

  it('keeps TOP copy within footer limit', () => {
    for (const moment of Object.keys(TUTOR_FOOTER_TOP) as Array<keyof typeof TUTOR_FOOTER_TOP>) {
      for (const audience of ['adult', 'child'] as const) {
        const view = buildTutorFooterView({
          moment,
          audience,
          microIndex: 2,
          microTotal: 5,
        })
        expect(formatFooterDynamicLine(view.dynamicText).length).toBeLessThanOrEqual(
          FOOTER_DYNAMIC_MAX_LENGTH
        )
      }
    }
  })
})

describe('tutorMicroStatusLabel', () => {
  it('uses finish glyph only on finale', () => {
    expect(tutorMicroStatusLabel({ moment: 'micro_finale', remaining: 0 })).toBe('🏁')
    expect(tutorMicroStatusLabel({ moment: 'micro_active', remaining: 2 })).toBe('🎯2')
  })
})
