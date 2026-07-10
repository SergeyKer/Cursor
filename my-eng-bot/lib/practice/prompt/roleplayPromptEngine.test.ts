import {
  buildCanonicalRoleplayPrompt,
  buildRoleplayExpectedAnswerCue,
  buildYesNoScaffoldQuestion,
  extractRoleplayKeywords,
  formatRoleplayInfoLabel,
  formatRoleplayTaskBubble,
  formatRoleplayTaskDisplay,
  inferRoleplayAxis,
  isYesNoScaffoldInterlocutor,
  parseInterlocutorFromPrompt,
  parseRoleIntroFromPrompt,
  resolveInterlocutorQuestionEn,
  resolveRoleplayScenario,
  resolveRoleplayTargetAnswer,
} from '@/lib/practice/prompt/roleplayPromptEngine'
import { findLessonRoleplaySourceForPractice } from '@/lib/practice/prompt/buildRoleplayPrompt'
import { buildReferenceFallbackQuestions } from '@/lib/practice/referenceFallbackQuestion'
import { getStructuredLessonById } from '@/lib/structuredLessons'

describe('roleplayPromptEngine', () => {
  it('builds canonical prompt with RU intro and EN interlocutor', () => {
    const prompt = buildCanonicalRoleplayPrompt({
      roleIntroRu: 'Вы студент.',
      interlocutorEn: 'Who are you?',
      grammarAxis: 'creative',
    })
    expect(prompt).toContain('Вы студент.')
    expect(prompt).toContain('Собеседник: «Who are you?»')
    expect(prompt).not.toContain('Ответьте по-английски')
  })

  it('parses intro and interlocutor from prompt', () => {
    const prompt = buildCanonicalRoleplayPrompt({
      roleIntroRu: 'На улице темно.',
      interlocutorEn: "What's the weather like?",
      grammarAxis: 'state',
    })
    expect(parseRoleIntroFromPrompt(prompt)).toBe('На улице темно.')
    expect(parseInterlocutorFromPrompt(prompt)).toBe("What's the weather like?")
  })

  it('RP-V01/V02: formats task display as single line ending with Скажите ответ.', () => {
    const prompt = buildCanonicalRoleplayPrompt({
      roleIntroRu: 'Вы студент.',
      interlocutorEn: 'Who are you?',
      grammarAxis: 'creative',
    })
    const display = formatRoleplayTaskDisplay(prompt, 'adult')
    expect(display).not.toContain('\n')
    expect(display).toContain('Вы студент.')
    expect(display).toContain('Who are you?')
    expect(display).toContain('Собеседник:')
    expect(display).toMatch(/Скажите ответ\.?$/)
  })

  it('RP-V02 child: uses Скажи ответ for child audience', () => {
    const prompt = buildCanonicalRoleplayPrompt({
      roleIntroRu: 'На улице темно.',
      interlocutorEn: 'What is it like outside?',
      grammarAxis: 'state',
    })
    const display = formatRoleplayTaskDisplay(prompt, 'child')
    expect(display).toMatch(/Скажи ответ\.?$/)
    expect(display).not.toContain('Скажите ответ')
  })

  it('RP-V03: lesson 1 dark resolves to What is it like outside?', () => {
    const lesson = getStructuredLessonById('1')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: "It's dark.",
      stepIndex: 0,
      audience: 'adult',
    })
    expect(scenario.roleIntroRu).toContain('темно')
    expect(scenario.interlocutorEn).toBe('What is it like outside?')
    expect(scenario.interlocutorEn).not.toContain('— Yes,')
    expect(scenario.interlocutorEn).not.toMatch(/-\s*Yes,/i)
  })

  it('RP-V04: yes/no scaffold accepts declarative without Yes prefix', () => {
    const scaffold = buildYesNoScaffoldQuestion("It's dark.", 'На улице темно.')
    expect(isYesNoScaffoldInterlocutor(scaffold)).toBe(true)
    expect(scaffold).toContain("Yes, It's dark.")
    expect(formatRoleplayTaskBubble(scaffold)).toBe(
      "Собеседник: «Is it dark outside? - Yes, It's dark.»"
    )
  })

  it('RP-V05: typical reference scenarios use WH without yes/no scaffold', () => {
    for (const lessonId of ['1', '2', '3', '4'] as const) {
      const lesson = getStructuredLessonById(lessonId)!
      const questions = buildReferenceFallbackQuestions({
        lesson,
        referenceExerciseType: 'roleplay-mini',
        referenceTotal: 4,
      })
      for (const question of questions) {
        const interlocutor = parseInterlocutorFromPrompt(question.prompt)
        expect(interlocutor).toBeTruthy()
        expect(interlocutor).not.toMatch(/—\s*Yes,/i)
        expect(interlocutor).not.toMatch(/-\s*Yes,/i)
      }
    }
  })

  it('resolves lesson 4 creative scenario', () => {
    const lesson = getStructuredLessonById('4')!
    const source = findLessonRoleplaySourceForPractice(lesson, 4)
    expect(source).not.toBeNull()
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: 'I am a student.',
      source: source ?? undefined,
      stepIndex: 4,
      audience: 'adult',
    })
    expect(scenario.roleIntroRu.toLowerCase()).toMatch(/студент|student/i)
    expect(scenario.interlocutorEn).toBe('Who are you?')
  })

  it('resolves lesson 2 declarative target from pair', () => {
    expect(
      resolveRoleplayTargetAnswer('Who likes tea? My brother likes tea.', '2')
    ).toBe('My brother likes tea.')
  })

  it('lesson 2 Anna intro names classmate in prepositional case', () => {
    const lesson = getStructuredLessonById('2')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: 'Anna likes music.',
      stepIndex: 0,
      audience: 'adult',
    })
    expect(scenario.roleIntroRu).toContain('Анне')
    expect(scenario.roleIntroRu).not.toBe('Вы рассказываете об однокласснице.')
    expect(scenario.interlocutorEn).toBe('Who likes music?')
  })

  it('lesson 2 Max intro uses male classmate form', () => {
    const lesson = getStructuredLessonById('2')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: 'Max drinks coffee.',
      stepIndex: 0,
      audience: 'adult',
    })
    expect(scenario.roleIntroRu).toContain('Максе')
    expect(scenario.interlocutorEn).toBe('Who drinks coffee?')
  })

  it('lesson 2 child intro uses ты-form for classmate', () => {
    const lesson = getStructuredLessonById('2')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: 'Anna likes music.',
      stepIndex: 0,
      audience: 'child',
    })
    expect(scenario.roleIntroRu).toMatch(/^Ты рассказываешь/)
    expect(scenario.roleIntroRu).toContain('Анне')
  })

  it('lesson 2 my brother intro stays unchanged', () => {
    const lesson = getStructuredLessonById('2')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: 'My brother likes tea.',
      stepIndex: 1,
      audience: 'adult',
    })
    expect(scenario.roleIntroRu).toContain('брат')
    expect(scenario.roleIntroRu).toContain('чай')
    expect(scenario.roleIntroRu).not.toContain('Анне')
  })

  it('lesson 1 cold still uses weather question', () => {
    const lesson = getStructuredLessonById('1')!
    const scenario = resolveRoleplayScenario({
      lesson,
      targetAnswer: "It's cold.",
      stepIndex: 1,
      audience: 'adult',
    })
    expect(scenario.interlocutorEn).toBe("What's the weather like?")
  })

  it('resolveInterlocutorQuestionEn pairs dark intro with outside question', () => {
    const lesson = getStructuredLessonById('1')!
    const question = resolveInterlocutorQuestionEn({
      lesson,
      axis: 'state',
      targetAnswer: "It's dark.",
      roleIntroRu: 'На улице темно.',
    })
    expect(question).toBe('What is it like outside?')
  })

  it('infers axis per lesson', () => {
    const lesson1 = getStructuredLessonById('1')!
    expect(inferRoleplayAxis("It's cold.", lesson1)).toBe('state')
    expect(inferRoleplayAxis("It's time to go.", lesson1)).toBe('action')
  })

  it('formats challenge step-10 cue', () => {
    const lesson = getStructuredLessonById('1')!
    const label = formatRoleplayInfoLabel({
      axis: inferRoleplayAxis("It's time to go.", lesson),
      mode: 'challenge',
      stepIndex: 9,
      lessonId: '1',
      audience: 'adult',
    })
    expect(label).toContain('Нужна та же фраза, что на предыдущих шагах')
  })

  it('extracts keywords with blueprint mustInclude', () => {
    const lesson = getStructuredLessonById('1')!
    const keywords = extractRoleplayKeywords("It's time to go.", lesson)
    expect(keywords).toContain('time to')
    expect(keywords.length).toBeGreaterThanOrEqual(2)
  })

  it('uses reference cue for non-anchor steps', () => {
    expect(buildRoleplayExpectedAnswerCue('reference', 2, 'adult')).toContain(
      'одно полное предложение по шаблону темы'
    )
  })
})
