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

  it('fixes past drift for have-you-been question', () => {
    const source = 'What have you been enjoying doing during your free time lately?'
    const raw = 'Чем вы обычно занимались в своё свободное время?'
    const out = applyTranslationQualityGate(normalizeTranslationResult(raw, source))
    expect(out).toContain('в последнее время')
    expect(out).toContain('нравится заниматься')
    expect(out).not.toMatch(/\bзанимались\b/i)
  })
})
