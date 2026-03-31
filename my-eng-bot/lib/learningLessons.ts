export type LearningLesson = {
  id: string
  title: string
  theoryIntro: string
  actions: LearningLessonAction[]
}

export type LearningLessonActionId = 'examples' | 'repeat_translate' | 'fill_phrase' | 'write_own_sentence'

export type LearningLessonAction = {
  id: LearningLessonActionId
  label: string
}

const LESSONS: Record<string, LearningLesson> = {
  '1': {
    id: '1',
    title: '1. It’s / It’s time to',
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
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'repeat_translate', label: 'Повтори и переведи' },
      { id: 'fill_phrase', label: 'Дополни фразу' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
  },
}

export function getLearningLessonById(lessonId: string): LearningLesson | null {
  return LESSONS[lessonId] ?? null
}

export function getLearningLessonActions(lessonId: string): LearningLessonAction[] {
  return LESSONS[lessonId]?.actions ?? []
}

export function getLearningLessonFollowupPlaceholder(
  lessonId: string,
  actionId: LearningLessonActionId
): string {
  const lesson = LESSONS[lessonId]
  if (!lesson) return ''
  const hasAction = lesson.actions.some((action) => action.id === actionId)
  if (!hasAction) return ''

  const followupByAction: Record<LearningLessonActionId, string> = {
    examples:
      '**Примеры (дополнительно):**\n' +
      '1) It’s late. It’s time to sleep.\n' +
      '2) It’s cold. It’s time to drink tea.\n' +
      '3) It’s dark. It’s time to go home.',
    repeat_translate:
      '**Повтори и переведи:**\n' +
      '1) It’s cold.\n' +
      '2) It’s time to drink tea.\n' +
      'Сначала повтори вслух, затем переведи на русский.',
    fill_phrase:
      '**Дополни фразу:**\n' +
      '1) It’s ____. (dark / cold)\n' +
      '2) It’s time to ____. (sleep / drink tea)\n' +
      'Выбери подходящее слово и прочитай целиком.',
    write_own_sentence:
      '**Напиши своё предложение:**\n' +
      '1) It’s + adjective\n' +
      '2) It’s time to + verb\n' +
      'Напиши 2 своих коротких примера по шаблону.',
  }

  return followupByAction[actionId]
}
