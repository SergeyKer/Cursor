import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type { LessonData, LessonFinale, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

type WhoLikesVariant = {
  id: string
  label: string
  introQuestionRu: string
  introObject: string
  introSubject: string
  verbBase: string
  verbThird: string
  verbIng: string
  step3Object: string
  step5QuestionRu: string
  step5Object: string
  step5Subject: string
  step6CreativeObject: string
  step6CreativeSubject: string
  step6CreativeRu: string
  sourceSituations: string[]
}

const whoLikesVariants: WhoLikesVariant[] = [
  {
    id: 'music-likes',
    label: 'Музыка и likes',
    introQuestionRu: 'Кто любит музыку?',
    introObject: 'music',
    introSubject: 'Anna',
    verbBase: 'like',
    verbThird: 'likes',
    verbIng: 'liking',
    step3Object: 'books',
    step5QuestionRu: 'Кто любит чай? Мой брат любит чай.',
    step5Object: 'tea',
    step5Subject: 'My brother',
    step6CreativeObject: 'pizza',
    step6CreativeSubject: 'My dad',
    step6CreativeRu: 'Кто любит пиццу? Мой папа любит пиццу.',
    sourceSituations: ['Кто любит музыку?', 'Кто любит чай?', 'Кто любит читать?', 'Кто любит спорт?'],
  },
  {
    id: 'tea-drinks',
    label: 'Напитки и drinks',
    introQuestionRu: 'Кто пьет чай?',
    introObject: 'tea',
    introSubject: 'Max',
    verbBase: 'drink',
    verbThird: 'drinks',
    verbIng: 'drinking',
    step3Object: 'juice',
    step5QuestionRu: 'Кто пьет кофе? Моя сестра пьет кофе.',
    step5Object: 'coffee',
    step5Subject: 'My sister',
    step6CreativeObject: 'milk',
    step6CreativeSubject: 'My cat',
    step6CreativeRu: 'Кто пьет молоко? Мой кот пьет молоко.',
    sourceSituations: ['Кто пьет чай?', 'Кто пьет кофе?', 'Кто пьет сок?', 'Кто пьет воду утром?'],
  },
  {
    id: 'books-reads',
    label: 'Книги и reads',
    introQuestionRu: 'Кто читает книги?',
    introObject: 'books',
    introSubject: 'Nina',
    verbBase: 'read',
    verbThird: 'reads',
    verbIng: 'reading',
    step3Object: 'stories',
    step5QuestionRu: 'Кто читает комиксы? Мой друг читает комиксы.',
    step5Object: 'comics',
    step5Subject: 'My friend',
    step6CreativeObject: 'poems',
    step6CreativeSubject: 'My grandma',
    step6CreativeRu: 'Кто читает стихи? Моя бабушка читает стихи.',
    sourceSituations: ['Кто читает книги?', 'Кто читает комиксы?', 'Кто читает истории?', 'Кто читает вечером?'],
  },
  {
    id: 'sports-plays',
    label: 'Спорт и plays',
    introQuestionRu: 'Кто играет в футбол?',
    introObject: 'football',
    introSubject: 'Alex',
    verbBase: 'play',
    verbThird: 'plays',
    verbIng: 'playing',
    step3Object: 'tennis',
    step5QuestionRu: 'Кто играет в шахматы? Мой кузен играет в шахматы.',
    step5Object: 'chess',
    step5Subject: 'My cousin',
    step6CreativeObject: 'basketball',
    step6CreativeSubject: 'My team',
    step6CreativeRu: 'Кто играет в баскетбол? Моя команда играет в баскетбол.',
    sourceSituations: ['Кто играет в футбол?', 'Кто играет в теннис?', 'Кто играет в шахматы?', 'Кто играет после школы?'],
  },
]

const WHO_OBJECT_TRANSLATIONS: Record<string, string> = {
  music: 'музыку',
  tea: 'чай',
  books: 'книги',
  football: 'футбол',
  juice: 'сок',
  stories: 'истории',
  coffee: 'кофе',
  comics: 'комиксы',
  chess: 'шахматы',
  water: 'воду',
  tennis: 'теннис',
}

function toWhoLikesQuestionRu(verbBase: string, object: string): string {
  const translatedObject = WHO_OBJECT_TRANSLATIONS[object] ?? object
  if (verbBase === 'play') {
    return `Кто играет в ${translatedObject}?`
  }
  if (verbBase === 'drink') {
    return `Кто пьет ${translatedObject}?`
  }
  if (verbBase === 'read') {
    return `Кто читает ${translatedObject}?`
  }
  return `Кто любит ${translatedObject}?`
}

const whoLikesPostLesson = {
  dynamicFooterText: 'Выбор за вами! Любое действие закрепит материал',
  interestingFact:
    'В вопросах с Who в английском часто сразу используется форма глагола с -s, потому что вопрос строится вокруг одного неизвестного человека.',
  options: DEFAULT_POST_LESSON_OPTIONS,
} as const

function buildWhoLikesBlueprints(variant: WhoLikesVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Показать базовый вопрос с Who в бытовой ситуации.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`,
      sourcePattern: `Who ${variant.verbThird} + noun?`,
      semanticAnchors: ['who', variant.verbThird, variant.introObject],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: ['who', variant.verbThird, variant.introObject],
        shouldInclude: [variant.introSubject.toLowerCase()],
        mustAvoid: ['it is time to', 'past simple'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Пояснить форму глагола после Who.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.verbThird,
      sourcePattern: 'Who + verb-s',
      semanticAnchors: ['who', variant.verbThird],
      semanticExpectations: {
        pedagogicalRole: 'explain_rule',
        mustInclude: ['who', variant.verbThird],
        shouldInclude: ['-s', 'глагол'],
        mustAvoid: ['it is time to', 'future'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Вписать правильную форму глагола в короткий шаблон с Who или подлежащим.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.verbThird,
      sourcePattern: `Who ${variant.verbThird} + noun`,
      semanticAnchors: [variant.verbThird],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.verbThird],
        shouldInclude: ['who'],
        mustAvoid: ['it is time to', 'present continuous'],
        hintShouldMention: ['глагол', 'форму с -s'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести полный вопрос с Who на английский.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      sourcePattern: `Who ${variant.verbThird} + noun?`,
      semanticAnchors: ['who', variant.verbThird, variant.introObject],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['who', variant.verbThird, variant.introObject],
        shouldInclude: ['?'],
        mustAvoid: ['it is time to', 'past simple'],
        hintShouldMention: ['who', variant.verbThird],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать правильные предложения по теме Who в трёх коротких puzzle-вариантах.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      sourcePattern: `word order puzzle for Who + ${variant.verbThird}`,
      semanticAnchors: ['who', variant.verbThird, variant.introObject],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['who', variant.verbThird, variant.introObject],
        shouldInclude: [variant.introSubject.toLowerCase(), 'пазл'],
        mustAvoid: ['it is time to', 'past simple'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Финальная проверка: вопрос Who, ответ с подлежащим и перенос на новую лексику.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'equivalent_variants',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`,
      sourcePattern: `Who ${variant.verbThird} + noun? Subject ${variant.verbThird} + noun.`,
      semanticAnchors: ['who', variant.verbThird, variant.step5Object],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['who', variant.verbThird, variant.step5Object],
        shouldInclude: [variant.step5Subject.toLowerCase()],
        mustAvoid: ['it is time to', 'future'],
        hintShouldMention: ['вопрос', 'ответ'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 3,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Три contrast-gap: форма глагола в вопросе, ответе и новом объекте.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.verbThird,
      sourcePattern: `Who ${variant.verbThird} + noun / Subject ${variant.verbThird} + noun`,
      semanticAnchors: ['who', variant.verbThird, variant.step6CreativeObject],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['it is time to', 'past simple'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function buildWhoPuzzleVariant(id: string, title: string, answer: string): SentencePuzzleVariant {
  const correctOrder = toSentencePuzzleCards(answer)
  return {
    id,
    title,
    instruction: '',
    words: [...correctOrder],
    correctOrder,
    correctAnswer: answer,
    successText: `Верно! ${answer}`,
    errorText: 'Порядок неверный. Попробуйте ещё раз.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Собираем следующий вариант.',
  }
}

function pickWhoLikesObjectDistractors(correctObject: string, fallback: string): [string, string] {
  const pool = ['music', 'tea', 'books', 'football', 'pizza', 'milk', 'poems', 'basketball', 'coffee', 'comics']
  const distractors = pool.filter((item) => item !== correctObject).slice(0, 2)
  return [distractors[0] ?? fallback, distractors[1] ?? 'sports']
}

function buildWhoLikesStep7Variants(variant: WhoLikesVariant) {
  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: variant.introQuestionRu,
      frameEn: `Who ___ ${variant.introObject}?`,
      correctWord: variant.verbThird,
      distractors: [variant.verbBase, variant.verbIng],
      hint: 'После Who в вопросе нужна форма глагола с -s.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: variant.step5QuestionRu,
      frameEn: 'Who likes ___?',
      correctWord: variant.step5Object,
      distractors: pickWhoLikesObjectDistractors(variant.step5Object, variant.introObject),
      hint: 'Вопрос про другой объект — одно слово после глагола в вопросе.',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: variant.step6CreativeRu,
      frameEn: 'Who likes ___?',
      correctWord: variant.step6CreativeObject,
      distractors: pickWhoLikesObjectDistractors(variant.step6CreativeObject, variant.introObject),
      hint: 'Новый объект в вопросе — одно слово после глагола.',
    },
  ])
}

function buildWhoLikesStep6Variants(variant: WhoLikesVariant) {
  const answerSentence = `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`
  const dialogueSentence = `Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`
  const creativeQuestion = `Who ${variant.verbThird} ${variant.step6CreativeObject}?`
  const creativeAnswer = `${variant.step6CreativeSubject} ${variant.verbThird} ${variant.step6CreativeObject}.`
  const creativeFull = `${creativeQuestion} ${creativeAnswer}`

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: `Переведите на английский: "${variant.introSubject} ${WHO_OBJECT_TRANSLATIONS[variant.introObject] ?? variant.introObject}."`,
      correctAnswer: answerSentence,
      acceptedAnswers: [answerSentence],
      hint: `Короткий ответ: ${variant.introSubject} + ${variant.verbThird} + объект.`,
      answerPolicy: 'normalized',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: `Переведите на английский: "${variant.step5QuestionRu}"`,
      correctAnswer: dialogueSentence,
      acceptedAnswers: [dialogueSentence],
      hint: `Сначала вопрос с Who, потом ответ с ${variant.verbThird}.`,
      answerPolicy: 'equivalent_variants',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: `Переведите на английский: "${variant.step6CreativeRu}"`,
      correctAnswer: creativeFull,
      acceptedAnswers: [creativeFull],
      hint: 'Сначала вопрос с Who, потом короткий ответ с тем же глаголом.',
      answerPolicy: 'equivalent_variants',
    },
  ])
}

function buildWhoSentencePuzzleVariants(variant: WhoLikesVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_question`,
      'Пазл 1/3: соберите вопрос',
      `Who ${variant.verbThird} ${variant.introObject}?`
    ),
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_answer`,
      'Пазл 2/3: соберите ответ',
      `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`
    ),
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_new_question`,
      'Пазл 3/3: новая ситуация',
      `Who ${variant.verbThird} ${variant.step5Object}?`
    ),
  ]
}

function buildWhoLikesFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content: 'Урок завершён. Теперь вы умеете строить простые вопросы с Who и отвечать на них.',
      },
      {
        type: 'info',
        content: 'Используйте шаблон Who + verb-s + noun? и давайте короткий ясный ответ.',
      },
      {
        type: 'task',
        content: 'Нажмите «Далее» ниже — и выберите, как закрепить тему.',
      },
    ],
    footerDynamic: 'Урок завершён',
    myEngComment: 'Готово. Вопросы с Who уже ваши.',
    postLesson: {
      ...whoLikesPostLesson,
      options: whoLikesPostLesson.options.map((option) => ({ ...option })),
    },
  }
}

function buildWhoLikesSteps(variant: WhoLikesVariant): LessonStep[] {
  const step3Variants = [
    {
      id: `${variant.id}_step3_easy`,
      question: `Дополните одним словом: "Who ___ ${variant.introObject}?"`,
      correctAnswer: variant.verbThird,
      hint: 'После Who здесь нужна форма глагола с -s.',
      difficulty: 'easy' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_medium`,
      question: `Дополните одним словом: "Tom ___ ${variant.step3Object}."`,
      correctAnswer: variant.verbThird,
      hint: 'После одного человека тоже используем форму глагола с -s.',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: `Дополните одним словом: "${variant.step5Subject} ___ ${variant.step5Object}."`,
      correctAnswer: variant.verbThird,
      hint: 'Если подлежащее в единственном числе, глагол получает окончание -s.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]
  const step4Variants = [
    {
      id: `${variant.id}_step4_easy`,
      question: `Переведите на английский: "${variant.introQuestionRu}"`,
      correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      hint: 'Напишите вопрос по шаблону Who + verb-s + noun?',
      difficulty: 'easy' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_medium`,
      question: `Переведите на английский: "${toWhoLikesQuestionRu(variant.verbBase, variant.step3Object)}"`,
      correctAnswer: `Who ${variant.verbThird} ${variant.step3Object}?`,
      hint: 'Начните с Who и оставьте у глагола окончание -s.',
      difficulty: 'medium' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_hard`,
      question: `Переведите на английский: "${toWhoLikesQuestionRu(variant.verbBase, variant.step5Object)}"`,
      correctAnswer: `Who ${variant.verbThird} ${variant.step5Object}?`,
      hint: 'Соберите полный вопрос: Who + verb-s + noun?',
      difficulty: 'hard' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
  ]

  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: 'Сегодня потренируем короткие вопросы с Who и ответы о том, кто что делает или любит.',
        },
        {
          type: 'info',
          content: 'Такие вопросы помогают быстро узнать, кто любит музыку, пьет чай, читает книги или играет в спорт.',
        },
        {
          type: 'task',
          content: 'Выберите правильное предложение.',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой ответ подходит?',
        options: [
          `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`,
          `${variant.introSubject} ${variant.verbBase} ${variant.introObject}.`,
          `They ${variant.verbThird} ${variant.introObject}.`,
        ],
        correctAnswer: `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`,
        acceptedAnswers: [`${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: `В ответе с ${variant.introSubject} нужен глагол ${variant.verbThird}.`,
      },
      footerDynamic: `Hook: Who ${variant.verbThird} ...?`,
      myEngComment: 'Начинаем мягко, вы быстро схватите.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Посмотрим на форму глагола после Who.',
        },
        {
          type: 'info',
          content: `В вопросах вроде "Who ${variant.verbThird} ${variant.introObject}?" мы часто используем форму с -s: ${variant.verbThird}, reads, drinks, plays.`,
        },
        {
          type: 'task',
          content: `Выберите правильное слово: "Who ___ ${variant.introObject}?"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вариант грамматически верный?',
        options: [variant.verbBase, variant.verbThird, variant.verbIng],
        correctAnswer: variant.verbThird,
        acceptedAnswers: [variant.verbThird],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: `В таком вопросе нужна форма ${variant.verbThird}.`,
      },
      footerDynamic: `Theory: Who + ${variant.verbThird}`,
      myEngComment: 'Отлично, ловим форму глагола.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь закрепим шаблон Who + verb-s в нескольких коротких примерах.',
        },
        {
          type: 'info',
          content: 'Пример: "Who cooks dinner? Sam cooks dinner."',
        },
        {
          type: 'task',
          content: 'Впишите пропущенный глагол по шаблону Who + verb-s.',
        },
      ],
      exercise: {
        type: 'fill_text',
        question: step3Variants[0].question,
        correctAnswer: step3Variants[0].correctAnswer,
        acceptedAnswers: [step3Variants[0].correctAnswer],
        answerFormat: 'single_word',
        answerPolicy: 'strict',
        hint: step3Variants[0].hint,
        variants: step3Variants.map((stepVariant) => ({
          ...stepVariant,
          acceptedAnswers: [stepVariant.correctAnswer],
        })),
      },
      footerDynamic: 'Practice: Who',
      myEngComment: 'Хорошо, теперь короткий ритм вопроса.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Соберём целый вопрос в нескольких новых ситуациях.',
        },
        {
          type: 'info',
          content: 'Пример: "Who opens the window?"',
        },
        {
          type: 'task',
          content: 'Напишите вопрос на английском по знакомому шаблону.',
        },
      ],
      exercise: {
        type: 'translate',
        question: step4Variants[0].question,
        correctAnswer: step4Variants[0].correctAnswer,
        acceptedAnswers: [step4Variants[0].correctAnswer],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: step4Variants[0].hint,
        variants: step4Variants.map((stepVariant) => ({
          ...stepVariant,
          acceptedAnswers: [stepVariant.correctAnswer],
        })),
      },
      footerDynamic: 'Practice: full question',
      myEngComment: 'Собираем вопрос уверенно и спокойно.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь финальный пазл: соберите правильный порядок слов.',
        },
        {
          type: 'info',
          content: 'Будет три коротких сборки: вопрос, ответ и новая ситуация.',
        },
        {
          type: 'task',
          content: 'Соберите слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три предложения из слов.',
        correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
        acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка про первое слово: начинайте вопрос с Who, а глагол оставляйте с -s.',
        bonusXp: 30,
        puzzleVariants: buildWhoSentencePuzzleVariants(variant),
      },
      footerDynamic: 'Пазл: 3 коротких предложения',
      myEngComment: 'Расставьте слова в каждом пазле.',
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Финальная проверка: три коротких задания подряд.',
        },
        {
          type: 'info',
          content: 'Вопрос Who, затем ответ, в конце — новая пара вопрос–ответ с другими словами.',
        },
        {
          type: 'task',
          content: `Переведите на английский: "${variant.introQuestionRu}"`,
        },
      ],
      exercise: (() => {
        const step6Variants = buildWhoLikesStep6Variants(variant)
        const first = step6Variants[0]!
        return {
          type: 'translate',
          question: first.question,
          correctAnswer: first.correctAnswer,
          acceptedAnswers: first.acceptedAnswers,
          answerFormat: 'full_sentence',
          answerPolicy: 'normalized',
          hint: first.hint,
          variants: step6Variants,
        }
      })(),
      footerDynamic: 'Финальная проверка: 3 коротких предложения',
      myEngComment: 'Три фразы подряд — вы почти у финиша.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Быстрый финиш: три слова в вопросе и ответе.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово — форма глагола с -s или без.',
        },
        {
          type: 'task',
          content: 'Выберите одно слово для пропуска в английской рамке.',
        },
      ],
      exercise: (() => {
        const step7Variants = buildWhoLikesStep7Variants(variant)
        const first = step7Variants[0]!
        return {
          type: 'fill_choice',
          question: first.question,
          options: first.options,
          correctAnswer: first.correctAnswer,
          answerFormat: 'choice',
          answerPolicy: 'strict',
          hint: first.hint,
          variants: step7Variants,
        }
      })(),
      footerDynamic: 'Финиш: 3 слова',
      myEngComment: 'Почти финиш, осталось три коротких слова.',
    },
  ]
}

function buildWhoLikesVariantProfile(variant: WhoLikesVariant): LessonRepeatVariantProfile {
  const steps = buildWhoLikesSteps(variant)
  return {
    id: variant.id,
    label: variant.label,
    sourceSituations: [...variant.sourceSituations],
    stepBlueprints: buildWhoLikesBlueprints(variant),
    steps: steps
      .filter((step) => step.stepType !== 'completion')
      .map((step) => ({
        stepNumber: step.stepNumber,
        bubbles: step.bubbles.map((bubble) => ({ ...bubble })) as LessonStep['bubbles'],
        ...(step.exercise
          ? {
              exercise: {
                ...step.exercise,
                ...(step.exercise.options ? { options: [...step.exercise.options] } : {}),
                ...(step.exercise.acceptedAnswers ? { acceptedAnswers: [...step.exercise.acceptedAnswers] } : {}),
                ...(step.exercise.variants
                  ? {
                      variants: step.exercise.variants.map((variantExercise) => ({
                        ...variantExercise,
                        ...(variantExercise.options ? { options: [...variantExercise.options] } : {}),
                        ...(variantExercise.acceptedAnswers ? { acceptedAnswers: [...variantExercise.acceptedAnswers] } : {}),
                      })),
                    }
                  : {}),
                ...(step.exercise.puzzleVariants
                  ? {
                      puzzleVariants: step.exercise.puzzleVariants.map((puzzleVariant) => ({
                        ...puzzleVariant,
                        words: [...puzzleVariant.words],
                        correctOrder: [...puzzleVariant.correctOrder],
                      })) as typeof step.exercise.puzzleVariants,
                    }
                  : {}),
                ...(typeof step.exercise.bonusXp === 'number' ? { bonusXp: step.exercise.bonusXp } : {}),
                ...(step.exercise.adaptive ? { adaptive: { ...step.exercise.adaptive } } : {}),
              },
            }
          : {}),
        footerDynamic: step.footerDynamic,
        ...(step.myEngComment ? { myEngComment: step.myEngComment } : {}),
      })),
  }
}

const baseVariant = whoLikesVariants[0]

export const whoLikesLesson: LessonData = {
  id: '2',
  topic: 'Who ...?',
  level: 'A2',
  intro: {
    topic: 'Who questions',
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: [
        'Who-вопросы помогают спросить, кто делает действие.',
        'В таком вопросе неизвестный человек обычно считается как he/she/it.',
        'Поэтому в Present Simple глагол часто получает -s.',
      ],
      how: [
        'Шаблон вопроса: Who + verb-s + noun?',
        'Шаблон ответа: Name + verb-s + noun.',
        'Не говорим Who like music?, если спрашиваем про одного человека.',
      ],
      examples: [
        { en: 'Who likes music?', ru: 'Кто любит музыку?', note: 'после Who ставим likes' },
        { en: 'Anna likes tea.', ru: 'Анна любит чай.', note: 'Anna = she' },
        { en: 'Who reads books?', ru: 'Кто читает книги?', note: 'read превращается в reads' },
      ],
      takeaway: 'Думай так: Who = один неизвестный человек, поэтому глагол часто с -s.',
    },
    details: {
      points: [
        'Who здесь не просит вспомогательный do/does в начале вопроса.',
        'Форма с -s нужна и в вопросе, и в коротком полном ответе.',
        'Главная ошибка — убрать -s, потому что по-русски такой формы нет.',
      ],
      examples: [
        { en: 'Who drinks coffee?', ru: 'Кто пьет кофе?', note: 'drinks, не drink' },
        { en: 'Max drinks coffee.', ru: 'Макс пьет кофе.', note: 'ответ тем же глаголом' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'Who like music? вместо Who likes music?',
        'Who does likes music? — лишний does рядом с likes.',
        'Anna like music. вместо Anna likes music.',
      ],
      contrastNotes: ['Who likes music? = вопрос.', 'Anna likes music. = ответ.'],
      selfCheckRule: 'Если Who спрашивает про одного человека, проверь -s у глагола.',
    },
    learningPlan: {
      grammarFocus: ['Who questions', 'Present Simple', 'third person singular'],
      firstPracticeGoal: 'Увидеть форму verb-s после Who.',
    },
  },
  variantId: baseVariant.id,
  finale: buildWhoLikesFinale(),
  repeatConfig: {
    ruleSummary: 'Строим вопросы с Who в Present Simple и отвечаем полными фразами с третьим лицом.',
    grammarFocus: ['Who questions', 'Present Simple', 'third person singular'],
    sourceSituations: Array.from(new Set(whoLikesVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildWhoLikesBlueprints(baseVariant),
    variantProfiles: whoLikesVariants.map((variant) => buildWhoLikesVariantProfile(variant)),
    antiRepeatWindow: 3,
    bannedTerms: ['past simple', 'present continuous', 'future', 'conditionals', 'passive'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildWhoLikesSteps(baseVariant),
}
