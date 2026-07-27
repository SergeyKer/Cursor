import { describe, expect, it } from 'vitest'
import {
  buildDialogueAnyAxisPromptRules,
  detectDialogueAdvancedToNextDrill,
  resolveDialogueAnyAxes,
} from './dialogueAnyAxis'
import { stableHash32 } from './freeTalkDialogueTense'

const pickLevel = () => 'a2'

describe('detectDialogueAdvancedToNextDrill', () => {
  it('false for Повтори / Комментарий; true for next question', () => {
    expect(
      detectDialogueAdvancedToNextDrill(
        ['Комментарий: Нужно Past Simple.', 'Повтори: I went home.'].join('\n')
      )
    ).toBe(false)
    expect(detectDialogueAdvancedToNextDrill('What did you do yesterday?')).toBe(true)
  })
})

describe('resolveDialogueAnyAxes', () => {
  it('freezes validated current and picks different next', () => {
    const result = resolveDialogueAnyAxes({
      audience: 'adult',
      menuLevel: 'a2',
      menuSentenceType: 'interrogative',
      dialogSeed: 'dseed',
      drillIndex: 3,
      topic: 'travel',
      usedTensesRaw: ['present_simple'],
      currentAxisRaw: {
        tense: 'past_simple',
        effectiveLevel: 'a2',
        effectiveSentenceType: 'interrogative',
      },
      pickTranslationEffectiveLevel: pickLevel,
      stableHash32,
    })
    expect(result.current.tense).toBe('past_simple')
    expect(result.next.tense).not.toBe('past_simple')
  })
})

describe('buildDialogueAnyAxisPromptRules', () => {
  it('splits current vs next and forbids mixing', () => {
    const text = buildDialogueAnyAxisPromptRules({
      current: {
        tense: 'present_continuous',
        effectiveLevel: 'a1',
        effectiveSentenceType: 'general',
      },
      next: {
        tense: 'present_simple',
        effectiveLevel: 'a1',
        effectiveSentenceType: 'interrogative',
      },
      tenseLabel: (id) => id,
    })
    expect(text).toContain('present_continuous')
    expect(text).toContain('present_simple')
    expect(text).toMatch(/WRONG|Повтори/i)
    expect(text).toMatch(/CORRECT|next/i)
  })
})
