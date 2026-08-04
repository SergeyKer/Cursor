import type { ExplainPackStub } from '@/lib/tutor/localExplain/explainPackStub'

/**
 * Wave11 F4 — differentiate duplicate EN chips (11 rewrites; ids not merged).
 * All pending — do not import into lookup / GOLDEN_PATH.
 * Overlapping faqIds in older waves: sync matchQueries; F6 prefer wave11.
 */
export const EXPLAIN_PACK_QUEUE_WAVE11: readonly ExplainPackStub[] = [
  {
    packId: 'gp-f4-a1-099-some-any',
    faqIds: ['a1.указательные_и_количественные_слова.099'],
    matchQueries: [
      'Когда «some» в обычной фразе, а «any» в вопросе или отрицании?',
      'Когда «some», а когда «any»?',
      'some',
    ],
    contrastPairHint: ['some', 'any'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a1-100-how-much-many',
    faqIds: ['a1.указательные_и_количественные_слова.100'],
    matchQueries: [
      'Когда «How much water?», а когда «How many books?»?',
      'Когда «How much…?», а когда «How many…?»?',
      'how much water?',
    ],
    contrastPairHint: ['how much water?', 'how many books?'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a1-101-a-little-a-few',
    faqIds: ['a1.указательные_и_количественные_слова.101'],
    matchQueries: [
      'Чем «a little milk» (мало, не считают) отличается от «a few apples» (мало, но считают)?',
      'Чем «a little milk» отличается от «a few apples»?',
      'a little milk',
    ],
    contrastPairHint: ['a little milk', 'a few apples'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a2-040-a-little-milk',
    faqIds: ['a2.quantifiers.040'],
    matchQueries: [
      'Когда мало молока — «a little milk», а когда мало яблок — «a few apples»?',
      'Чем «a little milk» отличается от «a few apples»?',
      'a little milk',
    ],
    contrastPairHint: ['a little milk', 'a few apples'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a2-042-some-any',
    faqIds: ['a2.quantifiers.042'],
    matchQueries: [
      'Когда «I’ve got some milk», а когда «Have you got any milk?» / «I haven’t got any»?',
      'Когда «some», а когда «any»?',
      'i’ve got some milk',
    ],
    contrastPairHint: ['some', 'any'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a2-043-how-much-many',
    faqIds: ['a2.quantifiers.043'],
    matchQueries: [
      'Когда «How much money?», а когда «How many people?»?',
      'Когда «How much…?», а когда «How many…?»?',
      'how much money?',
    ],
    contrastPairHint: ['how much money?', 'how many people?'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-b1-057-remember-locking',
    faqIds: ['b1.gerunds_infinitives.057'],
    matchQueries: [
      'Когда «I remember locking the door», а когда «I remembered to lock the door»?',
      'Чем «I remember locking the door» отличается от «I remembered to lock the door»?',
      'i remember locking the door',
    ],
    contrastPairHint: ['i remember locking the door', 'i remembered to lock the door'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-b1-112-suggested-going',
    faqIds: ['b1.mistakes.112'],
    matchQueries: [
      'Почему после suggest говорят «She suggested going» или «that we go», а не «She suggested me to go»?',
      'Почему «She suggested going», а не «She suggested me to go»?',
      'she suggested me to go',
    ],
    contrastPairHint: ['she suggested me to go', 'she suggested going'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-b1-166-according-to-me',
    faqIds: ['b1.common_errors_still_made_at_b1.166'],
    matchQueries: [
      'Почему вместо «According to me» почти всегда берут «In my opinion»?',
      'Почему вместо «According to me» лучше «In my opinion»?',
      'according to me',
    ],
    contrastPairHint: ['according to me', 'in my opinion'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-b2-104-according-to-me',
    faqIds: ['b2.mistakes.104'],
    matchQueries: [
      'Почему в тексте «According to me» слабее, чем «In my opinion» / «From my point of view»?',
      'Почему «According to me» странно, а «In my opinion» — нормально?',
      'according to me',
    ],
    contrastPairHint: ['according to me', 'in my opinion'],
    status: 'pending',
  },
  {
    packId: 'gp-f4-a2-009-saw-yesterday',
    faqIds: ['a2.past_simple.009'],
    matchQueries: [
      'Почему с yesterday — «I saw him yesterday», а не Present Perfect «I have seen him yesterday»?',
      'Почему «I saw him yesterday», а не «I have seen him yesterday»?',
      'i saw him yesterday',
    ],
    contrastPairHint: ['i have seen him yesterday', 'i saw him yesterday'],
    status: 'pending',
  },
]
