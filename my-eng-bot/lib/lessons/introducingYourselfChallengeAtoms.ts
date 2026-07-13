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
    situationRu: 'Нужно назвать себя на встрече.',
    targetAnswer: 'I am Anna.',
    options: ['I am Anna.', 'I Anna.', 'Am I Anna.'],
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
    situationRu: 'Свяжите страну и роль в одной фразе.',
    targetAnswer: 'I am from Russia and I am a student.',
    extraWords: ['an', 'froms'],
  },
  {
    stepIndex: 7,
    situationRu: 'Диктуете представление: город и работа.',
    targetAnswer: 'I am from Moscow and I am a teacher.',
  },
  {
    stepIndex: 8,
    situationRu: 'Из какой страны человек? Послушайте.',
    targetAnswer: "I'm from Brazil.",
    options: ["I'm from Brazil.", "I'm from Spain.", "I'm from Japan."],
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
    brokenPhrase: 'I am from Spain.',
  },
  {
    stepIndex: 11,
    situationRu: 'Коротко представьтесь: имя, город и роль.',
    targetAnswer: "I'm Anna, I'm from Moscow, and I'm a student.",
    keywords: ['i am'],
    minWords: 6,
    acceptedAnswers: ['I am Anna, I am from Moscow, and I am a student.'],
  },
] as const
