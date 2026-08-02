import type { TutorExplainAnswer } from '@/lib/tutor/types'

/** Stable Explain fixtures for micro eval (no live LLM in CI). */
export const MICRO_EVAL_FIXTURES: Array<{
  id: string
  userQuestion: string
  expectOfferLocal: boolean
  answer: TutorExplainAnswer
}> = [
  {
    id: 'contrast_pp_ps',
    userQuestion: 'Когда Present Perfect, а когда Past Simple?',
    expectOfferLocal: true,
    answer: {
      answerKind: 'contrast',
      title: 'Present Perfect vs Past Simple',
      paragraphs: [
        'Perfect — есть связь с сейчас.',
        'Past Simple — законченный момент в прошлом.',
      ],
      examplesEn: ['I have lost my keys.', 'I lost my keys yesterday.'],
      contrastPair: ['Present Perfect', 'Past Simple'],
      rememberRu: 'Результат сейчас → Perfect.',
      topicAnchor: {
        title: 'Present Perfect vs Past Simple',
        canonicalKey: 'pp_vs_ps',
        skillTagIds: ['tense.pp'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'thin_translate',
    userQuestion: 'Как сказать «приятно познакомиться»?',
    expectOfferLocal: false,
    answer: {
      answerKind: 'translate',
      title: 'Приятно познакомиться',
      paragraphs: ['Обычная фраза: Nice to meet you.'],
      examplesEn: ['Nice to meet you.'],
      rememberRu: 'Вежливое знакомство.',
      topicAnchor: {
        title: 'Приятно познакомиться',
        canonicalKey: 'nice_to_meet_you',
      },
      cheatsheetVisibility: 'hidden',
    },
  },
  {
    id: 'pragmatic_hint',
    userQuestion: 'Почему «That’s an interesting idea» иногда значит «мне не нравится»?',
    expectOfferLocal: false,
    answer: {
      answerKind: 'other',
      title: 'Вежливый отказ',
      paragraphs: [
        'В британском understatement фраза может быть мягким «нет».',
        'Смысл в тоне, не в грамматике.',
      ],
      examplesEn: ["That's an interesting idea."],
      rememberRu: 'Иногда вежливый отказ, не восторг.',
      topicAnchor: {
        title: 'Вежливый отказ',
        canonicalKey: 'understatement_interesting',
      },
      cheatsheetVisibility: 'secondary',
    },
  },
  {
    id: 'grammar_articles_thin',
    userQuestion: 'Почему «an honest man»?',
    expectOfferLocal: false,
    answer: {
      answerKind: 'grammar',
      title: 'an + silent h',
      paragraphs: ['Перед silent h ставим an.', 'Звук важнее буквы.'],
      examplesEn: ['an honest man'],
      rememberRu: 'Silent h → an.',
      topicAnchor: {
        title: 'Articles',
        canonicalKey: 'articles',
        skillTagIds: ['articles'],
      },
      cheatsheetVisibility: 'primary',
    },
  },
  {
    id: 'grammar_age_mistake',
    userQuestion: 'Почему нельзя «I have 20 years»?',
    expectOfferLocal: true,
    answer: {
      answerKind: 'grammar',
      title: 'Возраст: I am … years old',
      paragraphs: [
        'Возраст — через be, не have.',
        'I am 20 years old, не I have 20 years.',
      ],
      examplesEn: ['I am 20 years old.', 'She is 18 years old.'],
      rememberRu: 'Возраст — I am … years old.',
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
