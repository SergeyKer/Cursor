import type { LocalExplainPack } from '@/lib/tutor/localExplain/types'

/**
 * Wave0 golden path: ≥1 FAQ pack × lessons 1–4.
 * lessonIdHint must open via buildReferenceSheetByLessonId.
 */
export const GOLDEN_PATH_EXPLAIN_PACKS: readonly LocalExplainPack[] = [
  {
    id: 'gp-lesson-1-its-time',
    faqIds: ['a2.word_order.159'],
    matchQueries: [
      'Почему «It’s time to go» / «It’s time we went»?',
      "it's time to go",
      'it’s time to go',
    ],
    answer: {
      answerKind: 'grammar',
      title: "It's time to / It's time for",
      paragraphs: [
        "It's — про обстановку: холодно, темно, поздно. Не про человека.",
        "It's time to + глагол — пора сделать: It's time to go.",
        "It's time for + событие — пора обеда, урока: It's time for lunch.",
      ],
      examplesEn: ["It's cold.", "It's time to sleep.", "It's time for dinner."],
      rememberRu: "Обстановка — It's; действие — time to; событие — time for.",
      topicAnchor: {
        title: "It's / It's time to",
        canonicalKey: 'its_time_to',
        lessonIdHint: '1',
        skillTagIds: ['formal-it'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'gp-lesson-2-who',
    faqIds: ['a2.word_order.099'],
    matchQueries: [
      'Почему «Who did you see?» vs «Who saw you?»?',
      'who did you see?',
      'who saw you?',
    ],
    answer: {
      answerKind: 'contrast',
      title: 'Who …? — кто делает / кого спрашивают',
      paragraphs: [
        'Who saw you? — Who = подлежащее: кто видел. Глагол часто с -s, без did.',
        'Who did you see? — Who = дополнение: кого ты видел. Нужен did + глагол без -s.',
        'В ответе на Who likes… тоже часто -s: Anna likes tea.',
      ],
      examplesEn: ['Who likes music?', 'Who saw you?', 'Who did you see?'],
      rememberRu: 'Who как подлежащее — без did; Who как объект — с did.',
      contrastPair: ['Who saw you?', 'Who did you see?'],
      topicAnchor: {
        title: 'Who ...?',
        canonicalKey: 'who_questions',
        lessonIdHint: '2',
        skillTagIds: ['subject-questions', 'special-questions'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'gp-lesson-3-embedded',
    faqIds: ['b1.reported_speech.043'],
    matchQueries: [
      'Почему «She asked where I lived» (порядок слов прямой)?',
      'she asked where i lived',
      'I know what she likes',
    ],
    answer: {
      answerKind: 'grammar',
      title: 'Встроенный вопрос: прямой порядок слов',
      paragraphs: [
        'Снаружи своя фраза (I know / She asked / Do you know).',
        'Внутри после what/where — обычный порядок: what she likes, where I lived — без does/did внутри.',
        'Ошибка: I know what does she like. Верно: I know what she likes.',
      ],
      examplesEn: [
        'I know what she likes.',
        'She asked where I lived.',
        'Do you know where he lives?',
      ],
      rememberRu: 'Внутри встроенного куска — не прямой вопрос, а обычный порядок слов.',
      topicAnchor: {
        title: 'I know what…',
        canonicalKey: 'embedded_questions',
        lessonIdHint: '3',
        skillTagIds: ['reported-speech', 'word-order'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'gp-lesson-4-i-am',
    faqIds: ['a1.to_be.003'],
    matchQueries: [
      'Почему «I am a student», а не «I is a student»?',
      'i am a student',
      'I am from Russia',
    ],
    answer: {
      answerKind: 'form',
      title: 'I am / I am from',
      paragraphs: [
        'Про себя — всегда I am, не I is и не I are.',
        'После am одно: имя, откуда или профессия: I am Anna / I am from Moscow / I am a teacher.',
        "I'm — то же, что I am; в речи так чаще.",
      ],
      examplesEn: ['I am Anna.', 'I am from Russia.', 'I am a student.'],
      rememberRu: "Про себя через I am (часто I'm): кто, откуда, кем.",
      topicAnchor: {
        title: 'I am / I am from',
        canonicalKey: 'i_am_from',
        lessonIdHint: '4',
        skillTagIds: ['present-simple'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'gp-mistakes-age-be',
    faqIds: ['a1.mistakes.131'],
    matchQueries: [
      'Почему нельзя «I have 20 years»?',
      'i have 20 years',
      'почему нельзя i have 20 years',
    ],
    answer: {
      answerKind: 'grammar',
      title: 'Возраст: I am … years old',
      paragraphs: [
        'Возраст в английском — через be, не через have: I am 20 years old.',
        'Калька с русского «мне 20 лет / у меня 20 лет» даёт ошибку I have 20 years.',
        'Можно короче: I am 20. Про другого: She is 18 years old.',
      ],
      examplesEn: ['I am 20 years old.', 'I am 25 years old.', 'She is 18 years old.'],
      rememberRu: 'Возраст — I am … years old, не I have … years.',
      contrastPair: ['I have 20 years', 'I am 20 years old'],
      topicAnchor: {
        title: 'Возраст: I am … years old',
        canonicalKey: 'age_be',
        lessonIdHint: '4',
        skillTagIds: ['present-simple'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
]
