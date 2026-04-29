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
    step3Object: 'tea',
    step5QuestionRu: 'Кто любит чай? Мой брат любит чай.',
    step5Object: 'tea',
    step5Subject: 'My brother',
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
  staticFooterText: '🏆 +50 XP | 🔥 COMBO x7! | 📈 [████████] 7/7',
  interestingFact:
    'В вопросах с Who в английском часто сразу используется форма глагола с -s, потому что вопрос строится вокруг одного неизвестного человека.',
  options: [
    { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
    { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
    { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
    { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
  ],
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
      learningGoal: 'Дать вопрос и ответ в коротком бытовом мини-диалоге.',
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
      learningGoal: 'Проверить различие между правильной формой и ошибочными вариантами без окончания -s.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      sourcePattern: `Who ${variant.verbThird} + noun?`,
      semanticAnchors: ['who', variant.verbThird, variant.introObject],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustInclude: ['who', variant.verbThird, variant.introObject],
        shouldInclude: [variant.verbBase],
        mustAvoid: ['it is time to', 'past simple'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function toSentenceCards(sentence: string): string[] {
  return sentence
    .replace(/([?.])/g, ' $1')
    .split(/\s+/)
    .filter(Boolean)
}

function buildWhoPuzzleVariant(id: string, title: string, instruction: string, answer: string): SentencePuzzleVariant {
  const correctOrder = toSentenceCards(answer)
  return {
    id,
    title,
    instruction,
    words: [...correctOrder],
    correctOrder,
    correctAnswer: answer,
    successText: `Верно! ${answer}`,
    errorText: 'Порядок неверный. Попробуйте ещё раз.',
    hintText: `Подсказка: первое слово — ${correctOrder[0]}.`,
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Собираем следующий вариант.',
  }
}

function buildWhoSentencePuzzleVariants(variant: WhoLikesVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_question`,
      'Пазл 1/3: соберите вопрос',
      'Нажимайте слова в правильном порядке.',
      `Who ${variant.verbThird} ${variant.introObject}?`
    ),
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_answer`,
      'Пазл 2/3: соберите ответ',
      'Теперь соберите короткий ответ полным предложением.',
      `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`
    ),
    buildWhoPuzzleVariant(
      `${variant.id}_puzzle_new_question`,
      'Пазл 3/3: новая ситуация',
      'Соберите вопрос с новым словом и тем же правилом.',
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
        content: 'Можно закрепить тему на новых ситуациях.',
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
          content: 'Опорный пример с другой лексикой: "Who cooks dinner? Sam cooks dinner."',
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
          content: 'Опорный пример с другой лексикой: "Who opens the window?"',
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
      footerDynamic: 'Пазл: соберите 3 предложения',
      myEngComment: 'Соберите порядок слов — это финальная сборка правила.',
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь используем вопрос и ответ вместе.',
        },
        {
          type: 'info',
          content: 'После вопроса можно дать короткий ясный ответ с подлежащим.',
        },
        {
          type: 'task',
          content: `Переведите на английский: "${variant.step5QuestionRu}"`,
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите две короткие фразы.',
        correctAnswer: `Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`,
        acceptedAnswers: [`Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`],
        answerFormat: 'full_sentence',
        answerPolicy: 'equivalent_variants',
        hint: `Сначала вопрос с Who, потом ответ с ${variant.verbThird}.`,
      },
      footerDynamic: 'Practice: question and answer',
      myEngComment: 'Теперь звучите уже как в диалоге.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Осталась быстрая финальная проверка.',
        },
        {
          type: 'info',
          content: 'Карточка: "Who cooks dinner?" = вопрос. "Sam cooks dinner." = ответ.',
        },
        {
          type: 'task',
          content: 'Быстрый микро-тест: выберите правильный вопрос.',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вопрос правильный?',
        options: [
          `Who ${variant.verbThird} ${variant.introObject}?`,
          `Who ${variant.verbBase} ${variant.introObject}?`,
          `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`,
        ],
        correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
        acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: `Нужна форма ${variant.verbThird}.`,
      },
      footerDynamic: 'Карточка: Who + verb-s + noun?',
      myEngComment: 'Почти финиш, осталось закрепить.',
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
    },
  },
  steps: buildWhoLikesSteps(baseVariant),
}
