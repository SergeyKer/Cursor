export type LearningLesson = {
  id: string
  title: string
  theoryIntro: string
}

const LESSONS: Record<string, LearningLesson> = {
  '1': {
    id: '1',
    title: '1. It’s + adj / time to',
    theoryIntro:
      '**Правило:**\n' +
      '1) It’s + прилаг. = состояние.\n' +
      '2) It’s time to + глагол = пора действовать.\n' +
      '**Примеры:**\n' +
      '1) It’s dark. It’s cold.\n' +
      '2) It’s time to drink tea.\n' +
      '**Коротко:** это правило используют, чтобы:\n' +
      '1) описать обстановку или состояние\n' +
      '2) сказать, что пора что-то делать.\n' +
      '**Шаблоны:**\n' +
      '1) It’s + прилаг. (dark, cold, hot, late, early).\n' +
      '2) It’s time to + глагол (drink, go, sleep, study).',
  },
}

export function getLearningLessonById(lessonId: string): LearningLesson | null {
  return LESSONS[lessonId] ?? null
}
