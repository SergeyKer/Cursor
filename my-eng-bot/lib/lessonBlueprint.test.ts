import { describe, expect, it } from 'vitest'
import { isValidLessonBlueprint } from '@/lib/lessonBlueprint'

const baseBlueprint = {
  title: 'Present Perfect vs Past Simple',
  theoryIntro:
    '**Урок:** Present Perfect vs Past Simple\n' +
    '**Правило:**\n' +
    '1) Сравниваем время и результат.\n' +
    '**Примеры:**\n' +
    '1) I have seen it. I saw it yesterday.\n' +
    '**Коротко:** используем время по смыслу.\n' +
    '**Шаблоны:**\n' +
    '1) have/has + V3\n' +
    '2) V2 + finished time',
  actions: [
    { id: 'examples', label: 'Посмотри примеры' },
    { id: 'fill_phrase', label: 'Подставь слово' },
    { id: 'repeat_translate', label: 'Переведи на английский' },
    { id: 'write_own_sentence', label: 'Напиши своё предложение' },
  ],
  followups: {
    examples: 'examples',
    fill_phrase: 'fill',
    repeat_translate: 'repeat',
    write_own_sentence: 'write',
  },
}

describe('lessonBlueprint', () => {
  it('accepts a valid adaptive template', () => {
    expect(
      isValidLessonBlueprint({
        ...baseBlueprint,
        adaptiveTemplate: {
          grammarFocus: ['Present Perfect', 'Past Simple'],
          contrastPair: ['Present Perfect', 'Past Simple'],
          recommendedStartDifficulty: 'easy',
          preferredExerciseModes: ['contrast', 'drill', 'production', 'micro_quiz'],
          supportsAdaptiveVariants: true,
        },
      })
    ).toBe(true)
  })

  it('rejects an invalid adaptive template', () => {
    expect(
      isValidLessonBlueprint({
        ...baseBlueprint,
        adaptiveTemplate: {
          grammarFocus: ['Present Perfect'],
          recommendedStartDifficulty: 'hard',
          preferredExerciseModes: ['contrast'],
          supportsAdaptiveVariants: true,
        },
      })
    ).toBe(false)
  })
})
