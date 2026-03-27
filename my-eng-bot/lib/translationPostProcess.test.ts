import { describe, expect, it } from 'vitest'
import { applyTranslationQualityGate, normalizeTranslationResult } from './translationPostProcess'

describe('translationPostProcess', () => {
  it('fixes inspires leak in Russian translation', () => {
    const raw = "Вы сейчас попробуете 'inspires'?"
    const out = applyTranslationQualityGate(normalizeTranslationResult(raw))
    expect(out).toContain('вдохновляет')
    expect(out).not.toMatch(/inspires/i)
  })

  it('normalizes hobby phrasing (Cyrillic line start)', () => {
    const raw = 'Какое хобби вы недавно увлекались?'
    const out = applyTranslationQualityGate(normalizeTranslationResult(raw))
    expect(out).toContain('Каким хобби')
  })
})
