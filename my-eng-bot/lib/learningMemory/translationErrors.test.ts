import { describe, expect, it } from 'vitest'
import { extractTranslationErrorBlocks } from '@/lib/learningMemory/translationErrors'

describe('extractTranslationErrorBlocks', () => {
  it('finds non-empty errors', () => {
    const raw = `Комментарий_перевод: ок
Ошибки:
- "I go" → "I went" (past)
Скажи: I went home yesterday.`
    const r = extractTranslationErrorBlocks(raw)
    expect(r.errorsBlock).toContain('I go')
    expect(r.sayBlock).toContain('I went home')
  })

  it('ignores empty dash errors', () => {
    const r = extractTranslationErrorBlocks('Ошибки:\n-\nСкажи: Hello.')
    expect(r.errorsBlock).toBeNull()
  })
})
