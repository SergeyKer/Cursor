import { LESSON_READING_CARD_LABELS } from '@/lib/uiCopy/lessonReadingCards'

export const REFERENCE_COPY = {
  menuRootLabel: 'Справочник',
  hubTitle: 'Справочник',
  byLevelLabel: 'По уровню',
  byTopicLabel: 'По теме',
  tagLevelsTitle: 'Уровень по теме',
  tagLessonsTitle: 'Тема по тегу',
  topicCta: 'Справочник',
  searchPlaceholder: 'Например: I am или it’s time',
  searchEmpty: 'Нет шпаргалки по запросу. Попробуй Теорию или Репетитор.',
  searchHitsLabel: 'Найдено',
  cardHook: LESSON_READING_CARD_LABELS.essence,
  cardRule: LESSON_READING_CARD_LABELS.rule,
  cardFormula: LESSON_READING_CARD_LABELS.templates,
  cardExamples: LESSON_READING_CARD_LABELS.examples,
  cardTraps: LESSON_READING_CARD_LABELS.mistakes,
  cardSelfCheck: LESSON_READING_CARD_LABELS.selfCheck,
  back: '← Назад',
  startLesson: 'Пройти урок',
  startPractice: 'Практика',
  myPlanSecondary: 'Справочник',
} as const
