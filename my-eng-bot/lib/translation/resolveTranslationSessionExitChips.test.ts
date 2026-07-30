import { describe, expect, it } from 'vitest'
import { resolveTranslationSessionExitChips } from '@/lib/translation/resolveTranslationSessionExitChips'

describe('resolveTranslationSessionExitChips', () => {
  it('returns Gotovo then Praktika when completed', () => {
    const chips = resolveTranslationSessionExitChips('completed')
    expect(chips.map((c) => c.id)).toEqual(['done', 'practice'])
    expect(chips.map((c) => c.labelRu)).toEqual(['Готово', 'Практика'])
  })

  it('returns empty for non-completed statuses', () => {
    expect(resolveTranslationSessionExitChips('not_started')).toEqual([])
    expect(resolveTranslationSessionExitChips('in_progress')).toEqual([])
    expect(resolveTranslationSessionExitChips('abandoned')).toEqual([])
    expect(resolveTranslationSessionExitChips(null)).toEqual([])
    expect(resolveTranslationSessionExitChips(undefined)).toEqual([])
  })
})
