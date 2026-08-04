import type { ExplainPackStub } from '@/lib/tutor/localExplain/explainPackStub'

/**
 * Wave3 F1 non-idle phrase/functional rewrites.
 * Grows by batch after OK: A(18) + B(13) + C(11) + D(4) = 46. All done.
 * All pending — do not import into lookup / GOLDEN_PATH.
 */
export const EXPLAIN_PACK_QUEUE_WAVE3: readonly ExplainPackStub[] = [
  // --- Batch A: A1 micro + A1 functional ---
  {
    packId: 'gp-a1-micro-173-nice-to-meet',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.173'],
    matchQueries: [
      'Когда при знакомстве говорят «Nice to meet you»?',
      'Почему «Nice to meet you» говорят при первом знакомстве?',
      'nice to meet you',
    ],
    contrastPairHint: ['nice to meet you', 'nice to meet you'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-174-how-do-you-do',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.174'],
    matchQueries: [
      'Почему «How do you do?» почти не говорят в обычной речи?',
      'Почему «How do you do?» почти не используют в обычной речи сейчас?',
      'how do you do?',
    ],
    contrastPairHint: ['how do you do?', 'how do you do?'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-185-bless-you',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.185'],
    matchQueries: [
      'Когда после чихания говорят «Bless you!»?',
      'Почему «Bless you!» когда чихают?',
      'bless you!',
    ],
    contrastPairHint: ['bless you!', 'bless you!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-186-good-luck',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.186'],
    matchQueries: [
      'Когда говорят «Good luck!»?',
      'Почему «Good luck!»?',
      'good luck!',
    ],
    contrastPairHint: ['good luck!', 'good luck!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-187-congratulations',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.187'],
    matchQueries: [
      'Когда говорят «Congratulations!»?',
      'Почему «Congratulations!»?',
      'congratulations!',
    ],
    contrastPairHint: ['congratulations!', 'congratulations!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-188-happy-birthday',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.188'],
    matchQueries: [
      'Когда говорят «Happy birthday!»?',
      'Почему «Happy birthday!»?',
      'happy birthday!',
    ],
    contrastPairHint: ['happy birthday!', 'happy birthday!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-189-merry-christmas',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.189'],
    matchQueries: [
      'Когда говорят «Merry Christmas!» и «Happy New Year!»?',
      'Почему «Merry Christmas!» / «Happy New Year!»?',
      'merry christmas!',
      'happy new year!',
    ],
    contrastPairHint: ['merry christmas!', 'happy new year!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-micro-191-take-care',
    faqIds: ['a1.еще_полезные_микро_вопросы_a1.191'],
    matchQueries: [
      'Когда говорят «Take care!»?',
      'Почему «Take care!»?',
      'take care!',
    ],
    contrastPairHint: ['take care!', 'take care!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-116-nice-to-meet',
    faqIds: ['a1.functional.116'],
    matchQueries: [
      'Что значит «Nice to meet you»?',
      'Почему «Nice to meet you»?',
      'nice to meet you',
    ],
    contrastPairHint: ['nice to meet you', 'nice to meet you'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-117-excuse-sorry',
    faqIds: ['a1.functional.117'],
    matchQueries: [
      'Когда «Excuse me», а когда «Sorry»?',
      'Почему «Excuse me» и «Sorry» - разные?',
      'excuse me',
      'sorry',
    ],
    contrastPairHint: ['sorry', 'excuse me'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-118-please-thank-you',
    faqIds: ['a1.functional.118'],
    matchQueries: [
      'Когда «Yes, please», а когда «No, thank you»?',
      'Почему «Yes, please» и «No, thank you»?',
      'yes, please',
      'no, thank you',
    ],
    contrastPairHint: ['no, thank you', 'yes, please'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-119-here-you-are',
    faqIds: ['a1.functional.119'],
    matchQueries: [
      'Когда говорят «Here you are» / «Here you go»?',
      'Почему «Here you are» / «Here you go»?',
      'here you are',
      'here you go',
    ],
    contrastPairHint: ['here you go', 'here you are'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-120-have-a-nice-day',
    faqIds: ['a1.functional.120'],
    matchQueries: [
      'Когда говорят «Have a nice day!»?',
      'Почему «Have a nice day!»?',
      'have a nice day!',
    ],
    contrastPairHint: ['have a nice day!', 'have a nice day!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-121-see-you',
    faqIds: ['a1.functional.121'],
    matchQueries: [
      'Когда говорят «See you tomorrow!» / «See you later!»?',
      'Почему «See you tomorrow!» / «See you later!»?',
      'see you tomorrow!',
      'see you later!',
    ],
    contrastPairHint: ['see you later!', 'see you tomorrow!'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-122-greetings',
    faqIds: ['a1.functional.122'],
    matchQueries: [
      'Когда говорят «Good morning», «Good afternoon», «Good evening»?',
      'Почему «Good morning / Good afternoon / Good evening»?',
      'good morning / good afternoon / good evening',
    ],
    contrastPairHint: [
      'good morning / good afternoon / good evening',
      'good morning / good afternoon / good evening',
    ],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-123-spell',
    faqIds: ['a1.functional.123'],
    matchQueries: [
      'Как спросить: «How do you spell that?»?',
      'Почему «How do you spell that?»?',
      'how do you spell that?',
    ],
    contrastPairHint: ['how do you spell that?', 'how do you spell that?'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-124-repeat',
    faqIds: ['a1.functional.124'],
    matchQueries: [
      'Как спросить: «Can you repeat that, please?»?',
      'Почему «Can you repeat that, please?»?',
      'can you repeat that, please?',
    ],
    contrastPairHint: ['can you repeat that, please?', 'can you repeat that, please?'],
    status: 'pending',
  },
  {
    packId: 'gp-a1-functional-125-dont-understand',
    faqIds: ['a1.functional.125'],
    matchQueries: [
      'Нормально ли сказать «I don’t understand»?',
      'Почему «I don’t understand» - нормальная фраза?',
      'i don’t understand',
    ],
    contrastPairHint: ['i don’t understand', 'i don’t understand'],
    status: 'pending',
  },
  // --- Batch B: A2 functional 113–125 ---
  {
    packId: 'gp-a2-functional-113-what-do-you-do',
    faqIds: ['a2.functional.113'],
    matchQueries: [
      'Что значит «What do you do?»?',
      'Почему «What do you do?» = вопрос о работе?',
      'what do you do?',
    ],
    contrastPairHint: ['what do you do?', 'what do you do?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-114-hows-it-going',
    faqIds: ['a2.functional.114'],
    matchQueries: [
      'Что значит «How’s it going?»?',
      'Почему «How’s it going?»?',
      'how’s it going?',
    ],
    contrastPairHint: ['how’s it going?', 'how’s it going?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-115-afraid-cant',
    faqIds: ['a2.functional.115'],
    matchQueries: [
      'Что значит «I’m afraid I can’t…»?',
      'Почему «I’m afraid I can’t…»?',
      'i’m afraid i can’t…',
    ],
    contrastPairHint: ['i’m afraid i can’t…', 'i’m afraid i can’t…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-116-would-you-mind',
    faqIds: ['a2.functional.116'],
    matchQueries: [
      'Как вежливо попросить: «Would you mind…?»?',
      'Почему «Would you mind + -ing…?»?',
      'would you mind + -ing…?',
    ],
    contrastPairHint: ['would you mind + -ing…?', 'would you mind + -ing…?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-117-do-you-mind-if',
    faqIds: ['a2.functional.117'],
    matchQueries: [
      'Как спросить разрешения: «Do you mind if I…?»?',
      'Почему «Do you mind if I…?»?',
      'do you mind if i…?',
    ],
    contrastPairHint: ['do you mind if i…?', 'do you mind if i…?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-118-it-depends',
    faqIds: ['a2.functional.118'],
    matchQueries: [
      'Когда «It depends», а когда «It depends on…»?',
      'Почему «It depends» / «It depends on…»?',
      'it depends',
      'it depends on…',
    ],
    contrastPairHint: ['it depends on…', 'it depends'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-119-actually',
    faqIds: ['a2.functional.119'],
    matchQueries: [
      'Что значит «Actually…»?',
      'Почему «Actually…»?',
      'actually…',
    ],
    contrastPairHint: ['actually…', 'actually…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-120-by-the-way',
    faqIds: ['a2.functional.120'],
    matchQueries: [
      'Что значит «By the way…»?',
      'Почему «By the way…»?',
      'by the way…',
    ],
    contrastPairHint: ['by the way…', 'by the way…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-121-anyway',
    faqIds: ['a2.functional.121'],
    matchQueries: [
      'Что значит «Anyway…»?',
      'Почему «Anyway…»?',
      'anyway…',
    ],
    contrastPairHint: ['anyway…', 'anyway…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-122-let-me-see',
    faqIds: ['a2.functional.122'],
    matchQueries: [
      'Что значит «Let me see» / «Let me think»?',
      'Почему «Let me see / Let me think»?',
      'let me see / let me think',
    ],
    contrastPairHint: ['let me think', 'let me see'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-123-you-know',
    faqIds: ['a2.functional.123'],
    matchQueries: [
      'Зачем так часто говорят «You know…»?',
      'Почему «You know…» так часто говорят?',
      'you know…',
    ],
    contrastPairHint: ['you know…', 'you know…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-124-i-mean',
    faqIds: ['a2.functional.124'],
    matchQueries: [
      'Что значит «I mean…»?',
      'Почему «I mean…»?',
      'i mean…',
    ],
    contrastPairHint: ['i mean…', 'i mean…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-125-the-thing-is',
    faqIds: ['a2.functional.125'],
    matchQueries: [
      'Что значит «The thing is…»?',
      'Почему «The thing is…»?',
      'the thing is…',
    ],
    contrastPairHint: ['the thing is…', 'the thing is…'],
    status: 'pending',
  },
  // --- Batch C: A2 functional 161–170 + word_order.196 ---
  {
    packId: 'gp-a2-functional-161-directions',
    faqIds: ['a2.functional.161'],
    matchQueries: [
      'Как спросить дорогу: «Could you tell me how to get to…?»?',
      'Почему «Could you tell me how to get to…?»?',
      'could you tell me how to get to…?',
    ],
    contrastPairHint: ['could you tell me how to get to…?', 'could you tell me how to get to…?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-162-looking-for',
    faqIds: ['a2.functional.162'],
    matchQueries: [
      'Когда говорят «I’m looking for…»?',
      'Как сказать, что ищешь: «I’m looking for…»?',
      'Почему «I’m looking for…»?',
      'i’m looking for…',
    ],
    contrastPairHint: ['i’m looking for…', 'i’m looking for…'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-163-seat-free',
    faqIds: ['a2.functional.163'],
    matchQueries: [
      'Как спросить: «Is this seat free?»?',
      'Почему «Is this seat free?»?',
      'is this seat free?',
    ],
    contrastPairHint: ['is this seat free?', 'is this seat free?'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-164-help-yourself',
    faqIds: ['a2.functional.164'],
    matchQueries: [
      'Что значит «Help yourself»?',
      'Почему «Help yourself»?',
      'help yourself',
    ],
    contrastPairHint: ['help yourself', 'help yourself'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-165-at-home',
    faqIds: ['a2.functional.165'],
    matchQueries: [
      'Что значит «Make yourself at home»?',
      'Почему «Make yourself at home»?',
      'make yourself at home',
    ],
    contrastPairHint: ['make yourself at home', 'make yourself at home'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-166-let-me-know',
    faqIds: ['a2.functional.166'],
    matchQueries: [
      'Что значит «Let me know»?',
      'Почему «Let me know»?',
      'let me know',
    ],
    contrastPairHint: ['let me know', 'let me know'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-167-keep-in-touch',
    faqIds: ['a2.functional.167'],
    matchQueries: [
      'Что значит «Keep in touch»?',
      'Почему «Keep in touch»?',
      'keep in touch',
    ],
    contrastPairHint: ['keep in touch', 'keep in touch'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-168-take-care',
    faqIds: ['a2.functional.168'],
    matchQueries: [
      'Что значит «Take care» на прощание?',
      'Почему «Take care»?',
      'take care',
    ],
    contrastPairHint: ['take care', 'take care'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-169-all-the-best',
    faqIds: ['a2.functional.169'],
    matchQueries: [
      'Что значит «All the best»?',
      'Почему «All the best»?',
      'all the best',
    ],
    contrastPairHint: ['all the best', 'all the best'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-functional-170-congrats-on',
    faqIds: ['a2.functional.170'],
    matchQueries: [
      'Когда говорят «Congratulations on…»?',
      'Почему «Congratulations on…!»?',
      'congratulations on…!',
    ],
    contrastPairHint: ['congratulations on…!', 'congratulations on…!'],
    status: 'pending',
  },
  {
    packId: 'gp-a2-word-order-196-careful-take-care',
    faqIds: ['a2.word_order.196'],
    matchQueries: [
      'Когда «Be careful!», а когда «Take care!»?',
      'Почему «Be careful!» / «Take care!»?',
      'be careful!',
      'take care!',
    ],
    contrastPairHint: ['take care!', 'be careful!'],
    status: 'pending',
  },
  // --- Batch D: B2 functional 161–164 ---
  {
    packId: 'gp-b2-functional-161-not-bad',
    faqIds: ['b2.functional.161'],
    matchQueries: [
      'Когда «It’s not bad» значит «очень хорошо»?',
      'Почему британский английский часто использует understatement?',
      'it’s not bad',
      'understatement',
    ],
    contrastPairHint: ['it’s bad', 'it’s not bad'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-functional-162-not-convinced',
    faqIds: ['b2.functional.162'],
    matchQueries: [
      'Что значит вежливое «I’m not entirely convinced»?',
      'Почему «I’m not entirely convinced» = вежливое «не согласен»?',
      'i’m not entirely convinced',
    ],
    contrastPairHint: ['i disagree', 'i’m not entirely convinced'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-functional-163-interesting-idea',
    faqIds: ['b2.functional.163'],
    matchQueries: [
      'Когда «That’s an interesting idea» значит «мне не нравится»?',
      'Почему «That’s an interesting idea» иногда значит «мне не нравится»?',
      'that’s an interesting idea',
    ],
    contrastPairHint: ['i like it', 'that’s an interesting idea'],
    status: 'pending',
  },
  {
    packId: 'gp-b2-functional-164-coffee-sometime',
    faqIds: ['b2.functional.164'],
    matchQueries: [
      'Когда «We should meet for coffee sometime» — не настоящее приглашение?',
      'Почему «We should meet for coffee sometime» не всегда реальное приглашение?',
      'we should meet for coffee sometime',
    ],
    contrastPairHint: ['let’s meet for coffee tomorrow', 'we should meet for coffee sometime'],
    status: 'pending',
  },
]
