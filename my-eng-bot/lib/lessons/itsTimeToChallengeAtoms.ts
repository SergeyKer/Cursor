import type { LessonChallengeAtom } from '@/types/lesson'

export const ITS_TIME_TO_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'На улице прохладно, выбираете верную фразу.',
    targetAnswer: "It's cold outside.",
    options: ["It's cold outside.", 'Its cold outside.', 'It cold outside.'],
  },
  {
    stepIndex: 1,
    situationRu: 'Пора уходить — произнесите фразу вслух.',
    targetAnswer: "It's time to go.",
  },
  {
    stepIndex: 2,
    situationRu: 'Все голодны — пора ужина.',
    targetAnswer: "It's time for dinner.",
    options: ["It's time for dinner.", "It's time to dinner.", "It's time for go."],
  },
  {
    stepIndex: 3,
    situationRu: 'Соберите фразу про текущее время.',
    targetAnswer: "It's five o'clock.",
  },
  {
    stepIndex: 4,
    situationRu: 'Друзья устали и собираются домой.',
    translateRu: 'Пора идти домой.',
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It is time to go home."],
  },
  {
    stepIndex: 5,
    situationRu: 'Нужно выбрать предлог перед глаголом.',
    targetAnswer: 'to',
    dropdownFrameEn: "It's time ___ leave.",
    options: ['to', 'for', 'at'],
  },
  {
    stepIndex: 6,
    situationRu: 'Свяжите холод на улице и решение уйти.',
    targetAnswer: "It's cold and it's time to go home.",
    extraWords: ['goes', 'times'],
  },
  {
    stepIndex: 7,
    situationRu: 'Диктуете другу, что уже поздно уходить.',
    targetAnswer: "It's late and it's time to go.",
  },
  {
    stepIndex: 8,
    situationRu: 'Послушайте, какая сейчас погода.',
    targetAnswer: "It's cold today.",
    options: ["It's cold today.", "It's hot today.", "It's dark today."],
  },
  {
    stepIndex: 9,
    situationRu: 'Собеседник ждёт решения, что делать дальше.',
    roleIntroRu: 'Уже поздно, нужно решить.',
    interlocutorEn: "It's late. What should we do?",
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It is time to go home."],
  },
  {
    stepIndex: 10,
    situationRu: 'В сообщении ошибка: предлог перед глаголом.',
    targetAnswer: "It's time to go.",
    brokenPhrase: "It's time for go.",
  },
  {
    stepIndex: 11,
    situationRu: 'Нужно закончить вечер: скажите, что поздно и пора домой.',
    targetAnswer: "It's late and it's time to go home.",
    keywords: ['time to'],
    minWords: 6,
  },
] as const
