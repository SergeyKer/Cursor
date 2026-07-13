import type { LessonChallengeAtom } from '@/types/lesson'

export const WHO_LIKES_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'На вечеринке ищут, кто заказал пиццу.',
    targetAnswer: 'Who likes pizza?',
    options: ['Who likes pizza?', 'Who like pizza?', 'What likes pizza?'],
  },
  {
    stepIndex: 1,
    situationRu: 'Хотите спросить вслух, кому нравится кофе.',
    targetAnswer: 'Who likes coffee?',
  },
  {
    stepIndex: 2,
    situationRu: 'На вечеринке у двери стоит незнакомец.',
    targetAnswer: 'Who is that?',
    options: ['Who is that?', 'Who that?', 'Who that is?'],
  },
  {
    stepIndex: 3,
    situationRu: 'На ресепшене спрашиваете, кто здесь работает.',
    targetAnswer: 'Who works here?',
  },
  {
    stepIndex: 4,
    situationRu: 'Расскажите о вкусах брата.',
    translateRu: 'Мой брат любит чай.',
    targetAnswer: 'My brother likes tea.',
  },
  {
    stepIndex: 5,
    situationRu: 'Выберите вопросительное слово про человека.',
    targetAnswer: 'Who',
    dropdownFrameEn: '___ likes chocolate?',
    options: ['Who', 'What', 'Where'],
  },
  {
    stepIndex: 6,
    situationRu: 'Соберите вопрос о чтении в классе.',
    targetAnswer: 'Who reads books?',
    extraWords: ['read', 'does'],
  },
  {
    stepIndex: 7,
    situationRu: 'Диктуете вопрос учителю про чтение.',
    targetAnswer: 'Who reads books in this class?',
  },
  {
    stepIndex: 8,
    situationRu: 'Кто из них любит чай? Послушайте фразу.',
    targetAnswer: 'Anna likes tea.',
    options: ['Anna likes tea.', 'Max likes tea.', 'Anna likes coffee.'],
  },
  {
    stepIndex: 9,
    situationRu: 'Собеседник спрашивает про чай.',
    roleIntroRu: 'Ответьте коротко про брата.',
    interlocutorEn: 'Who likes tea?',
    targetAnswer: 'My brother likes tea.',
  },
  {
    stepIndex: 10,
    situationRu: 'В вопросе про работу лишнее слово.',
    targetAnswer: 'Who works here?',
    brokenPhrase: 'Who work here?',
  },
  {
    stepIndex: 11,
    situationRu: 'На встрече новых людей спросите одним Who-вопросом.',
    targetAnswer: 'Who likes coffee and works here?',
    keywords: ['who'],
    minWords: 4,
  },
] as const
