import { describe, expect, it } from 'vitest'
import { resolvePracticeFooterTopLine } from '@/lib/practice/practiceCoach'

describe('resolvePracticeFooterTopLine', () => {
  it('keeps correction above checking, reactions and rewards', () => {
    const message = resolvePracticeFooterTopLine({
      state: 'correction',
      correctionPhase: 'voiceLocked',
      audience: 'child',
      completionRewardLine: '+10 к уровню',
    })
    expect(message.intent).toBe('correction_pause')
    expect(message.text).not.toContain('Следующее задание')
  })

  it('does not celebrate wrong-limit advance', () => {
    const message = resolvePracticeFooterTopLine({
      state: 'feedback',
      audience: 'child',
      isWrongLimitAdvance: true,
    })
    expect(message.intent).toBe('wrong_limit')
    expect(message.tone).not.toBe('success')
  })

  it('avoids the previous phrase id when a pool has alternatives', () => {
    const message = resolvePracticeFooterTopLine({
      state: 'feedback',
      audience: 'child',
      previousPhraseId: 'first-try-c1',
    })
    expect(message.phraseId).toBe('first-try-c2')
  })

  it('keeps child copy free of formal imperatives', () => {
    for (const state of ['idle', 'checking', 'correction', 'feedback'] as const) {
      const text = resolvePracticeFooterTopLine({ state, audience: 'child' }).text
      expect(text).not.toMatch(/Вы|Прочитайте/)
      expect(text.length).toBeLessThanOrEqual(38)
    }
  })

  it('resolves forgiveness offer, zero and applied intents', () => {
    expect(
      resolvePracticeFooterTopLine({
        state: 'idle',
        audience: 'child',
        forgivenessIntent: 'offer',
      }).intent
    ).toBe('forgiveness_offer')
    expect(
      resolvePracticeFooterTopLine({
        state: 'correction',
        audience: 'child',
        forgivenessIntent: 'zero',
      }).intent
    ).toBe('forgiveness_zero')
    expect(
      resolvePracticeFooterTopLine({
        state: 'correction',
        audience: 'child',
        forgivenessIntent: 'applied',
      }).intent
    ).toBe('forgiveness_applied')
  })
})
