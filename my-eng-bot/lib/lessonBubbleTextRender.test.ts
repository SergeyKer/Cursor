import { describe, expect, it } from 'vitest'
import {
  splitLabel,
  splitLeadingTaskImperative,
  normalizeTranslatePromptPunctuation,
} from '@/lib/lessonBubbleTextRender'

describe('lessonBubbleTextRender', () => {
  describe('splitLabel', () => {
    it('splits colon label from rest', () => {
      expect(splitLabel('Дополните одним словом: "I know what she ___."')).toEqual({
        label: 'Дополните одним словом',
        rest: '"I know what she ___."',
      })
    })

    it('splits translate prompt label', () => {
      expect(splitLabel('Переведите на английский: "Я знаю, что ей нравится."')).toEqual({
        label: 'Переведите на английский',
        rest: '"Я знаю, что ей нравится."',
      })
    })

    it('returns null when no colon label pattern', () => {
      expect(splitLabel('Впишите одно слово так, чтобы внутри остался порядок слов.')).toBeNull()
    })
  })

  describe('splitLeadingTaskImperative', () => {
    it('splits adult imperative verb', () => {
      expect(splitLeadingTaskImperative('Впишите одно слово так, чтобы внутри остался порядок слов.')).toEqual({
        verb: 'Впишите',
        rest: ' одно слово так, чтобы внутри остался порядок слов.',
      })
    })

    it('splits translate imperative without colon', () => {
      expect(splitLeadingTaskImperative('Переведите короткую фразу со встроенным вопросом.')).toEqual({
        verb: 'Переведите',
        rest: ' короткую фразу со встроенным вопросом.',
      })
    })

    it('splits child imperative verb', () => {
      expect(splitLeadingTaskImperative('Выбери лучший вариант.')).toEqual({
        verb: 'Выбери',
        rest: ' лучший вариант.',
      })
    })

    it('prefers longer verb match', () => {
      expect(splitLeadingTaskImperative('Переведите на английский: "фраза"')).toEqual({
        verb: 'Переведите',
        rest: ' на английский: "фраза"',
      })
    })

    it('returns null for text without imperative', () => {
      expect(splitLeadingTaskImperative('шаг 1 · тип 3/12 (choice) · prompt')).toBeNull()
    })
  })

  describe('normalizeTranslatePromptPunctuation', () => {
    it('removes trailing punctuation after closing quote in translate prompt', () => {
      expect(
        normalizeTranslatePromptPunctuation('Переведите на английский: "Я из России".')
      ).toBe('Переведите на английский: "Я из России"')
    })
  })
})
