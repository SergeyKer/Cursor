import type { TutorAdaptiveTemplate } from '@/lib/lessonBlueprint'
import type { LessonIntro } from '@/types/lesson'

export type LearningLesson = {
  id: string
  title: string
  theoryIntro: string
  intro?: LessonIntro
  actions: LearningLessonAction[]
  followups: Record<LearningLessonActionId, string>
  adaptiveTemplate?: TutorAdaptiveTemplate
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
  '3': {
    id: '3',
    title: "I don't know where he lives",
    theoryIntro:
      "**Урок:** I don't know where he lives\n" +
      '**Правило:**\n' +
      '1) После do you know, tell me, can you say, I do not know во второй части используем обычный порядок слов.\n' +
      '2) Пишем where he lives, what she likes, where the station is, а не where does he live.\n' +
      '**Примеры:**\n' +
      "1) I don't know where he lives.\n" +
      '2) Do you know what she likes?\n' +
      '3) Tell me where the station is.\n' +
      '**Коротко:** сначала идет вводная фраза, потом вопросительное слово + подлежащее + глагол.\n' +
      '**Шаблоны:**\n' +
      "1) I don't know + where/what/when + подлежащее + глагол.\n" +
      '2) Do you know / Tell me / Can you say + where/what/when + подлежащее + глагол.',
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples:
        '**Примеры:**\n' +
        "1) I don't know where Tom works.\n" +
        '2) Do you know what Anna likes?\n' +
        '3) Can you say when the lesson starts?\n' +
        '4) Tell me where the bank is.',
      repeat_translate:
        '**Переведи на английский:**\n' +
        '1) Я не знаю, где он живет.\n' +
        '2) Ты знаешь, что ей нравится?\n' +
        '3) Скажи мне, где находится станция.',
      fill_phrase:
        '**Подставь слово:**\n' +
        "1) I don't know where he ____. (lives / does live)\n" +
        '2) Do you know what she ____. (likes / does like)\n' +
        '3) Tell me where the station ____. (is / does be)\n' +
        'Выберите вариант с обычным порядком слов.',
      write_own_sentence:
        '**Напиши своё предложение:**\n' +
        "1) I don't know where ...\n" +
        '2) Do you know what ... ?\n' +
        '3) Tell me where ...\n' +
        'Напиши 3 коротких примера по этим шаблонам.',
    },
    footer: {
      dynamicText: 'Теория: встроенные вопросы',
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
    normalized.includes("i don't know where") ||
    normalized.includes('i do not know where') ||
    normalized.includes('do you know what') ||
    normalized.includes('tell me where') ||
    normalized.includes('can you say when') ||
    normalized.includes('embedded question') ||
    normalized.includes('embedded questions') ||
    normalized.includes('indirect question') ||
    normalized.includes('where he lives') ||
    normalized.includes('встроенн') ||
    normalized.includes('косвен') ||
    normalized.includes('где он живет') ||
    normalized.includes('где находится станц')
  ) {
    return LESSONS['3'] ?? null
  }
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
