import type { ExplainPackStub } from '@/lib/tutor/localExplain/explainPackStub'

/**
 * Wave10 F3 — residual vs/collocations/meta (12).
 * All pending — do not import into lookup / GOLDEN_PATH.
 * Items already stubbed in wave3/5/7/8/9 keep those stubs in sync (matchQueries).
 */
export const EXPLAIN_PACK_QUEUE_WAVE10: readonly ExplainPackStub[] = [
  {
    packId: 'gp-to-be-013-yes-i-am-short-answer',
    faqIds: ['a1.to_be.013'],
    matchQueries: [
      'Почему на вопрос с be короткий ответ — «Yes, I am» / «No, I’m not», а не голое «Yes» / «No»?',
      'Можно ли ответить просто «Yes» или «No» на вопрос с be?',
      'yes, i am',
    ],
    contrastPairHint: ['yes', 'yes, i am'],
    status: 'pending',
  },
  {
    packId: 'gp-present-continuous-042-work-vs-working',
    faqIds: ['a1.present_continuous.042'],
    matchQueries: [
      'Когда «I work every day», а когда «I am working now»?',
      'В чём разница «I work every day» и «I am working now»?',
      'i work every day',
    ],
    contrastPairHint: ['i work every day', 'i am working now'],
    status: 'pending',
  },
  {
    packId: 'gp-collocations-170-did-a-mistake',
    faqIds: ['b2.collocations.170'],
    matchQueries: [
      'Почему даже при правильной грамматике «I did a mistake» / «powerful coffee» выдают изучающего английский?',
      'Почему странное сочетание слов сразу выдаёт неносителя?',
      'i did a mistake',
    ],
    contrastPairHint: ['i did a mistake', 'powerful coffee'],
    status: 'pending',
  },
  {
    packId: 'gp-present-simple-037-like-swimming',
    faqIds: ['a1.present_simple.037'],
    matchQueries: [
      'Почему после «like / love / hate» часто «…-ing»: «I like swimming»?',
      'Почему после like/love/hate часто -ing?',
      'i like swimming',
    ],
    contrastPairHint: ['i like swimming', 'i like swimming'],
    status: 'pending',
  },
  {
    packId: 'gp-plurals-076-cats-books',
    faqIds: ['a1.plurals.076'],
    matchQueries: [
      'Почему у большинства слов множественное — просто «-s»: «cats», «books»?',
      'Почему у большинства слов множественное просто + -s?',
      'cats',
    ],
    contrastPairHint: ['cats', 'books'],
    status: 'pending',
  },
  {
    packId: 'gp-f3-plurals-079-mouse-mice',
    faqIds: ['a1.plurals.079'],
    matchQueries: [
      'Почему «mouse» во множественном — «mice», а не «mouses»?',
      'Почему «mouse → mice»?',
      'mouse → mice',
    ],
    contrastPairHint: ['mouses', 'mice'],
    status: 'pending',
  },
  {
    packId: 'gp-plurals-080-a-pair-of',
    faqIds: ['a1.plurals.080'],
    matchQueries: [
      'Почему про джинсы / брюки / ножницы говорят «a pair of jeans / trousers / scissors»?',
      'Почему «a pair of jeans / trousers / scissors»?',
      'a pair of jeans / trousers / scissors',
    ],
    contrastPairHint: [
      'a pair of jeans / trousers / scissors',
      'a pair of jeans / trousers / scissors',
    ],
    status: 'pending',
  },
  {
    packId: 'gp-f3-a2-functional-162-looking-for',
    faqIds: ['a2.functional.162'],
    matchQueries: [
      'Когда говорят «I’m looking for…»?',
      'Как сказать, что ищешь: «I’m looking for…»?',
      'i’m looking for…',
    ],
    contrastPairHint: ['i’m looking for…', 'i’m looking for…'],
    status: 'pending',
  },
  {
    packId: 'gp-relative-clauses-073-omit-that',
    faqIds: ['a2.relative_clauses.073'],
    matchQueries: [
      'Когда в «the book (that) I bought» можно опустить who/which/that?',
      'Когда who/which/that можно опустить?',
      'the book (that) i bought',
    ],
    contrastPairHint: ['the book that i bought', 'the book i bought'],
    status: 'pending',
  },
  {
    packId: 'gp-past-perfect-015-not-everywhere',
    faqIds: ['b1.past_perfect.015'],
    matchQueries: [
      'Когда хватает Past Simple («I arrived, she left»), а Past Perfect не нужен в каждом предложении?',
      'В какой ситуации Past Perfect не нужен в каждом прошлом предложении?',
      'i arrived, she left',
    ],
    contrastPairHint: ['i arrived, she left', 'i arrived, she left'],
    status: 'pending',
  },
  {
    packId: 'gp-phrasal-verbs-098-get-up-take-off',
    faqIds: ['b1.phrasal_verbs.098'],
    matchQueries: [
      'Почему у get / take / put / go / look / come так много фразовых вроде «get up», «take off»?',
      'Почему так много фразовых с get / take / put / go / look / come?',
      'get up',
    ],
    contrastPairHint: ['get up', 'take off'],
    status: 'pending',
  },
  {
    packId: 'gp-reported-speech-044-no-backshift',
    faqIds: ['b1.reported_speech.044'],
    matchQueries: [
      'Когда при пересказе оставляют Present: «She said she is tired» (факт всё ещё верен)?',
      'В какой ситуации при пересказе время не сдвигают?',
      'she said she is tired',
    ],
    contrastPairHint: ['she said she is tired', 'she said she was tired'],
    status: 'pending',
  },
]
