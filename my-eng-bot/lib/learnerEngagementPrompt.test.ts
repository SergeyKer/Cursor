import { describe, expect, it } from 'vitest'
import {
  buildTranslationSingleTenseExplanationRule,
  buildTranslationSupportivePraisePriorityRule,
} from '@/lib/learnerEngagementPrompt'

describe('buildTranslationSupportivePraisePriorityRule', () => {
  it('содержит маркеры приоритета похвалы для Комментарий_перевод', () => {
    const block = buildTranslationSupportivePraisePriorityRule()
    expect(block).toContain('Supportive praise priority for ERROR line')
    expect(block).toContain('Комментарий_перевод:')
    expect(block).toMatch(/phrasal|particle/i)
    expect(block).toMatch(/collocation/i)
    expect(block).toMatch(/preposition/i)
    expect(block).toMatch(/frequency|adverb/i)
    expect(block).toMatch(/CEFR/i)
    expect(block).toMatch(/STRUCTURE|structure|macro/i)
  })
})

describe('buildTranslationSingleTenseExplanationRule', () => {
  it('ссылается на приоритет похвалы и не провоцирует похвалу за вспомогательные как главный фокус', () => {
    const block = buildTranslationSingleTenseExplanationRule()
    expect(block).toContain('Supportive praise priority for ERROR line')
    expect(block).toMatch(/Do not use this line to praise bare auxiliaries/i)
  })
})
