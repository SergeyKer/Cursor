import { describe, expect, it } from 'vitest'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import { isChoiceLikePracticeType } from '@/lib/practice/ensurePracticeChoiceOptions'

describe('normalizeAiPracticeQuestion', () => {
  it('restores choice-like options from the lesson when the model omits them', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const sourceStep = lesson!.steps.find(
      (step) => step.exercise && Array.isArray(step.exercise.options) && step.exercise.options.length >= 2
    )
    expect(sourceStep?.exercise).toBeTruthy()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: sourceStep!.exercise!.correctAnswer,
      acceptedAnswers: [],
      options: [sourceStep!.exercise!.correctAnswer],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.options?.length).toBeGreaterThanOrEqual(3)
    for (const option of sourceStep!.exercise!.options ?? []) {
      expect(q!.options).toContain(option)
    }
    expect(q!.prompt).toMatch(/Ситуация:|Тема:/i)
    expect(q!.prompt).not.toMatch(/^Pick one\./i)
  })

  it('falls back to generated options when lesson and model omit enough choices', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: 'It is dark.',
      acceptedAnswers: [],
      options: ['It is dark.'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 99)
    expect(q).not.toBeNull()
    expect(q!.options?.length).toBeGreaterThanOrEqual(3)
    expect(q!.options).toContain('It is dark.')
  })

  it('keeps short options undefined for non-choice types', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'free-response',
      prompt: 'Say something.',
      targetAnswer: 'I agree.',
      options: ['only'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.options).toBeUndefined()
  })

  it('accepts translate prompt for reference free-response', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'free-response',
      prompt: 'Переведите на английский: "Я счастлив."',
      targetAnswer: "I'm happy.",
      acceptedAnswers: ["I'm happy.", 'I am happy.'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0, {
      mode: 'reference',
      referenceExerciseType: 'free-response',
    })
    expect(q).not.toBeNull()
    expect(q!.prompt).toMatch(/Переведите на английский/i)
    expect(q!.tolerance).toBe('normalized')
    expect(q!.keywords).toBeUndefined()
  })

  it('rebuilds vague situational reference free-response to translate prompt', () => {
    const lesson = getStructuredLessonById('4')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'free-response',
      prompt: 'Опишите настроение.',
      targetAnswer: "I'm happy.",
      acceptedAnswers: ["I'm happy."],
    }
    const rebuilt = normalizeAiPracticeQuestion(row, lesson!, 0, {
      mode: 'reference',
      referenceExerciseType: 'free-response',
    })
    expect(rebuilt).not.toBeNull()
    expect(rebuilt!.prompt).toMatch(/Переведите на английский/i)
    expect(rebuilt!.tolerance).toBe('normalized')
  })

  it('rejects vague reference choice prompts instead of substituting lesson copy', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'choice',
      prompt: 'Pick one.',
      targetAnswer: "It's dark.",
      acceptedAnswers: [],
      options: ["It's dark.", "It's time to sleep.", "It's time to drink."],
    }
    const vague = normalizeAiPracticeQuestion(row, lesson!, 0, {
      mode: 'reference',
      referenceExerciseType: 'choice',
    })
    expect(vague).toBeNull()

    const contextual = normalizeAiPracticeQuestion(
      {
        ...row,
        prompt: 'Ситуация: Вечером в парке темно. Что описывает состояние?',
      },
      lesson!,
      1,
      { mode: 'reference', referenceExerciseType: 'choice' }
    )
    expect(contextual).not.toBeNull()
    expect(contextual!.prompt).toContain('Вечером в парке темно')
  })

  it('strips leaked answer from voice-shadow AI prompt and clears hint', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'voice-shadow',
      prompt: "Ситуация: На улице темно. Повторите фразу: 'It's dark.'",
      targetAnswer: "It's dark.",
      hint: "Начните с It's и добавьте прилагательное.",
      acceptedAnswers: [],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 0)
    expect(q).not.toBeNull()
    expect(q!.prompt).toBe('Ситуация: На улице темно.')
    expect(q!.prompt).not.toContain("It's dark")
    expect(q!.hint).toBeUndefined()
    expect(q!.audioText).toBe("It's dark.")
  })

  it('replaces stale sentence-surgery prompt and rebuilds shuffledWords from lesson puzzle', () => {
    const lesson = getStructuredLessonById('1')
    expect(lesson).not.toBeNull()
    const row = {
      type: 'sentence-surgery',
      prompt: 'Соберите три предложения из слов.',
      targetAnswer: "It's dark.",
      acceptedAnswers: [],
      shuffledWords: ["It's", 'dark'],
    }
    const q = normalizeAiPracticeQuestion(row, lesson!, 3)
    expect(q).not.toBeNull()
    expect(q!.prompt).not.toMatch(/три предложен/i)
    expect(q!.targetAnswer).toMatch(/go home/i)
    expect(q!.shuffledWords).toEqual(["It's", 'time', 'to', 'go', 'home'])
  })
})

describe('isChoiceLikePracticeType', () => {
  it('marks listening-select as choice-like', () => {
    expect(isChoiceLikePracticeType('listening-select')).toBe(true)
  })
})
