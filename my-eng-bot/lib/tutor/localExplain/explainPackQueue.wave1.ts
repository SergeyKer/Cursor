import type { ExplainPackStub } from '@/lib/tutor/localExplain/explainPackStub'

/**
 * Wave 1+1b: 31 mistake FAQ stubs after contrast rephrase.
 * Only a1.mistakes.131 is already saved (gp-mistakes-age-be).
 * Do not import pending into lookup.
 */
export const EXPLAIN_PACK_QUEUE_WAVE1: readonly ExplainPackStub[] = [
  {
    packId: 'gp-mistakes-age-be',
    faqIds: ['a1.mistakes.131'],
    matchQueries: [
      'Почему «I am 20 years old», а не «I have 20 years»?',
      'Почему нельзя «I have 20 years»?',
      'i have 20 years',
      'почему нельзя i have 20 years',
    ],
    contrastPairHint: ['I have 20 years', 'I am 20 years old'],
    status: 'saved',
  },
  {
    packId: 'gp-a1-mistakes-132',
    faqIds: ['a1.mistakes.132'],
    matchQueries: [
      'Почему «I really like pizza», а не «I very like pizza»?',
      'Почему нельзя «I very like pizza»?',
      'i very like pizza',
    ],
    contrastPairHint: ['I very like pizza', 'I really like pizza'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-133',
    faqIds: ['a1.mistakes.133'],
    matchQueries: [
      'Почему «My brother is a doctor», а не «My brother he is a doctor»?',
      'Почему нельзя «My brother he is a doctor»?',
      'my brother he is a doctor',
    ],
    contrastPairHint: ['My brother he is a doctor', 'My brother is a doctor'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-134',
    faqIds: ['a1.mistakes.134'],
    matchQueries: [
      'Почему «She goes to school», а не «She go to school»?',
      'Почему нельзя «She go to school»?',
      'she go to school',
    ],
    contrastPairHint: ['She go to school', 'She goes to school'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-135',
    faqIds: ['a1.mistakes.135'],
    matchQueries: [
      'Почему «Can you swim?», а не «Do you can swim?»?',
      'Почему нельзя «Do you can swim?»?',
      'do you can swim',
    ],
    contrastPairHint: ['Do you can swim?', 'Can you swim?'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-136',
    faqIds: ['a1.mistakes.136'],
    matchQueries: [
      'Почему «I agree», а не «I am agree»?',
      'Почему нельзя «I am agree»?',
      'i am agree',
    ],
    contrastPairHint: ['I am agree', 'I agree'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-137',
    faqIds: ['a1.mistakes.137'],
    matchQueries: [
      'Почему «I live in London», а не «I am live in London»?',
      'Почему нельзя «I am live in London»?',
      'i am live in london',
    ],
    contrastPairHint: ['I am live in London', 'I live in London'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-138',
    faqIds: ['a1.mistakes.138'],
    matchQueries: [
      'Почему «He doesn’t like», а не «He don’t like»?',
      'Почему нельзя «He don’t like»?',
      'he don’t like',
    ],
    contrastPairHint: ['He don’t like', 'He doesn’t like'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-139',
    faqIds: ['a1.mistakes.139'],
    matchQueries: [
      'Почему «What does it mean?», а не «What’s mean…?»?',
      'Почему нельзя «What’s mean…?»?',
      'what’s mean',
    ],
    contrastPairHint: ['What’s mean…?', 'What does it mean?'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-mistakes-140',
    faqIds: ['a1.mistakes.140'],
    matchQueries: [
      'Почему «I don’t have money», а не «I no have money»?',
      'Почему нельзя «I no have money»?',
      'i no have money',
    ],
    contrastPairHint: ['I no have money', 'I don’t have money'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-mistakes-103',
    faqIds: ['a2.mistakes.103'],
    matchQueries: [
      'Почему «I saw him yesterday», а не «I have seen him yesterday»?',
      'Почему нельзя «I have seen him yesterday»?',
      'i have seen him yesterday',
    ],
    contrastPairHint: ['I have seen him yesterday', 'I saw him yesterday'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-mistakes-104',
    faqIds: ['a2.mistakes.104'],
    matchQueries: [
      'Почему «I must go», а не «I must to go»?',
      'Почему нельзя «I must to go»?',
      'i must to go',
    ],
    contrastPairHint: ['I must to go', 'I must go'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-mistakes-105',
    faqIds: ['a2.mistakes.105'],
    matchQueries: [
      'Почему «She suggested going», а не «She suggested me to go»?',
      'Почему нельзя «She suggested me to go»?',
      'she suggested me to go',
    ],
    contrastPairHint: ['She suggested me to go', 'She suggested going'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-111',
    faqIds: ['b1.mistakes.111'],
    matchQueries: [
      'Почему «If I see him…», а не «If I will see him…»?',
      'Почему нельзя «If I will see him…»?',
      'if i will see him',
    ],
    contrastPairHint: ['If I will see him…', 'If I see him…'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-112',
    faqIds: ['b1.mistakes.112'],
    matchQueries: [
      'Почему «She suggested going», а не «She suggested me to go»?',
      'Почему нельзя «She suggested me to go»?',
      'she suggested me to go',
    ],
    contrastPairHint: ['She suggested me to go', 'She suggested going'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-113',
    faqIds: ['b1.mistakes.113'],
    matchQueries: [
      'Почему для сожаления о прошлом «I regret locking…», а не «I regret to say that I didn’t lock…»?',
      'Почему нельзя «I regret to say that I didn’t lock…» в значении сожаления о прошлом?',
      'i regret to say that i didn’t lock',
    ],
    contrastPairHint: [
      'I regret to say that I didn’t lock…',
      'I regret locking…',
    ],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-161',
    faqIds: ['b1.common_errors_still_made_at_b1.161'],
    matchQueries: [
      'Почему «I have difficulty sleeping», а не «I have difficulty to sleep»?',
      'Почему «I have difficulty to sleep» - ошибка?',
      'i have difficulty to sleep',
    ],
    contrastPairHint: ['I have difficulty to sleep', 'I have difficulty sleeping'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-162',
    faqIds: ['b1.common_errors_still_made_at_b1.162'],
    matchQueries: [
      'Почему «I discussed the problem», а не «I discussed about the problem»?',
      'Почему «I discussed about the problem» - ошибка?',
      'i discussed about the problem',
    ],
    contrastPairHint: ['I discussed about the problem', 'I discussed the problem'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-167',
    faqIds: ['b1.common_errors_still_made_at_b1.167'],
    matchQueries: [
      'Почему «I agree with you», а не «I’m agree with you»?',
      'Почему «I’m agree with you» - классическая ошибка?',
      'i’m agree with you',
    ],
    contrastPairHint: ['I’m agree with you', 'I agree with you'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-168',
    faqIds: ['b1.common_errors_still_made_at_b1.168'],
    matchQueries: [
      'Почему «She told me the truth», а не «She said me the truth»?',
      'Почему «She said me the truth» - ошибка?',
      'she said me the truth',
    ],
    contrastPairHint: ['She said me the truth', 'She told me the truth'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-169',
    faqIds: ['b1.common_errors_still_made_at_b1.169'],
    matchQueries: [
      'Почему «I was waiting for him», а не «I was waiting him»?',
      'Почему «I was waiting him» - ошибка?',
      'i was waiting him',
    ],
    contrastPairHint: ['I was waiting him', 'I was waiting for him'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-common-errors-170',
    faqIds: ['b1.common_errors_still_made_at_b1.170'],
    matchQueries: [
      'Почему «I listened to the music», а не «I listened the music»?',
      'Почему «I listened the music» - ошибка?',
      'i listened the music',
    ],
    contrastPairHint: ['I listened the music', 'I listened to the music'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-114',
    faqIds: ['b1.mistakes.114'],
    matchQueries: [
      'Почему «I agree», а не «I’m agreed»?',
      'Почему «I’m agreed» неправильно?',
      'i’m agreed',
    ],
    contrastPairHint: ['I’m agreed', 'I agree'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-116',
    faqIds: ['b1.mistakes.116'],
    matchQueries: [
      'Почему «I have difficulty doing…», а не «I have difficulty to do»?',
      'Почему «I have difficulty to do» неправильно?',
      'i have difficulty to do',
    ],
    contrastPairHint: ['I have difficulty to do', 'I have difficulty doing…'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-117',
    faqIds: ['b1.mistakes.117'],
    matchQueries: [
      'Почему «despite» / «in spite of», а не «Despite of»?',
      'Почему «Despite of» - ошибка?',
      'despite of',
    ],
    contrastPairHint: ['Despite of', 'despite / in spite of'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-118',
    faqIds: ['b1.mistakes.118'],
    matchQueries: [
      'Почему «I explained the rule to him», а не «I explained him the rule»?',
      'Почему «I explained him the rule» часто ошибка?',
      'i explained him the rule',
    ],
    contrastPairHint: ['I explained him the rule', 'I explained the rule to him'],
    status: 'pending',
  },
  {
    packId: 'gp-b1-mistakes-119',
    faqIds: ['b1.mistakes.119'],
    matchQueries: [
      'Почему «He said to me…» / «He told me…», а не «He said me…»?',
      'Почему «He said me…» неправильно?',
      'he said me',
    ],
    contrastPairHint: ['He said me…', 'He said to me… / He told me…'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-mistakes-099',
    faqIds: ['b2.mistakes.099'],
    matchQueries: [
      'Почему «I am used to waking up early», а не «I am used to wake up early»?',
      'Почему «I am used to wake up early» - ошибка?',
      'i am used to wake up early',
    ],
    contrastPairHint: ['I am used to wake up early', 'I am used to waking up early'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-mistakes-101',
    faqIds: ['b2.mistakes.101'],
    matchQueries: [
      'Почему «I suggest going» / «I suggest that you go», а не «I suggest you to go»?',
      'Почему «I suggest you to go» - ошибка?',
      'i suggest you to go',
    ],
    contrastPairHint: ['I suggest you to go', 'I suggest going / I suggest that you go'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-mistakes-102',
    faqIds: ['b2.mistakes.102'],
    matchQueries: [
      'Почему «He explained the problem to me», а не «He explained me the problem»?',
      'Почему «He explained me the problem» - ошибка?',
      'he explained me the problem',
    ],
    contrastPairHint: ['He explained me the problem', 'He explained the problem to me'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-mistakes-103',
    faqIds: ['b2.mistakes.103'],
    matchQueries: [
      'Почему «I have difficulty understanding», а не «I have difficulty to understand»?',
      'Почему «I have difficulty to understand» - ошибка?',
      'i have difficulty to understand',
    ],
    contrastPairHint: ['I have difficulty to understand', 'I have difficulty understanding'],
    status: 'pending',
  },
]
