import { describe, expect, it } from 'vitest'
import { itsTimeToLesson } from '@/lib/lessons/its-time-to'
import { assessGeneratedSteps, validateGeneratedSteps } from '@/lib/structuredLessonFactory'

function toGeneratedPayload() {
  return itsTimeToLesson.steps.map((step) => ({
    stepNumber: step.stepNumber,
    bubbles: step.bubbles.map((bubble) => ({ ...bubble })),
    ...(step.exercise
      ? {
          exercise: {
            question: step.exercise.question,
            options: step.exercise.options,
            correctAnswer: step.exercise.correctAnswer,
            acceptedAnswers: step.exercise.acceptedAnswers,
            hint: step.exercise.hint,
          },
        }
      : {}),
    footerDynamic: step.footerDynamic,
  }))
}

describe('structuredLessonFactory', () => {
  it('accepts canonical fallback lesson steps', () => {
    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, itsTimeToLesson.steps)
    expect(validation.accepted).toBe(true)
    expect(validation.validatedSteps).toHaveLength(itsTimeToLesson.steps.length)
  })

  it('rejects steps that break semantic anchors', () => {
    const brokenSteps = toGeneratedPayload()

    brokenSteps[0] = {
      ...brokenSteps[0],
      bubbles: [
        { type: 'positive', content: 'Сегодня говорим только про музыку.' },
        { type: 'info', content: 'Никаких состояний и времени действия.' },
        { type: 'task', content: 'Выберите что-то случайное.' },
      ],
      exercise: {
        question: 'Случайный вопрос',
        options: ['Blue', 'Green', 'Red'],
        correctAnswer: 'Blue',
        hint: 'Без связи с темой',
      },
    }

    expect(validateGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps)).toBeNull()
  })

  it('rejects hints that reveal the answer directly', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[4] = {
      ...brokenSteps[4],
      exercise: {
        ...brokenSteps[4].exercise!,
        hint: "Правильный ответ: It's time to go home.",
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps)
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'hint_reveals_answer')).toBe(true)
  })

  it('rejects practice-fill explanations that reveal the answer directly', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[2] = {
      ...brokenSteps[2],
      bubbles: [
        brokenSteps[2].bubbles[0],
        {
          type: 'info',
          content: 'Опорный пример: It is cold. It is time to drink tea.',
        },
        brokenSteps[2].bubbles[2],
      ],
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps)
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'support_reveals_answer')).toBe(true)
  })

  it('rejects too many accepted answers without explicit wide policy', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[3] = {
      ...brokenSteps[3],
      exercise: {
        ...brokenSteps[3].exercise!,
        acceptedAnswers: ["It's dark.", 'It is dark.', 'Dark it is.'],
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps)
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'too_many_answer_variants')).toBe(true)
  })

  it('does not false-reject a lesson with a valid normalized variant', () => {
    const acceptableSteps = toGeneratedPayload()
    acceptableSteps[4] = {
      ...acceptableSteps[4],
      exercise: {
        ...acceptableSteps[4].exercise!,
        correctAnswer: 'It is time to go home.',
        acceptedAnswers: ['It is time to go home.'],
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, acceptableSteps)
    expect(validation.accepted).toBe(true)
  })

  it('rejects unnatural english in the supposed correct answer', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[5] = {
      ...brokenSteps[5],
      exercise: {
        ...brokenSteps[5].exercise!,
        correctAnswer: "It's sleeping time to.",
        acceptedAnswers: ["It's sleeping time to."],
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps)
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'unnatural_english_answer')).toBe(true)
  })

  it('rejects CEFR-inappropriate advanced vocabulary for A2 lesson', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[4] = {
      ...brokenSteps[4],
      exercise: {
        ...brokenSteps[4].exercise!,
        correctAnswer: "It's time to discuss quarterly monetization strategy.",
        acceptedAnswers: ["It's time to discuss quarterly monetization strategy."],
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps, { audience: 'adult' })
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'cefr_deny_word')).toBe(true)
  })

  it('keeps acceptable A2 answer within CEFR limits', () => {
    const acceptableSteps = toGeneratedPayload()
    acceptableSteps[4] = {
      ...acceptableSteps[4],
      exercise: {
        ...acceptableSteps[4].exercise!,
        correctAnswer: "It's time to go home now.",
        acceptedAnswers: ["It's time to go home now.", 'It is time to go home now.'],
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, acceptableSteps, { audience: 'adult' })
    expect(validation.accepted).toBe(true)
  })

  it('rejects CEFR drift inside english fragment in info bubble', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[1] = {
      ...brokenSteps[1],
      bubbles: [
        brokenSteps[1].bubbles[0],
        {
          type: 'info',
          content: 'После time to используем форму: quarterly monetization strategy.',
        },
        brokenSteps[1].bubbles[2],
      ],
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps, { audience: 'adult' })
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'cefr_deny_word' && issue.message.includes('bubble_content'))).toBe(true)
  })

  it('rejects CEFR drift inside english fragment in footerDynamic', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[4] = {
      ...brokenSteps[4],
      footerDynamic: 'Practice: quarterly monetization strategy',
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps, { audience: 'adult' })
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'cefr_deny_word' && issue.message.includes('footer_dynamic'))).toBe(true)
  })

  it('rejects CEFR drift inside english fragment in hint', () => {
    const brokenSteps = toGeneratedPayload()
    brokenSteps[4] = {
      ...brokenSteps[4],
      exercise: {
        ...brokenSteps[4].exercise!,
        hint: 'Подсказка: используйте quarterly monetization strategy.',
      },
    }

    const validation = assessGeneratedSteps(itsTimeToLesson, itsTimeToLesson.steps, brokenSteps, { audience: 'adult' })
    expect(validation.accepted).toBe(false)
    expect(validation.issues.some((issue) => issue.code === 'cefr_deny_word' && issue.message.includes('hint'))).toBe(true)
  })
})
