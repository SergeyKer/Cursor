import type { LessonChallengeAtom } from '@/types/lesson'

export const INTRODUCING_YOURSELF_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'На знакомстве выбираете фразу о стране.',
    targetAnswer: 'I am from Russia.',
    options: ['I am from Russia.', 'I from Russia.', 'I am from in Russia.'],
  },
  {
    stepIndex: 1,
    situationRu: 'Произнесите коротко, откуда вы.',
    targetAnswer: "I'm from Russia.",
  },
  {
    stepIndex: 2,
    situationRu: 'На встрече говорите о настроении.',
    targetAnswer: 'I am happy.',
    options: ['I am happy.', 'I happy.', 'Am I happy.'],
  },
  {
    stepIndex: 3,
    situationRu: 'Соберите фразу о городе.',
    targetAnswer: 'I am from Moscow.',
  },
  {
    stepIndex: 4,
    situationRu: 'Скажите, откуда вы.',
    translateRu: 'Я из Москвы.',
    targetAnswer: 'I am from Moscow.',
    acceptedAnswers: ["I'm from Moscow."],
  },
  {
    stepIndex: 5,
    situationRu: 'Выберите артикль перед ролью.',
    targetAnswer: 'a',
    dropdownFrameEn: "I'm ___ student.",
    options: ['a', 'an', 'the'],
  },
  {
    stepIndex: 6,
    situationRu: 'Свяжите город и настроение в одной фразе.',
    targetAnswer: 'I am from Moscow and I am happy.',
    extraWords: ['an', 'froms'],
  },
  {
    stepIndex: 7,
    situationRu: 'Диктуете представление: город и настроение.',
    targetAnswer: 'I am from Moscow and I am happy.',
  },
  {
    stepIndex: 8,
    situationRu: 'Как человек себя чувствует? Послушайте.',
    targetAnswer: 'I am happy.',
    options: ['I am happy.', 'I happy.', 'Am I happy.'],
  },
  {
    stepIndex: 9,
    situationRu: 'Sarah спрашивает, откуда вы.',
    roleIntroRu: 'Ответьте Sarah коротко.',
    interlocutorEn: 'Where are you from?',
    targetAnswer: 'I am from Moscow.',
    acceptedAnswers: ["I'm from Moscow."],
  },
  {
    stepIndex: 10,
    situationRu: 'В анкете пропущено важное слово.',
    targetAnswer: 'I am from Russia.',
    brokenPhrase: 'I from Russia.',
  },
  {
    stepIndex: 11,
    situationRu: 'Коротко: город и настроение.',
    targetAnswer: "I'm from Moscow and I'm happy.",
    keywords: ['i am'],
    minWords: 5,
    acceptedAnswers: [
      'I am from Moscow and I am happy.',
      "I'm from Moscow and I am happy.",
      'I am from Moscow and I\'m happy.',
    ],
  },
] as const
