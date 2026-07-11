import { describe, expect, it } from 'vitest'
import { RELAXED_STEP_SPECS, BALANCED_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { embeddedScenarioRuEnAligned } from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import { isDictationStylePrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import { isTranslateStylePrompt } from '@/lib/practice/prompt/promptSourceUtils'
import { isGapFillStylePrompt } from '@/lib/practice/prompt/dropdownFillPromptFormat'
import {
  extractErrorFixBrokenPhrase,
  extractSituationKeyFromErrorFixPrompt,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'

describe('embedded questions session content', () => {
  const lesson = getStructuredLessonById('3')
  expect(lesson).not.toBeNull()

  it('builds aligned relaxed session for lesson 3', () => {
    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'relaxed',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(RELAXED_STEP_SPECS.length)
    expect(session.questions.map((q) => q.type)).toEqual(RELAXED_STEP_SPECS.map((spec) => spec.type))

    const choice = session.questions[0]!
    expect(choice.targetAnswer).toBe('I know what she likes.')
    expect(choice.prompt).toMatch(/Ситуация:/i)
    expect(choice.prompt).toMatch(/вложен/i)

    const situations = session.questions.map((question) => {
      const match = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(question.prompt)
      return (match?.[1] ?? question.prompt).trim().toLowerCase()
    })
    expect(new Set(situations).size).toBe(RELAXED_STEP_SPECS.length)

    for (const question of session.questions) {
      const situationMatch = /(?:Ситуация|Тема)\s*:\s*([^.]*)/iu.exec(question.prompt)
      const situationRu = situationMatch?.[1] ?? ''
      if (situationRu) {
        expect(embeddedScenarioRuEnAligned(situationRu, question.targetAnswer)).toBe(true)
      }
    }
  })

  it('builds aligned balanced session for lesson 3', () => {
    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'balanced',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(BALANCED_STEP_SPECS.length)
    expect(session.questions.map((q) => q.type)).toEqual(BALANCED_STEP_SPECS.map((spec) => spec.type))

    const listening = session.questions[2]!
    expect(listening.type).toBe('listening-select')
    expect(listening.audioText).toBe(listening.targetAnswer)
    expect(listening.prompt).toMatch(/Ситуация:/i)

    const dictation = session.questions[7]!
    expect(dictation.type).toBe('dictation')
    expect(isDictationStylePrompt(dictation.prompt)).toBe(true)
    expect(dictation.audioText).toBe(dictation.targetAnswer)

    const errorFix = session.questions[8]!
    expect(errorFix.type).toBe('error-fix')
    expect(errorFix.prompt).toMatch(/Исправьте:/i)
    const broken = extractErrorFixBrokenPhrase(errorFix.prompt)
    expect(broken).toBeTruthy()
    expect(broken!.toLowerCase()).not.toBe(errorFix.targetAnswer.toLowerCase())

    const freeResponse = session.questions[3]!
    expect(isTranslateStylePrompt(freeResponse.prompt)).toBe(true)

    const dropdown = session.questions[5]!
    expect(isGapFillStylePrompt(dropdown.prompt)).toBe(true)
    expect(dropdown.targetAnswer).toBe('that')

    for (const question of session.questions) {
      if (question.type === 'choice' || question.type === 'context-clue') {
        expect(question.options?.every((item) => isCompleteSentence(item))).toBe(true)
      }
    }
  })
})
