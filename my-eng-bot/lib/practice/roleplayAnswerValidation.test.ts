import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  buildYesNoScaffoldQuestion,
  extractRoleplayKeywords,
  formatRoleplayTaskBubble,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import { validateRoleplayAnswer } from '@/lib/practice/roleplayAnswerValidation'
import type { PracticeQuestion } from '@/types/practice'

function roleplayQuestion(
  targetAnswer: string,
  lessonId: string,
  prompt?: string,
  hint?: string
): PracticeQuestion {
  return {
    id: 'rp-test',
    lessonId,
    type: 'roleplay-mini',
    prompt:
      prompt ??
      'На улице темно.\nСобеседник: «What is it like outside?»',
    targetAnswer,
    acceptedAnswers: [],
    xpBase: 10,
    difficulty: 3,
    tolerance: 'soft',
    minWords: 2,
    keywords: extractRoleplayKeywords(targetAnswer, getStructuredLessonById(lessonId)!),
    hint,
  }
}

describe('roleplayAnswerValidation', () => {
  it('accepts lesson 1 weather answer', () => {
    const lesson = getStructuredLessonById('1')!
    const question = roleplayQuestion("It's dark.", '1')
    expect(validateRoleplayAnswer("It's dark.", question, lesson)).toBe(true)
    expect(validateRoleplayAnswer("It's cold.", question, lesson)).toBe(false)
  })

  it('accepts lesson 2 declarative answer and rejects Who question as user answer', () => {
    const lesson = getStructuredLessonById('2')!
    const question = roleplayQuestion(
      'My brother likes tea.',
      '2',
      'Ваш брат любит чай.\nСобеседник: «Who likes tea?»'
    )
    expect(validateRoleplayAnswer('My brother likes tea.', question, lesson)).toBe(true)
    expect(validateRoleplayAnswer('Who likes tea?', question, lesson)).toBe(false)
  })

  it('accepts Anna answer and rejects wrong name for lesson 2 classmate', () => {
    const lesson = getStructuredLessonById('2')!
    const question = roleplayQuestion(
      'Anna likes music.',
      '2',
      'Вы рассказываете об однокласснице Анне.\nСобеседник: «Who likes music?»'
    )
    expect(validateRoleplayAnswer('Anna likes music.', question, lesson)).toBe(true)
    expect(validateRoleplayAnswer('Ira likes music', question, lesson)).toBe(false)
  })

  it('accepts yes/no scaffold with optional Yes prefix', () => {
    const lesson = getStructuredLessonById('1')!
    const scaffold = buildYesNoScaffoldQuestion("It's dark.", 'На улице темно.')
    const question = roleplayQuestion(
      "It's dark.",
      '1',
      `На улице темно.\n${formatRoleplayTaskBubble(scaffold)}`
    )
    expect(validateRoleplayAnswer("It's dark.", question, lesson)).toBe(true)
    expect(validateRoleplayAnswer("Yes, it's dark.", question, lesson)).toBe(true)
  })

  it('rejects paraphrase on challenge anchor', () => {
    const lesson = getStructuredLessonById('1')!
    const question = roleplayQuestion("It's time to go.", '1', undefined, 'Нужна та же фраза, что на предыдущих шагах.')
    expect(validateRoleplayAnswer("It's time to go now.", question, lesson)).toBe(false)
  })
})
