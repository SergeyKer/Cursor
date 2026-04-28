import type { LessonData, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep } from '@/types/lesson'

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
      learningGoal: 'Закрепить вопросительное слово Who в коротком паттерне.',
      exerciseType: 'translate',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: 'Who',
      sourcePattern: `Who ${variant.verbThird} + noun?`,
      semanticAnchors: ['who', variant.verbThird],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['who', variant.verbThird],
        shouldInclude: [variant.step3Object],
        mustAvoid: ['it is time to', 'present continuous'],
        hintShouldMention: ['кто'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Собрать полный вопрос с Who на английском.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
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
      stepNumber: 6,
      stepType: 'feedback',
      learningGoal: 'Проверить различие между правильной формой и ошибочными вариантами без окончания -s.',
      exerciseType: 'micro_quiz',
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

function buildWhoLikesSteps(variant: WhoLikesVariant): LessonStep[] {
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
          content: `Выберите правильный ответ на вопрос: "Who ${variant.verbThird} ${variant.introObject}?"`,
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
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь закрепим вопросительное слово в нескольких коротких вопросах.',
        },
        {
          type: 'info',
          content: 'Если вы спрашиваете "кто?", в начале будет Who.',
        },
        {
          type: 'task',
          content: 'Дополните вопрос одним словом.',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите одно слово.',
        correctAnswer: 'Who',
        acceptedAnswers: ['Who'],
        answerFormat: 'single_word',
        answerPolicy: 'strict',
        hint: 'Нужно вопросительное слово "кто".',
        variants: [
          {
            id: `${variant.id}_step3_easy`,
            question: `Дополните вопрос: "___ ${variant.verbThird} ${variant.step3Object}?"`,
            correctAnswer: 'Who',
            acceptedAnswers: ['Who'],
            hint: 'Нужно вопросительное слово "кто".',
            difficulty: 'easy',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step3_medium`,
            question: `Дополните вопрос: "___ ${variant.verbThird} ${variant.introObject}?"`,
            correctAnswer: 'Who',
            acceptedAnswers: ['Who'],
            hint: 'В начале вопроса о человеке будет Who.',
            difficulty: 'medium',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step3_hard`,
            question: 'Дополните вопрос: "___ reads comics?"',
            correctAnswer: 'Who',
            acceptedAnswers: ['Who'],
            hint: 'Сначала ставим слово Who.',
            difficulty: 'hard',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
        ],
        adaptive: {
          minVariants: 2,
          maxVariants: 3,
          startDifficulty: 'easy',
          errorThreshold: 2,
        },
      },
      footerDynamic: 'Practice: Who',
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
          content: `Шаблон простой: Who + ${variant.verbThird} + noun?`,
        },
        {
          type: 'task',
          content: 'Переведите вопрос на английский по шаблону.',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите полный вопрос.',
        correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
        acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: `Начните с Who и используйте ${variant.verbThird}.`,
        variants: [
          {
            id: `${variant.id}_step4_easy`,
            question: `Переведите на английский: "${variant.introQuestionRu}"`,
            correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
            acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
            hint: `Начните с Who и используйте ${variant.verbThird}.`,
            difficulty: 'easy',
            answerFormat: 'full_sentence',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step4_medium`,
            question: `Переведите на английский: "Кто ${variant.verbBase === 'read' ? 'читает истории' : `любит ${variant.step3Object}` }?"`,
            correctAnswer:
              variant.verbBase === 'read'
                ? `Who ${variant.verbThird} stories?`
                : `Who ${variant.verbThird} ${variant.step3Object}?`,
            acceptedAnswers:
              variant.verbBase === 'read'
                ? [`Who ${variant.verbThird} stories?`]
                : [`Who ${variant.verbThird} ${variant.step3Object}?`],
            hint: `Нужен шаблон Who + ${variant.verbThird} + noun?`,
            difficulty: 'medium',
            answerFormat: 'full_sentence',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step4_hard`,
            question: `Переведите на английский: "Кто ${variant.verbBase === 'play' ? 'играет в теннис' : variant.verbBase === 'drink' ? 'пьет воду' : 'любит музыку'}?"`,
            correctAnswer:
              variant.verbBase === 'play'
                ? `Who ${variant.verbThird} tennis?`
                : variant.verbBase === 'drink'
                  ? `Who ${variant.verbThird} water?`
                  : `Who ${variant.verbThird} music?`,
            acceptedAnswers:
              variant.verbBase === 'play'
                ? [`Who ${variant.verbThird} tennis?`]
                : variant.verbBase === 'drink'
                  ? [`Who ${variant.verbThird} water?`]
                  : [`Who ${variant.verbThird} music?`],
            hint: 'Сначала Who, затем форма глагола с -s.',
            difficulty: 'hard',
            answerFormat: 'full_sentence',
            answerPolicy: 'strict',
          },
        ],
        adaptive: {
          minVariants: 2,
          maxVariants: 3,
          startDifficulty: 'easy',
          errorThreshold: 2,
        },
      },
      footerDynamic: 'Practice: full question',
    },
    {
      stepNumber: 5,
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
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Осталась быстрая финальная проверка.',
        },
        {
          type: 'info',
          content: `Карточка: в шаблоне с Who используем форму ${variant.verbThird}, а не ${variant.verbBase}.`,
        },
        {
          type: 'task',
          content: 'Быстрый микро-тест: выберите правильный вопрос.',
        },
      ],
      exercise: {
        type: 'micro_quiz',
        question: 'Какой вопрос правильный?',
        options: [
          `Who ${variant.verbThird} ${variant.introObject}?`,
          `Who ${variant.verbBase} ${variant.introObject}?`,
        ],
        correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
        acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: `Нужна форма ${variant.verbThird}.`,
        variants: [
          {
            id: `${variant.id}_micro_1`,
            question: 'Какой вопрос правильный?',
            options: [`Who ${variant.verbThird} ${variant.introObject}?`, `Who ${variant.verbBase} ${variant.introObject}?`],
            correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
            acceptedAnswers: [`Who ${variant.verbThird} ${variant.introObject}?`],
            hint: `Нужна форма ${variant.verbThird}.`,
            difficulty: 'easy',
            answerFormat: 'choice',
            answerPolicy: 'strict',
          },
        ],
        adaptive: {
          minVariants: 1,
          maxVariants: 1,
          startDifficulty: 'easy',
          errorThreshold: 1,
        },
      },
      footerDynamic: 'Карточка: Who + verb-s + noun?',
    },
    {
      stepNumber: 7,
      stepType: 'completion',
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
      postLesson: {
        ...whoLikesPostLesson,
        options: whoLikesPostLesson.options.map((option) => ({ ...option })),
      },
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
              },
            }
          : {}),
        footerDynamic: step.footerDynamic,
      })),
  }
}

const baseVariant = whoLikesVariants[0]

export const whoLikesLesson: LessonData = {
  id: '2',
  topic: 'Who ...?',
  level: 'A2',
  variantId: baseVariant.id,
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
