import { describe, expect, it } from 'vitest'
import { buildTutorStructuredLesson } from '@/lib/tutorStructuredLesson'
import { buildFallbackTutorLearningIntent, buildLessonIntroFromTutorIntent } from '@/lib/tutorLearningIntent'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'

function makeBlueprint(): LessonBlueprint {
  const tutorIntent = buildFallbackTutorLearningIntent('Colors as Adjectives')
  const focusedIntent = {
    ...tutorIntent,
    id: 'colors-adjectives',
    title: 'Colors as Adjectives',
    targetPatterns: ['a red car', 'a blue bag', 'The car is red'],
    mustTrain: ['a red car', 'a blue bag', 'The car is red'],
    examples: [
      { en: 'a red car', ru: 'красная машина', noteRu: 'цвет стоит перед предметом' },
      { en: 'a blue bag', ru: 'синяя сумка', noteRu: 'blue описывает bag' },
      { en: 'The car is red.', ru: 'Машина красная.', noteRu: 'цвет после be' },
    ],
  }
  return {
    title: focusedIntent.title,
    intro: buildLessonIntroFromTutorIntent(focusedIntent),
    theoryIntro:
      '**Урок:** Colors as Adjectives\n' +
      '**Правило:**\n' +
      '1) Цвет стоит перед предметом.\n' +
      '**Примеры:**\n' +
      '1) a red car\n' +
      '**Коротко:** цвет + предмет.\n' +
      '**Шаблоны:**\n' +
      '1) a red car',
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples: 'a red car',
      fill_phrase: 'a ___ car',
      repeat_translate: 'красная машина',
      write_own_sentence: 'a blue bag',
    },
    tutorIntent: focusedIntent,
  }
}

describe('buildTutorStructuredLesson', () => {
  it('builds practice from tutor intent examples instead of generic rule phrases', () => {
    const lesson = buildTutorStructuredLesson({
      id: 'runtime-colors',
      topic: 'Colors as Adjectives',
      level: 'a2',
      blueprint: makeBlueprint(),
    })

    const lessonText = JSON.stringify(lesson)
    expect(lessonText).toContain('a red car')
    expect(lessonText).toContain('a blue bag')
    expect(lessonText).toContain('The car is red')
    expect(lessonText).not.toContain('I understand this rule')
    expect(lessonText).not.toContain('We ___ short examples')
    expect(lesson.tutorIntent?.title).toBe('Colors as Adjectives')
  })
})
