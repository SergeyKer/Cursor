import { describe, expect, it } from 'vitest'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { buildPracticeFeedMessages } from '@/lib/practice/buildPracticeFeedMessages'
import { EMBEDDED_QUESTIONS_CHALLENGE_ATOMS } from '@/lib/lessons/embeddedQuestionsChallengeAtoms'
import {
  isRecipeAnswerHint,
  situationRuIsTranslateLeak,
} from '@/lib/practice/embeddedQuestionScenarioAlignment'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import {
  extractErrorFixBrokenPhrase,
  extractSituationKeyFromErrorFixPrompt,
} from '@/lib/practice/prompt/errorFixBrokenPhrase'
import { parseInterlocutorFromPrompt } from '@/lib/practice/prompt/roleplayPromptEngine'

describe('embedded questions challenge content', () => {
  const lesson = getStructuredLessonById('3')
  expect(lesson).not.toBeNull()

  it('defines 12 challenge atoms matching CHALLENGE_STEP_SPECS order', () => {
    expect(EMBEDDED_QUESTIONS_CHALLENGE_ATOMS).toHaveLength(12)
    for (const [index, atom] of EMBEDDED_QUESTIONS_CHALLENGE_ATOMS.entries()) {
      expect(atom.stepIndex).toBe(index)
      expect(CHALLENGE_STEP_SPECS[index]?.type).toBeDefined()
      expect(atom.hint).toBeFalsy()
      expect(isRecipeAnswerHint(atom.hint)).toBe(false)
      const type = CHALLENGE_STEP_SPECS[index]!.type
      expect(situationRuIsTranslateLeak(atom.situationRu, atom.targetAnswer, type)).toBe(false)
    }
    expect(lesson!.repeatConfig?.challengeAtoms).toHaveLength(12)
  })

  it('builds aligned challenge session for lesson 3', () => {
    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(12)
    const types = session.questions.map((question) => question.type)
    expect(types).toEqual(CHALLENGE_STEP_SPECS.map((spec) => spec.type))

    const choice = session.questions[0]!
    expect(choice.targetAnswer).toBe('I know what she likes.')
    expect(choice.options).toEqual([
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ])
    expect(choice.prompt).toMatch(/Ситуация:/i)
    expect(choice.prompt).toMatch(/вложен/i)
    expect(choice.prompt).toMatch(/вкус/i)
    expect(choice.hint).toBeFalsy()

    const voiceShadow = session.questions[1]!
    expect(voiceShadow.targetAnswer).toBe("I don't know where he lives.")
    expect(voiceShadow.audioText).toBe("I don't know where he lives.")
    expect(voiceShadow.prompt).toMatch(/адрес/i)

    const contextClue = session.questions[2]!
    expect(contextClue.targetAnswer).toBe('I know what he likes.')
    expect(contextClue.options?.every((item) => isCompleteSentence(item))).toBe(true)

    const puzzle = session.questions[3]!
    expect(puzzle.targetAnswer).toBe('Tell me what she likes.')
    expect(puzzle.hint).toBeFalsy()
    expect(puzzle.prompt).not.toMatch(/Tell me \+/i)

    const freeResponse = session.questions[4]!
    expect(freeResponse.targetAnswer).toBe("I don't know who he is.")
    expect(freeResponse.prompt).toMatch(/Переведите/i)
    expect(freeResponse.prompt).toMatch(/кто он/i)

    const dropdown = session.questions[5]!
    expect(dropdown.targetAnswer).toBe('that')
    expect(dropdown.options).toEqual(['that', 'what', 'who', 'where'])

    const dictation = session.questions[7]!
    expect(dictation.prompt).toMatch(/Анн.*Алекс/i)
    expect(dictation.targetAnswer).toMatch(/but/i)
    expect(dictation.audioText).toBe(dictation.targetAnswer)

    const roleplay = session.questions[9]!
    expect(roleplay.targetAnswer).toBe("I don't know who he is.")
    expect(roleplay.requireExactTarget).toBe(true)
    const interlocutor = parseInterlocutorFromPrompt(roleplay.prompt)
    expect(interlocutor).toMatch(/Do you know who he is/i)
    expect(interlocutor).not.toMatch(/Where does/i)

    const errorFix = session.questions[10]!
    expect(errorFix.targetAnswer).toBe('I know what she wants.')
    const broken = extractErrorFixBrokenPhrase(errorFix.prompt)
    expect(broken).toMatch(/what does she want/i)
    const situationKey = extractSituationKeyFromErrorFixPrompt(errorFix.prompt)
    expect(situationKey).toMatch(/нужд/i)

    const boss = session.questions[11]!
    expect(boss.prompt).toMatch(/but/i)
    expect(boss.targetAnswer).toMatch(/but/i)
    expect(boss.minWords).toBeGreaterThanOrEqual(8)

    for (let index = 1; index < session.questions.length; index += 1) {
      const prev = session.questions[index - 1]!.targetAnswer.trim().toLowerCase()
      const current = session.questions[index]!.targetAnswer.trim().toLowerCase()
      expect(current === prev).toBe(false)
    }
  })

  it('keeps info bubble free of recipe and target for all 12 challenge steps', () => {
    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    for (let index = 0; index < session.questions.length; index += 1) {
      const question = session.questions[index]!
      const feedSession = { ...session, currentIndex: index }
      const messages = buildPracticeFeedMessages({
        session: feedSession,
        state: 'answering',
        audience: 'adult',
      })
      const current = messages.find((message) => message.id === `practice-question-${question.id}`)
      const info = current?.bubbles?.find((bubble) => bubble.type === 'info')?.content ?? ''
      expect(info.trim().length, `step ${index + 1} info empty`).toBeGreaterThan(0)
      expect(isRecipeAnswerHint(info), `step ${index + 1} recipe in info`).toBe(false)
      expect(info.toLowerCase()).not.toContain(question.targetAnswer.trim().toLowerCase())
      if (index === 3) {
        expect(info).not.toMatch(/Tell me/i)
        expect(info).toMatch(/Соберите|Расставьте|фраз/i)
      }
      if (index === 4) {
        expect(info).not.toMatch(/who\s*\+\s*he/i)
      }
      if (index === 9) {
        expect(info).not.toMatch(/\+\s*(what|where|who|when)\b/i)
        expect(info).not.toMatch(/who \+ he \+ is/i)
      }
    }
  })
})
