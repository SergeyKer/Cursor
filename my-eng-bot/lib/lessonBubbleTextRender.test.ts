import { describe, expect, it } from 'vitest'
import {
  splitLabel,
  splitLeadingTaskImperative,
  splitTrailingTaskImperative,
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

    it('splits roleplay interlocutor label', () => {
      expect(splitLabel('Собеседник: «На улице холодно.»')).toEqual({
        label: 'Собеседник',
        rest: '«На улице холодно.»',
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

  describe('splitTrailingTaskImperative', () => {
    it('splits roleplay task label at end for adult', () => {
      expect(
        splitTrailingTaskImperative(
          'На улице темно. Собеседник: «What is it like outside?». Скажите ответ.'
        )
      ).toEqual({
        body: 'На улице темно. Собеседник: «What is it like outside?».',
        imperative: 'Скажите ответ.',
      })
    })

    it('splits roleplay task label at end for child', () => {
      expect(
        splitTrailingTaskImperative('Вы студент. Собеседник: «Who are you?». Скажи ответ.')
      ).toEqual({
        body: 'Вы студент. Собеседник: «Who are you?».',
        imperative: 'Скажи ответ.',
      })
    })

    it('returns null without Собеседник marker', () => {
      expect(splitTrailingTaskImperative('Переведите на английский: "фраза". Скажите ответ.')).toBeNull()
    })

    it('returns null for leading imperative tasks', () => {
      expect(splitTrailingTaskImperative('Впишите одно слово так, чтобы внутри остался порядок слов.')).toBeNull()
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
