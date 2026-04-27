export type LearningLesson = {
  id: string
  title: string
  theoryIntro: string
  actions: LearningLessonAction[]
  followups: Record<LearningLessonActionId, string>
  footer?: {
    dynamicText?: string
    staticText?: string
  }
}

export type LearningLessonActionId = 'examples' | 'repeat_translate' | 'fill_phrase' | 'write_own_sentence'

export type LearningLessonAction = {
  id: LearningLessonActionId
  label: string
}

const LESSONS: Record<string, LearningLesson> = {
  '1': {
    id: '1',
    title: 'It’s / It’s time to',
    theoryIntro:
      '**Урок:** It’s / It’s time to\n' +
      '**Правило:**\n' +
      '1) It’s + прилагательное = состояние.\n' +
      '2) It’s time to + глагол = пора действовать.\n' +
      '**Примеры:**\n' +
      '1) It’s dark. It’s cold.\n' +
      '2) It’s time to drink tea.\n' +
      '**Коротко:** это правило используют, чтобы:\n' +
      '1) описать обстановку или состояние\n' +
      '2) сказать, что пора что-то делать.\n' +
      '**Шаблоны:**\n' +
      '1) It’s + прилагательное (dark, cold, hot, late, early).\n' +
      '2) It’s time to + глагол (drink, go, sleep, study).',
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples:
        '**Примеры:**\n' +
        '1) It’s late. It’s time to sleep.\n' +
        '2) It’s cold. It’s time to drink tea.\n' +
        '3) It’s dark. It’s time to go home.',
      repeat_translate:
        '**Переведи на английский:**\n' +
        '1) Темно.\n' +
        '2) Холодно.\n' +
        '3) Пора пить чай.',
      fill_phrase:
        '**Подставь слово:**\n' +
        '1) It’s ____. (dark / cold)\n' +
        '2) It’s time to ____. (sleep / drink tea)\n' +
        'Выбери подходящее слово и прочитай целиком.',
      write_own_sentence:
        '**Напиши своё предложение:**\n' +
        '1) It’s + прилагательное\n' +
        '2) It’s time to + глагол\n' +
        'Напиши 3 своих коротких примера по шаблону.',
    },
    footer: {
      dynamicText: 'Теория: It’s + adjective / It’s time to + verb',
      staticText: 'Теория A2',
    },
  },
  '2': {
    id: '2',
    title: 'Who ...?',
    theoryIntro:
      '**Урок:** Who ...?\n' +
      '**Правило:**\n' +
      '1) В вопросах с Who обычно используем форму глагола с -s: likes, reads, drinks.\n' +
      '2) Короткий ответ строим с подлежащим и тем же глаголом: Anna likes music.\n' +
      '**Примеры:**\n' +
      '1) Who likes music? Anna likes music.\n' +
      '2) Who likes tea? My brother likes tea.\n' +
      '**Коротко:** спрашиваем "кто делает?", отвечаем полной фразой.\n' +
      '**Шаблоны:**\n' +
      '1) Who likes ...?\n' +
      '2) [Name] likes ... .',
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples:
        '**Примеры:**\n' +
        '1) Who likes music? Anna likes music.\n' +
        '2) Who likes music? Tom likes music.\n' +
        '3) Who likes tea? My sister likes tea.',
      repeat_translate:
        '**Переведи на английский:**\n' +
        '1) Кто любит музыку?\n' +
        '2) Анна любит музыку.\n' +
        '3) Кто любит музыку?',
      fill_phrase:
        '**Подставь слово:**\n' +
        '1) Who ____ music? (like / likes)\n' +
        '2) Anna ____ tea. (like / likes)\n' +
        'Выберите правильную форму глагола.',
      write_own_sentence:
        '**Напиши своё предложение:**\n' +
        '1) Who likes ...?\n' +
        '2) [Name] likes ... .\n' +
        'Напиши 3 короткие пары вопрос-ответ.',
    },
    footer: {
      dynamicText: 'Теория: Who + likes + noun?',
      staticText: 'Теория A2',
    },
  },
}

const RUNTIME_LESSONS: Record<string, LearningLesson> = {}

export function getLearningLessonById(lessonId: string): LearningLesson | null {
  return RUNTIME_LESSONS[lessonId] ?? LESSONS[lessonId] ?? null
}

export function getLearningLessonActions(lessonId: string): LearningLessonAction[] {
  return getLearningLessonById(lessonId)?.actions ?? []
}

export function getLearningLessonFollowupPlaceholder(
  lessonId: string,
  actionId: LearningLessonActionId
): string {
  const lesson = getLearningLessonById(lessonId)
  if (!lesson) return ''
  const hasAction = lesson.actions.some((action) => action.id === actionId)
  if (!hasAction) return ''
  return lesson.followups[actionId] ?? ''
}

function normalizeTopic(input: string): string {
  return input.toLowerCase().trim()
}

export function findStaticLessonByTopic(topic: string): LearningLesson | null {
  const normalized = normalizeTopic(topic)
  if (!normalized) return null
  if (
    normalized.includes('who likes') ||
    normalized.includes('who like') ||
    normalized.includes('coffee') ||
    normalized.includes('coffe') ||
    normalized.includes('кто любит')
  ) {
    return LESSONS['2'] ?? null
  }
  if (
    normalized.includes("it's") ||
    normalized.includes('it is') ||
    normalized.includes('темно') ||
    normalized.includes('холодно') ||
    normalized.includes('time to')
  ) {
    return LESSONS['1'] ?? null
  }
  return null
}

export function registerRuntimeLearningLesson(lesson: Omit<LearningLesson, 'id'> & { id?: string }): string {
  const id = lesson.id && lesson.id.trim() ? lesson.id : `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  RUNTIME_LESSONS[id] = { ...lesson, id }
  return id
}
