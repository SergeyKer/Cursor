import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildDropdownFillPrompt,
  buildEtalonDropdownFillPromptForLesson,
  findLessonDropdownFillSourceForPractice,
} from '@/lib/practice/prompt/buildDropdownFillPrompt'
import {
  buildGapFillPrompt,
  isGapFillStylePrompt,
  normalizeGapFillPrompt,
  parseFillInstructionGapQuestion,
  parseLegacyTranslateGapQuestion,
  sanitizeDropdownHint,
} from '@/lib/practice/prompt/dropdownFillPromptFormat'

describe('dropdownFillPromptFormat', () => {
  it('builds canonical one-line gap fill prompt', () => {
    expect(buildGapFillPrompt('Я из России', 'I am from ___.')).toBe(
      'Выберите слово для пропуска: "Я из России" - «I am from ___.».'
    )
  })

  it('normalizes em dash separator and adds russian quotes from AI gap-fill prompts', () => {
    expect(
      normalizeGapFillPrompt(
        'Выберите слово для пропуска: На улице темно — «It\'s cold. It is time to ___ tea.».'
      )
    ).toBe(
      'Выберите слово для пропуска: "На улице темно" - «It\'s cold. It is time to ___ tea.».'
    )
    expect(
      normalizeGapFillPrompt(
        'Выберите слово для пропуска: Холодно, пора пить чай - «It\'s cold. It is time to ___ tea.».'
      )
    ).toBe(
      'Выберите слово для пропуска: "Холодно, пора пить чай" - «It\'s cold. It is time to ___ tea.».'
    )
  })

  it('parses legacy translate gap question', () => {
    expect(
      parseLegacyTranslateGapQuestion(
        'Переведите на английский: "Я из России." - "I am from ___."'
      )
    ).toEqual({
      ruPhrase: 'Я из России',
      gapFrameEn: 'I am from ___.',
    })
  })

  it('parses fill instruction gap question frame only', () => {
    expect(
      parseFillInstructionGapQuestion('Дополните одним словом: "I know what she ___."')
    ).toEqual({
      gapFrameEn: 'I know what she ___.',
    })
  })

  it('detects valid gap fill style prompt', () => {
    const prompt = buildGapFillPrompt('Я из России', 'I am from ___.')
    expect(isGapFillStylePrompt(prompt)).toBe(true)
    expect(isGapFillStylePrompt('Ситуация: Я из России.')).toBe(false)
  })

  it('rejects dual-frame broken prompt from regression', () => {
    const broken =
      'Выберите слово для пропуска: Дополните одним словом: "I know what she ___." — «I am from ___.».'
    expect(isGapFillStylePrompt(broken)).toBe(false)
  })

  it('sanitizes write hints for dropdown', () => {
    expect(sanitizeDropdownHint('После from напишите одно английское слово.')).toBe(
      'После from одно английское слово.'
    )
  })
})

describe('buildDropdownFillPrompt lesson 3 embedded questions', () => {
  it('builds single-gap prompt for fill_text step without I am from artifact', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    const prompt = buildEtalonDropdownFillPromptForLesson(lesson!, 0)
    expect(prompt).not.toBeNull()
    expect(prompt).toMatch(/I know what she ___/i)
    expect(prompt).not.toMatch(/I am from/i)
    expect(prompt).toMatch(/Я знаю, что ей нравится/i)
    expect(isGapFillStylePrompt(prompt!)).toBe(true)
    expect((prompt!.match(/___/g) ?? []).length).toBe(1)
  })

  it('builds lesson 4 translate-gap prompt without regression', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    const prompt = buildEtalonDropdownFillPromptForLesson(lesson!, 0)
    expect(prompt).not.toBeNull()
    expect(prompt).toBe('Выберите слово для пропуска: "Я Вася" - «I ___ from Russia.».')
    expect(isGapFillStylePrompt(prompt!)).toBe(true)
  })

  it('uses source situation when exercise is fill instruction only', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()
    const source = findLessonDropdownFillSourceForPractice(lesson!, 0)
    expect(source).not.toBeNull()

    const prompt = buildDropdownFillPrompt(source!, lesson!, 0)
    expect(prompt).toBe(
      'Выберите слово для пропуска: "Я знаю, что ей нравится" - «I know what she ___.».'
    )
  })
})
