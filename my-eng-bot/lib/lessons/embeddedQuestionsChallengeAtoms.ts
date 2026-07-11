import type { LessonChallengeAtom } from '@/types/lesson'

export const EMBEDDED_QUESTIONS_CHALLENGE_ATOMS: readonly LessonChallengeAtom[] = [
  {
    stepIndex: 0,
    situationRu: 'Я знаю, что ей нравится.',
    targetAnswer: 'I know what she likes.',
    options: [
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ],
    hint: 'Во вложенной части: what + she + likes, без does перед she.',
  },
  {
    stepIndex: 1,
    situationRu: 'Я не знаю, где он живёт.',
    targetAnswer: "I don't know where he lives.",
  },
  {
    stepIndex: 2,
    situationRu: 'Я знаю, что ему нравится.',
    targetAnswer: 'I know what he likes.',
    options: [
      'I know what he likes.',
      'I know what does he like.',
      'I know what likes he.',
    ],
    hint: 'he likes — обычный порядок слов во вложенной части.',
  },
  {
    stepIndex: 3,
    situationRu: 'Скажи мне, что ей нравится.',
    targetAnswer: 'Tell me what she likes.',
    hint: 'Tell me + what + she + likes.',
  },
  {
    stepIndex: 4,
    situationRu: 'Я не знаю, кто он.',
    targetAnswer: "I don't know who he is.",
    hint: 'who + he + is, без инверсии who is he.',
  },
  {
    stepIndex: 5,
    situationRu: 'Я знаю, что ей нравится чай.',
    targetAnswer: 'that',
    dropdownFrameEn: 'I know ___ she likes tea.',
    options: ['that', 'what', 'who', 'where'],
    hint: 'that вводит утверждение «она любит чай».',
  },
  {
    stepIndex: 6,
    situationRu: 'Я знаю, что нравится Анне, но не знаю, что нравится Алексу.',
    targetAnswer: "I know what Anna likes, but I don't know what Alex likes.",
    hint: 'Свяжите две мысли через but.',
  },
  {
    stepIndex: 7,
    situationRu: 'Я знаю, где работает Анна, но не знаю, где живёт Алекс.',
    targetAnswer: "I know where Anna works, but I don't know where Alex lives.",
  },
  {
    stepIndex: 8,
    situationRu: 'Скажи, когда начинается урок.',
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
    hint: 'who + he + is — вложенный порядок слов.',
  },
  {
    stepIndex: 10,
    situationRu: 'Я знаю, что ей нужно.',
    targetAnswer: 'I know what she wants.',
    brokenPhrase: 'I know what does she want.',
  },
  {
    stepIndex: 11,
    situationRu:
      'Скажи, что нравится Анне и где живёт Алекс; свяжи мысли через but.',
    targetAnswer: "I know what Anna likes, but I don't know where Alex lives.",
    keywords: ['know', 'what', 'where', 'but'],
    minWords: 8,
  },
] as const
