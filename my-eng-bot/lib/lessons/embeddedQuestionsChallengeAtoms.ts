import type { LessonChallengeAtom } from '@/types/lesson'

export const EMBEDDED_QUESTIONS_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'Разговор о её вкусах.',
    targetAnswer: 'I know what she likes.',
    options: [
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ],
  },
  {
    stepIndex: 1,
    situationRu: 'Нужно сказать, что адрес неизвестен.',
    targetAnswer: "I don't know where he lives.",
  },
  {
    stepIndex: 2,
    situationRu: 'Разговор о его вкусах.',
    targetAnswer: 'I know what he likes.',
    options: [
      'I know what he likes.',
      'I know what does he like.',
      'I know what likes he.',
    ],
  },
  {
    stepIndex: 3,
    situationRu: 'Нужно попросить рассказать о её вкусах.',
    targetAnswer: 'Tell me what she likes.',
  },
  {
    stepIndex: 4,
    situationRu: 'Нужно признать, что человек незнаком.',
    translateRu: 'Я не знаю, кто он.',
    targetAnswer: "I don't know who he is.",
  },
  {
    stepIndex: 5,
    situationRu: 'Утверждение о её любимом напитке.',
    targetAnswer: 'that',
    dropdownFrameEn: 'I know ___ she likes tea.',
    options: ['that', 'what', 'who', 'where'],
  },
  {
    stepIndex: 6,
    situationRu: 'Две мысли о вкусах Анны и Алекса — свяжите через but.',
    targetAnswer: "I know what Anna likes, but I don't know what Alex likes.",
  },
  {
    stepIndex: 7,
    situationRu: 'Две мысли о работе Анны и доме Алекса — свяжите через but.',
    targetAnswer: "I know where Anna works, but I don't know where Alex lives.",
  },
  {
    stepIndex: 8,
    situationRu: 'Нужно спросить о начале урока.',
    targetAnswer: 'Tell me when the lesson starts.',
    options: [
      'Tell me when the lesson starts.',
      'Tell me when does the lesson start.',
      'Tell me when the lesson start.',
    ],
  },
  {
    stepIndex: 9,
    situationRu: 'Разговор о человеке.',
    roleIntroRu: 'Собеседник спрашивает о нём.',
    interlocutorEn: 'Do you know who he is?',
    targetAnswer: "I don't know who he is.",
  },
  {
    stepIndex: 10,
    situationRu: 'Фраза о её нужде звучит с ошибкой.',
    targetAnswer: 'I know what she wants.',
    brokenPhrase: 'I know what does she want.',
  },
  {
    stepIndex: 11,
    situationRu: 'Свяжите две мысли о Анне и Алексе через but.',
    targetAnswer: "I know what Anna likes, but I don't know where Alex lives.",
    keywords: ['know', 'what', 'where', 'but'],
    minWords: 8,
  },
] as const
