import type { LessonChallengeAtom } from '@/types/lesson'

export const EMBEDDED_QUESTIONS_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'На вечеринке друг спрашивает, знакомы ли вы с её вкусами.',
    targetAnswer: 'I know what she likes.',
    options: [
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ],
  },
  {
    stepIndex: 1,
    situationRu: 'Нужно сказать вслух, что его адрес вам неизвестен.',
    targetAnswer: "I don't know where he lives.",
  },
  {
    stepIndex: 2,
    situationRu: 'В кафе обсуждаете, что ему обычно нравится.',
    targetAnswer: 'I know what he likes.',
    options: [
      'I know what he likes.',
      'I know what does he like.',
      'I know what likes he.',
    ],
  },
  {
    stepIndex: 3,
    situationRu: 'Попросите подругу рассказать о её вкусах.',
    targetAnswer: 'Tell me what she likes.',
  },
  {
    stepIndex: 4,
    situationRu: 'На встрече признаёте, что человека не знаете.',
    translateRu: 'Я не знаю, кто он.',
    targetAnswer: "I don't know who he is.",
  },
  {
    stepIndex: 5,
    situationRu: 'Дополните фразу о том, что ей нравится.',
    targetAnswer: 'likes',
    dropdownFrameEn: 'I know what she ___.',
    options: ['likes', 'like', 'does'],
  },
  {
    stepIndex: 6,
    situationRu: 'Другу в чате: что знаете про Анну и чего не знаете про Алекса.',
    targetAnswer: "I know what Anna likes, but I don't know what Alex likes.",
  },
  {
    stepIndex: 7,
    situationRu: 'Диктуете пару мыслей про станцию и начало урока.',
    targetAnswer: "I know where the station is, but I don't know when the lesson starts.",
  },
  {
    stepIndex: 8,
    situationRu: 'На остановке нужно уточнить начало урока.',
    targetAnswer: 'Tell me when the lesson starts.',
    options: [
      'Tell me when the lesson starts.',
      'Tell me when does the lesson start.',
      'Tell me when the lesson start.',
    ],
  },
  {
    stepIndex: 9,
    situationRu: 'Собеседник спрашивает, знакомы ли вы с этим человеком.',
    roleIntroRu: 'Собеседник спрашивает о нём.',
    interlocutorEn: 'Do you know who he is?',
    targetAnswer: "I don't know who he is.",
  },
  {
    stepIndex: 10,
    situationRu: 'Фраза о том, чего она хочет, звучит с ошибкой.',
    targetAnswer: 'I know what she wants.',
    brokenPhrase: 'I know what does she want.',
  },
  {
    stepIndex: 11,
    situationRu: 'Напишите другу: что знаете про Анну и чего не знаете про Алекса.',
    targetAnswer: "I know what Anna likes, but I don't know where Alex lives.",
    keywords: ['know', 'what', 'where', 'but'],
    minWords: 8,
  },
] as const
