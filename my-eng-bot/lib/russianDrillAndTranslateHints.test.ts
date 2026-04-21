import { describe, expect, it } from 'vitest'
import { RUSSIAN_TRANSLATION_DRILL_HINTS } from './russianDrillAndTranslateHints'

describe('RUSSIAN_TRANSLATION_DRILL_HINTS smoke pack (Переведи / Переведи далее)', () => {
  describe('negative sentence guidance', () => {
    it('фиксирует точное различение еще не / так и не / уже не', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('"еще не"')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('"так и не"')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('"уже не"')
    })

    it('фиксирует длительность для отрицания и защиту от не давно', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('"недолго / не так давно / пока недолго"')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('Never split "недавно" into two words')
    })

    it('сохраняет явные маркеры отрицания', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('Sentence type NEGATIVE')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('explicit markers')
    })
  })

  describe('affirmative sentence guidance', () => {
    it('требует декларативный формат без вопроса и отрицания', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain(
        'Sentence type AFFIRMATIVE: declarative, not a question, not negative.'
      )
    })

    it('требует разговорную ясность без книжных шаблонов', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('AFFIRMATIVE clarity')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('avoid bookish fillers')
    })

    it('фиксирует аспектные маркеры только по смыслу', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('AFFIRMATIVE aspect cues')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('only if they match drill intent')
    })
  })

  describe('interrogative sentence guidance', () => {
    it('требует настоящий вопрос с корректной структурой', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('Sentence type INTERROGATIVE')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('a real Russian question ending with ?')
    })

    it('запрещает псевдовопрос (утверждение с хвостовым ?)', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('INTERROGATIVE naturalness')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('trailing "?" as fake question')
    })

    it('сохраняет явную полярность для отрицательных вопросов', () => {
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('INTERROGATIVE polarity')
      expect(RUSSIAN_TRANSLATION_DRILL_HINTS).toContain('English polarity is unambiguous')
    })
  })
})
