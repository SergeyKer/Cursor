import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { buildLocalPracticeSession, buildSinglePracticeQuestion } from '@/lib/practice/builders/localPracticeBuilder'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'
import { isCompleteSentence } from '@/lib/practice/choiceOptionGranularity'
import { isGapFillStylePrompt } from '@/lib/practice/prompt/dropdownFillPromptFormat'
import { isDictationStylePrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import { roleplayPromptHasContext } from '@/lib/practice/prompt/buildRoleplayPrompt'

describe('buildLocalPracticeSession', () => {
  it('builds relaxed practice from a structured lesson without AI', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'relaxed',
      entrySource: 'after_lesson',
    })

    expect(session.questions).toHaveLength(6)
    expect(session.generationSource).toBe('local')
    expect(session.questions.every((question) => question.lessonId === '1')).toBe(true)
    expect(session.wrongAttemptsOnCurrentQuestion).toBe(0)
  })

  it('puts a boss challenge at the end of challenge mode', () => {
    const lesson = getStructuredLessonById('2')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '2' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(12)
    expect(session.questions.at(-1)?.type).toBe('boss-challenge')
  })

  it('reuses anchor phrase at challenge step 10 for lessons 1, 2, and 4', () => {
    for (const lessonId of ['1', '2', '4'] as const) {
      const lesson = getStructuredLessonById(lessonId)
      expect(lesson).not.toBeNull()

      const session = buildLocalPracticeSession({
        lesson: lesson!,
        source: { kind: 'static_lesson', lessonId },
        mode: 'challenge',
        entrySource: 'menu',
      })

      const anchor = session.questions[4]
      const roleplay = session.questions[9]
      expect(roleplay?.type).toBe('roleplay-mini')
      expect(roleplay?.targetAnswer.trim().toLowerCase()).toBe(anchor?.targetAnswer.trim().toLowerCase())
      expect(roleplayPromptHasContext(roleplay?.prompt ?? '')).toBe(true)
      expect(roleplay?.minWords).toBe(2)
    }
  })

  it('builds UI-ready data for all 12 exercise types in challenge mode', () => {
    const lesson = getStructuredLessonById('3')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '3' },
      mode: 'challenge',
      entrySource: 'menu',
    })
    const questionsByType = new Map(session.questions.map((question) => [question.type, question]))
    const expectedTypes = CHALLENGE_STEP_SPECS.map((spec) => spec.type)

    expect([...questionsByType.keys()]).toEqual(expectedTypes)
    expect(questionsByType.get('voice-shadow')?.audioText).toBeTruthy()
    const voiceShadow = questionsByType.get('voice-shadow')
    expect(voiceShadow?.hint).toBeUndefined()
    expect(voiceShadow?.prompt).not.toContain(voiceShadow?.targetAnswer ?? '')
    expect(voiceShadow?.prompt).toMatch(/Ситуация:|Тема:|Прослушайте/i)
    expect(questionsByType.get('listening-select')?.audioText).toBeTruthy()
    expect(questionsByType.get('dictation')?.audioText).toBeTruthy()
    const dictation = questionsByType.get('dictation')
    expect(dictation?.hint).toBeFalsy()
    expect(isCompleteSentence(dictation?.targetAnswer ?? '')).toBe(true)
    expect(isDictationStylePrompt(dictation?.prompt ?? '')).toBe(true)
    expect(dictation?.prompt).not.toMatch(/переведите/i)
    expect(dictation?.prompt).not.toMatch(/Прослушайте/i)
    expect(questionsByType.get('listening-select')?.prompt).not.toMatch(/Прослушайте/i)
    expect(questionsByType.get('sentence-surgery')?.shuffledWords?.length).toBeGreaterThan(0)
    expect(questionsByType.get('word-builder-pro')?.shuffledWords?.length).toBeGreaterThan(0)
    const wordBuilder = questionsByType.get('word-builder-pro')
    expect(wordBuilder?.extraWords?.length).toBe(2)
    expect(wordBuilder?.targetAnswer).not.toBe('to')
    expect(wordBuilder?.prompt).not.toMatch(/___/)
    expect(questionsByType.get('roleplay-mini')?.keywords?.length).toBeGreaterThan(0)
    expect(questionsByType.get('boss-challenge')?.minWords).toBeGreaterThanOrEqual(4)
    expect(questionsByType.get('boss-challenge')?.tolerance).toBe('soft')
    expect(questionsByType.get('boss-challenge')?.hint).toBeFalsy()
    expect(questionsByType.get('boss-challenge')?.prompt).toMatch(/Ситуация:|Тема:/i)
    expect(questionsByType.get('boss-challenge')?.prompt).not.toMatch(
      /Финальный вызов|примените тему|соберите всё|Переведите/iu
    )

    const choiceLikeTypes = session.questions.filter((q) => isChoiceLikePracticeType(q.type))
    expect(choiceLikeTypes.length).toBeGreaterThan(0)
    for (const question of choiceLikeTypes) {
      expect(question.options?.length ?? 0).toBeGreaterThanOrEqual(3)
    }
  })

  it('rotates reference prompts across variant profiles in reference mode', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'reference',
      entrySource: 'menu',
    })

    expect(session.questions).toHaveLength(7)
    expect(new Set(session.questions.map((question) => question.type)).size).toBe(1)
    expect(new Set(session.questions.map((question) => question.prompt)).size).toBeGreaterThanOrEqual(4)
    expect(session.questions[0]?.prompt).toMatch(/Ситуация:/i)
    expect(session.questions[0]?.prompt).toMatch(/холод|прохлад/i)
    expect(session.questions[0]?.prompt).not.toMatch(/^Какое предложение подходит/i)
    expect(session.questions[0]?.prompt).not.toMatch(/вложен/i)
  })

  it('lesson 1 challenge choice uses 3 sentence options without word chips', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const choice = session.questions[0]
    expect(choice?.type).toBe('choice')
    expect(choice?.targetAnswer).toBe("It's cold outside.")
    expect(choice?.options).toHaveLength(3)
    expect(choice?.options?.every((item) => isCompleteSentence(item))).toBe(true)
    expect(choice?.prompt).not.toMatch(/вложен/i)
  })

  it('lesson 1 challenge context-clue uses 3 sentence options on gap-fill', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const contextClue = session.questions[2]
    expect(contextClue?.type).toBe('context-clue')
    expect(contextClue?.targetAnswer).toBe("It's time to sleep.")
    expect(contextClue?.options).toHaveLength(3)
    expect(contextClue?.options?.every((item) => isCompleteSentence(item))).toBe(true)
  })

  it('lesson 1 relaxed context-clue uses 3 sentence options on translate step', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'relaxed',
      entrySource: 'menu',
    })

    const contextClue = session.questions[3]
    expect(contextClue?.type).toBe('context-clue')
    expect(contextClue?.options).toHaveLength(3)
    expect(contextClue?.options?.every((item) => isCompleteSentence(item))).toBe(true)
  })

  it('lesson 1 balanced context-clue uses 3 sentence options away from sentence_puzzle', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'balanced',
      entrySource: 'menu',
    })

    const contextClue = session.questions[4]
    expect(contextClue?.type).toBe('context-clue')
    expect(contextClue?.options).toHaveLength(3)
    expect(contextClue?.options?.every((item) => isCompleteSentence(item))).toBe(true)
    expect(contextClue?.prompt).not.toMatch(/sentence_puzzle/i)
  })

  it('buildSinglePracticeQuestion reference context-clue aligns to lesson step 3', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const question = buildSinglePracticeQuestion({
      lesson: lesson!,
      type: 'context-clue',
      mode: 'reference',
      referenceExerciseType: 'context-clue',
    })

    expect(question).not.toBeNull()
    expect(question!.targetAnswer).toBe("It's time to sleep.")
    expect(question!.options).toHaveLength(3)
  })

  it('lesson 1 challenge free-response uses translate prompt with normalized tolerance', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const freeResponse = session.questions[4]
    expect(freeResponse?.type).toBe('free-response')
    expect(freeResponse?.prompt).toMatch(/Переведите на английский/i)
    expect(freeResponse?.tolerance).toBe('normalized')
    expect(freeResponse?.keywords).toBeUndefined()
    expect(freeResponse?.minWords).toBeUndefined()
    expect(freeResponse?.targetAnswer).toBe("It's time to go home.")
  })

  it('lesson 4 challenge free-response uses translate prompt with normalized tolerance', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '4' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const freeResponse = session.questions[4]
    expect(freeResponse?.type).toBe('free-response')
    expect(freeResponse?.prompt).toMatch(/Переведите на английский/i)
    expect(freeResponse?.tolerance).toBe('normalized')
    expect(freeResponse?.keywords).toBeUndefined()
    expect(freeResponse?.targetAnswer).toBe('I am from Moscow.')
  })

  it('lesson 1 challenge sentence-surgery aligns chips with target answer', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const sentenceSurgery = session.questions[3]
    expect(sentenceSurgery?.type).toBe('sentence-surgery')
    expect(sentenceSurgery?.targetAnswer).toMatch(/five o'clock/i)
    expect(sentenceSurgery?.prompt).not.toMatch(/три предложен/i)
    const answerTokens = sentenceSurgery!.targetAnswer
      .replace(/[.!?]$/g, '')
      .split(/\s+/)
      .filter(Boolean)
    for (const token of sentenceSurgery!.shuffledWords ?? []) {
      expect(answerTokens).toContain(token)
    }
  })

  it('lesson 4 challenge dropdown-fill uses gap prompt and article options', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '4' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const dropdown = session.questions[5]
    expect(dropdown?.type).toBe('dropdown-fill')
    expect(dropdown?.targetAnswer).toBe('a')
    expect(isGapFillStylePrompt(dropdown?.prompt ?? '')).toBe(true)
    expect(dropdown?.prompt).toMatch(/student/i)
    expect(dropdown?.options?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(dropdown?.options).toContain('a')
    expect(dropdown?.options).toContain('an')
    expect(dropdown?.options?.every((item) => !isCompleteSentence(item))).toBe(true)
  })

  it('reference word-builder-pro builds phrase puzzle with grammar traps', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const question = buildSinglePracticeQuestion({
      lesson: lesson!,
      type: 'word-builder-pro',
      questionIndex: 0,
      mode: 'reference',
      referenceExerciseType: 'word-builder-pro',
    })
    expect(question).not.toBeNull()
    expect(question!.targetAnswer).not.toBe('to')
    expect(question!.extraWords?.length).toBe(2)
    expect(question!.shuffledWords!.length).toBeGreaterThanOrEqual(5)
    expect(question!.prompt).toMatch(/Ситуация:|Расставьте/i)
    expect(question!.extraWords).toEqual(expect.arrayContaining(['goes', 'times']))
  })

  it('challenge listening-select step 9 has audio, options, and empty hint', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'challenge',
      entrySource: 'menu',
    })

    const listeningSelect = session.questions[8]
    expect(listeningSelect?.type).toBe('listening-select')
    expect(listeningSelect?.audioText).toBeTruthy()
    expect(listeningSelect?.options?.length).toBeGreaterThanOrEqual(3)
    expect(listeningSelect?.hint).toBeFalsy()
    expect(listeningSelect?.prompt).toMatch(/Ситуация:|Тема:/i)
    expect(listeningSelect?.prompt).not.toMatch(/Прослушайте/i)
  })

  it('balanced listening-select has audio, options, and empty hint', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()

    const session = buildLocalPracticeSession({
      lesson: lesson!,
      source: { kind: 'static_lesson', lessonId: '1' },
      mode: 'balanced',
      entrySource: 'menu',
    })

    const listeningSelect = session.questions[2]
    expect(listeningSelect?.type).toBe('listening-select')
    expect(listeningSelect?.audioText).toBeTruthy()
    expect(listeningSelect?.options?.length).toBeGreaterThanOrEqual(3)
    expect(listeningSelect?.hint).toBeFalsy()
  })
})

