import { describe, expect, it } from 'vitest'
import {
  buildClauseShapeMismatchSupportRu,
  detectEnglishClauseShape,
  resolveTranslationErrorSupport,
  shapesCompatible,
  supportHasFalseStructurePraise,
  translationClauseShapesCompatible,
} from './translationErrorSupportPolicy'

describe('translationErrorSupportPolicy', () => {
  describe('detectEnglishClauseShape', () => {
    it('priority: question before negative', () => {
      expect(detectEnglishClauseShape("Don't you like travel?")).toBe('question')
    })

    it('Dont play is negative, not question', () => {
      expect(detectEnglishClauseShape("Don't play some games.")).toBe('negative')
    })

    it('You dont like is negative', () => {
      expect(detectEnglishClauseShape("You don't like to travel.")).toBe('negative')
    })

    it('do not is negative', () => {
      expect(detectEnglishClauseShape('You do not like to travel.')).toBe('negative')
    })

    it('affirmative is declarative', () => {
      expect(detectEnglishClauseShape('You like to travel.')).toBe('declarative')
    })
  })

  describe('shapesCompatible', () => {
    it('travel polarity mismatch', () => {
      expect(
        translationClauseShapesCompatible("You don't like to travel.", 'You like to travel.')
      ).toBe(false)
    })

    it('same shape ok', () => {
      expect(shapesCompatible('declarative', 'declarative')).toBe(true)
    })
  })

  describe('resolveTranslationErrorSupport', () => {
    it('case1: polarity mismatch drops false praise of don’t', () => {
      const poisoned =
        "Отлично, что ты использовал 'don't' — это правильно показывает отрицательную форму, которая требуется в этом предложении."
      const out = resolveTranslationErrorSupport({
        modelSupport: poisoned,
        userText: "You don't like to travel.",
        goldEnglish: 'You like to travel.',
        ruPrompt: 'Ты любишь путешествовать.',
        audience: 'adult',
      })
      expect(out).toMatch(/Неверно/i)
      expect(out).toMatch(/утвердительн/i)
      expect(out.toLowerCase()).not.toContain("don't")
      expect(out).not.toMatch(/требуется/i)
    })

    it('case2: Don’t play vs You play', () => {
      const out = resolveTranslationErrorSupport({
        modelSupport: "Отлично, don't требуется.",
        userText: "Don't play some games.",
        goldEnglish: 'You play some games.',
        audience: 'adult',
      })
      expect(out).toBe(buildClauseShapeMismatchSupportRu('declarative', 'adult'))
    })

    it('case3: need negation', () => {
      const out = resolveTranslationErrorSupport({
        modelSupport: 'Хорошее начало.',
        userText: 'You like to travel.',
        goldEnglish: "You don't like to travel.",
        audience: 'adult',
      })
      expect(out).toMatch(/отрицательн/i)
    })

    it('case4: question vs declarative', () => {
      const out = resolveTranslationErrorSupport({
        modelSupport: 'Хорошо.',
        userText: 'Do you like travel?',
        goldEnglish: 'You like to travel.',
        audience: 'child',
      })
      expect(out).toBe(buildClauseShapeMismatchSupportRu('declarative', 'child'))
    })

    it('compatible honest praise may be preserved', () => {
      const honest = 'Вы удачно использовали «travel» в этой фразе - ниже кратко, что поправить.'
      const out = resolveTranslationErrorSupport({
        modelSupport: honest,
        userText: 'You like travel.',
        goldEnglish: 'You like to travel.',
        audience: 'adult',
      })
      expect(out).toContain('travel')
    })

    it('false praise don’t+требуется stripped when shapes compatible but praise wrong', () => {
      // Same shape (both negative) but praise that claims negation is required is OK for negative gold.
      // For declarative gold with compatible... wait if both declarative and praise don't - shapes must mismatch first.
      // Test false praise when user somehow same shape but praise mentions don't as required for declarative gold:
      // Actually if user is declarative and gold declarative, poisoned don't praise should strip via false structure.
      const poisoned =
        "Отлично, что ты использовал 'don't' — это правильно показывает отрицательную форму, которая требуется."
      const out = resolveTranslationErrorSupport({
        modelSupport: poisoned,
        userText: 'You like to travel.',
        goldEnglish: 'You like to travel.',
        audience: 'adult',
      })
      expect(out).not.toMatch(/don't/i)
      expect(out).not.toMatch(/требуется/i)
      expect(supportHasFalseStructurePraise(poisoned, 'declarative')).toBe(true)
    })
  })
})
