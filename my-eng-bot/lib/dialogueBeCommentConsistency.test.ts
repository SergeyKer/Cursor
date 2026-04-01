import { describe, expect, it } from 'vitest'
import { alignDialogueBeVerbCommentWithRepeat } from './dialogueBeCommentConsistency'

describe('alignDialogueBeVerbCommentWithRepeat', () => {
  it('fixes is/are flip when Повтори has they + are', () => {
    const content = `Комментарий: Нужно использовать is вместо are.
Повтори: They are tall.`
    const out = alignDialogueBeVerbCommentWithRepeat(content)
    expect(out).toContain('are вместо is')
    expect(out).not.toMatch(/\bis\s+вместо\s+are\b/i)
  })

  it('fixes «использовать is вместо are» when Повтори has we are', () => {
    const content = `Комментарий: Здесь нужно использовать is вместо are.
Повтори: We are ready.`
    const out = alignDialogueBeVerbCommentWithRepeat(content)
    expect(out).toContain('использовать are вместо is')
  })

  it('fixes are/is flip when Повтори has he + is', () => {
    const content = `Комментарий: Нужно использовать are вместо is.
Повтори: He is tall.`
    const out = alignDialogueBeVerbCommentWithRepeat(content)
    expect(out).toContain('is вместо are')
  })

  it('leaves content without Комментарий unchanged', () => {
    const content = 'What are you doing?'
    expect(alignDialogueBeVerbCommentWithRepeat(content)).toBe(content)
  })
})
