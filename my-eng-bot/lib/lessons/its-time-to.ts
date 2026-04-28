import type { LessonData, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep } from '@/types/lesson'

type ItsTimeVariant = {
  id: string
  label: string
  introStateRu: string
  stateTranslationRu: string
  adjective: string
  step2VerbBase: string
  step2VerbThird: string
  step2VerbIng: string
  step3StateRu: string
  step3Adjective: string
  step3Verb: string
  step3Object: string
  step5ActionRu: string
  step5ActionEn: string
  finalActionRu: string
  finalVerbBase: string
  finalVerbIng: string
  sourceSituations: string[]
}

const itsTimeVariants: ItsTimeVariant[] = [
  {
    id: 'evening-dark',
    label: 'Темно и пора спать',
    introStateRu: 'На улице темно',
    stateTranslationRu: 'Темно',
    adjective: 'dark',
    step2VerbBase: 'sleep',
    step2VerbThird: 'sleeps',
    step2VerbIng: 'sleeping',
    step3StateRu: 'Холодно',
    step3Adjective: 'cold',
    step3Verb: 'drink',
    step3Object: 'tea',
    step5ActionRu: 'Пора идти домой',
    step5ActionEn: 'go home',
    finalActionRu: 'Пора спать',
    finalVerbBase: 'sleep',
    finalVerbIng: 'sleeping',
    sourceSituations: ['На улице темно', 'Пора спать', 'Холодно, пора пить чай', 'Пора идти домой'],
  },
  {
    id: 'cold-study',
    label: 'Холодно и пора заниматься',
    introStateRu: 'Сегодня холодно',
    stateTranslationRu: 'Холодно',
    adjective: 'cold',
    step2VerbBase: 'study',
    step2VerbThird: 'studies',
    step2VerbIng: 'studying',
    step3StateRu: 'Голодно',
    step3Adjective: 'hungry',
    step3Verb: 'eat',
    step3Object: 'lunch',
    step5ActionRu: 'Пора делать домашнее задание',
    step5ActionEn: 'do homework',
    finalActionRu: 'Пора заниматься',
    finalVerbBase: 'study',
    finalVerbIng: 'studying',
    sourceSituations: ['Сегодня холодно', 'Пора заниматься', 'Голодно, пора есть обед', 'Пора делать домашнее задание'],
  },
  {
    id: 'hot-rest',
    label: 'Жарко и пора отдохнуть',
    introStateRu: 'В комнате жарко',
    stateTranslationRu: 'Жарко',
    adjective: 'hot',
    step2VerbBase: 'rest',
    step2VerbThird: 'rests',
    step2VerbIng: 'resting',
    step3StateRu: 'Хочется пить',
    step3Adjective: 'thirsty',
    step3Verb: 'drink',
    step3Object: 'water',
    step5ActionRu: 'Пора открыть окно',
    step5ActionEn: 'open the window',
    finalActionRu: 'Пора отдыхать',
    finalVerbBase: 'rest',
    finalVerbIng: 'resting',
    sourceSituations: ['В комнате жарко', 'Пора отдыхать', 'Хочется пить, пора пить воду', 'Пора открыть окно'],
  },
  {
    id: 'late-cook',
    label: 'Поздно и пора готовить',
    introStateRu: 'Уже поздно',
    stateTranslationRu: 'Поздно',
    adjective: 'late',
    step2VerbBase: 'cook',
    step2VerbThird: 'cooks',
    step2VerbIng: 'cooking',
    step3StateRu: 'Идет дождь',
    step3Adjective: 'rainy',
    step3Verb: 'take',
    step3Object: 'an umbrella',
    step5ActionRu: 'Пора позвонить маме',
    step5ActionEn: 'call mom',
    finalActionRu: 'Пора готовить',
    finalVerbBase: 'cook',
    finalVerbIng: 'cooking',
    sourceSituations: ['Уже поздно', 'Пора готовить', 'Идет дождь, пора брать зонт', 'Пора позвонить маме'],
  },
]

const itsTimePostLesson = {
  dynamicFooterText: 'Выбор за вами! Любое действие закрепит материал',
  staticFooterText: '🏆 +50 XP | 🔥 COMBO x7! | 📈 [████████] 7/7',
  interestingFact:
    'В живой речи английского It is часто сокращают до It’s, а сама конструкция It’s time to звучит мягче и естественнее, чем прямой приказ.',
  options: [
    { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
    { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
    { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
    { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
  ],
} as const

function buildItsTimeBlueprints(variant: ItsTimeVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Показать ситуацию, где нужно описать состояние через It is + adjective.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `It's ${variant.adjective}.`,
      sourcePattern: "It's + adjective",
      semanticAnchors: ["it's", variant.adjective],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: [variant.adjective],
        shouldInclude: ["it's"],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['прилагательное', 'состояние'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Показать ситуацию, где нужно выбрать базовый глагол после It is time to.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step2VerbBase,
      sourcePattern: 'It is time to + verb',
      semanticAnchors: ['time to', variant.step2VerbBase],
      semanticExpectations: {
        pedagogicalRole: 'explain_rule',
        mustInclude: ['time to'],
        shouldInclude: [variant.step2VerbBase, 'глагол'],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['глагол', 'начальной форме'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Сопоставить состояние и подходящее действие в короткой бытовой ситуации.',
      exerciseType: 'translate',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step3Verb,
      sourcePattern: 'It is + adjective. It is time to + verb + noun',
      semanticAnchors: [variant.step3Adjective, 'time to', variant.step3Object],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.step3Adjective, variant.step3Object],
        shouldInclude: ['time to'],
        mustAvoid: ['who likes', 'present continuous'],
        hintShouldMention: ['обычно делают'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Закрепить описание состояния полным предложением.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `It's ${variant.adjective}.`,
      sourcePattern: "It's + adjective",
      semanticAnchors: ["it's", variant.adjective],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.adjective],
        shouldInclude: ["it's"],
        mustAvoid: ['who likes', 'time to go'],
        hintShouldMention: ['it is'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Закрепить конструкцию It is time to + verb полным предложением.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `It's time to ${variant.step5ActionEn}.`,
      sourcePattern: "It's time to + verb phrase",
      semanticAnchors: ['time to', variant.step5ActionEn],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['time to', variant.step5ActionEn],
        shouldInclude: ["it's"],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['it is time to'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      learningGoal: 'Проверить, что пользователь различает состояние и действие в новой ситуации.',
      exerciseType: 'micro_quiz',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `It's time to ${variant.finalVerbBase}.`,
      sourcePattern: "It's time to + verb",
      semanticAnchors: ['time to', variant.finalVerbBase],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustInclude: ['time to', variant.finalVerbBase],
        shouldInclude: ['состояние', 'действие'],
        mustAvoid: ['who likes', 'present continuous'],
        hintShouldMention: ['момент', 'действия'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function buildItsTimeSteps(variant: ItsTimeVariant): LessonStep[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: 'Сегодня разберем две полезные конструкции: It is + прилагательное и It is time to + глагол.',
        },
        {
          type: 'info',
          content: 'Первая конструкция описывает состояние, а вторая показывает, что пришло время сделать действие.',
        },
        {
          type: 'task',
          content: `Выберите правильное предложение для ситуации: "${variant.introStateRu}".`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит по смыслу?',
        options: [`It's ${variant.adjective}.`, `It's time to ${variant.adjective}.`, `It's ${variant.adjective} to go.`],
        correctAnswer: `It's ${variant.adjective}.`,
        acceptedAnswers: [`It's ${variant.adjective}.`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Для описания состояния используйте It is + прилагательное.',
      },
      footerDynamic: 'Правило 1: It is + прилагательное',
      myEngComment: 'Вижу, вы готовы к новой конструкции.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Теперь посмотрим на вторую конструкцию: It is time to + глагол.',
        },
        {
          type: 'info',
          content: `После time to используем начальную форму глагола: ${variant.step2VerbBase}, study, go, drink.`,
        },
        {
          type: 'task',
          content: 'Выберите правильное завершение: "It is time to ___."',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Дополните предложение.',
        options: [variant.step2VerbBase, variant.step2VerbThird, variant.step2VerbIng],
        correctAnswer: variant.step2VerbBase,
        acceptedAnswers: [variant.step2VerbBase],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'После "to" нужен глагол в начальной форме.',
      },
      footerDynamic: 'Правило 2: It is time to + глагол',
      myEngComment: 'Отлично, теперь берем действие.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Сравним состояние и действие в нескольких коротких ситуациях.',
        },
        {
          type: 'info',
          content: `Опорный пример: It is ${variant.step3Adjective}. It is time to ${variant.step3Verb} ${variant.step3Object}.`,
        },
        {
          type: 'task',
          content:
            `Переведите на английский короткую фразу (состояние + действие), ` +
            `затем вставьте глагол в шаблон: "It is ${variant.step3Adjective}. It is time to ____ ${variant.step3Object}."`,
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите пропущенное слово.',
        correctAnswer: variant.step3Verb,
        acceptedAnswers: [variant.step3Verb],
        answerFormat: 'single_word',
        answerPolicy: 'strict',
        hint: 'Подумайте, что обычно делают в такой ситуации.',
        variants: [
          {
            id: `${variant.id}_step3_easy`,
            question: `"It is ${variant.step3Adjective}. It is time to ____ ${variant.step3Object}."`,
            correctAnswer: variant.step3Verb,
            acceptedAnswers: [variant.step3Verb],
            hint: 'Подумайте, что обычно делают в такой ситуации.',
            difficulty: 'easy',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step3_medium`,
            question: '"It is cold. It is time to ____ tea."',
            correctAnswer: 'drink',
            acceptedAnswers: ['drink'],
            hint: 'При холоде обычно пьют что-то тёплое.',
            difficulty: 'medium',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: `${variant.id}_step3_hard`,
            question: '"It is thirsty. It is time to ____ water."',
            correctAnswer: 'drink',
            acceptedAnswers: ['drink'],
            hint: 'Когда хочется пить, нужно пить воду.',
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
      footerDynamic: 'Практика: выберите правильный глагол',
      myEngComment: 'Пора почувствовать разницу вживую.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь потренируем описание состояния в трёх вариантах: 1, 2 и 3.',
        },
        {
          type: 'info',
          content: 'Прилагательные описывают ситуацию: dark, cold, hot, late, early.',
        },
        {
          type: 'task',
          content: 'Переведите короткое описание состояния на английский (пройдите варианты 1, 2 и 3).',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите полное предложение на английском.',
        correctAnswer: `It's ${variant.adjective}.`,
        acceptedAnswers: [`It's ${variant.adjective}.`, `It is ${variant.adjective}.`],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: 'Начните с "It is".',
        variants: [
          {
            id: `${variant.id}_step4_easy`,
            question: `Переведите на английский: "${variant.stateTranslationRu}".`,
            correctAnswer: `It's ${variant.adjective}.`,
            acceptedAnswers: [`It's ${variant.adjective}.`, `It is ${variant.adjective}.`],
            hint: 'Начните с "It is".',
            difficulty: 'easy',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
          {
            id: `${variant.id}_step4_medium`,
            question: 'Переведите на английский: "Холодно."',
            correctAnswer: "It's cold.",
            acceptedAnswers: ["It's cold.", 'It is cold.'],
            hint: 'Используйте It is + adjective.',
            difficulty: 'medium',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
          {
            id: `${variant.id}_step4_hard`,
            question: 'Переведите на английский: "Уже поздно."',
            correctAnswer: "It's late.",
            acceptedAnswers: ["It's late.", 'It is late.'],
            hint: 'После It is используйте прилагательное late.',
            difficulty: 'hard',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
        ],
        adaptive: {
          minVariants: 2,
          maxVariants: 3,
          startDifficulty: 'easy',
          errorThreshold: 2,
        },
      },
      footerDynamic: 'Практика: описание состояния',
      myEngComment: 'Хорошо идете, держим темп.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Теперь используем конструкцию действия в полном предложении.',
        },
        {
          type: 'info',
          content: `Ее удобно использовать с повседневными действиями: ${variant.step5ActionEn}, study, sleep, drink tea.`,
        },
        {
          type: 'task',
          content: `Переведите на английский: "${variant.step5ActionRu}".`,
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите полное предложение на английском.',
        correctAnswer: `It's time to ${variant.step5ActionEn}.`,
        acceptedAnswers: [`It's time to ${variant.step5ActionEn}.`, `It is time to ${variant.step5ActionEn}.`],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: 'Используйте "It is time to" + глагол.',
      },
      footerDynamic: 'Практика: соберите полное предложение',
      myEngComment: 'Теперь соберите фразу целиком.',
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Вы почти у финиша, осталось быстро закрепить правило.',
        },
        {
          type: 'info',
          content: `Карточка: It is ${variant.adjective} = состояние. It is time to ${variant.finalVerbBase} = действие.`,
        },
        {
          type: 'task',
          content: `Быстрая проверка: выберите правильную фразу для "${variant.finalActionRu}".`,
        },
      ],
      exercise: {
        type: 'micro_quiz',
        question: `Выберите правильную фразу: "${variant.finalActionRu}"`,
        options: [`It's ${variant.finalVerbBase}.`, `It's time to ${variant.finalVerbBase}.`],
        correctAnswer: `It's time to ${variant.finalVerbBase}.`,
        acceptedAnswers: [`It's time to ${variant.finalVerbBase}.`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Здесь речь о правильном моменте для действия.',
        variants: [
          {
            id: `${variant.id}_micro_1`,
            question: `Выберите правильную фразу: "${variant.finalActionRu}"`,
            options: [`It's ${variant.finalVerbBase}.`, `It's time to ${variant.finalVerbBase}.`],
            correctAnswer: `It's time to ${variant.finalVerbBase}.`,
            acceptedAnswers: [`It's time to ${variant.finalVerbBase}.`],
            hint: 'Здесь речь о действии, а не о состоянии.',
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
      footerDynamic: 'Карточка: It is + adjective | It is time to + verb',
      myEngComment: 'Финиш рядом, осталось одно усилие.',
    },
    {
      stepNumber: 7,
      stepType: 'completion',
      bubbles: [
        {
          type: 'positive',
          content: 'Урок завершен. Теперь вы различаете It is + прилагательное и It is time to + глагол.',
        },
        {
          type: 'info',
          content: 'Используйте первую конструкцию для состояния, а вторую — когда пора что-то сделать.',
        },
        {
          type: 'task',
          content: 'Вы готовы к следующему уроку.',
        },
      ],
      footerDynamic: 'Урок завершен',
      myEngComment: 'Урок пройден. Готовы дальше?',
      postLesson: {
        ...itsTimePostLesson,
        options: itsTimePostLesson.options.map((option) => ({ ...option })),
      },
    },
  ]
}

function buildItsTimeVariantProfile(variant: ItsTimeVariant): LessonRepeatVariantProfile {
  const steps = buildItsTimeSteps(variant)
  return {
    id: variant.id,
    label: variant.label,
    sourceSituations: [...variant.sourceSituations],
    stepBlueprints: buildItsTimeBlueprints(variant),
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
        ...(step.myEngComment ? { myEngComment: step.myEngComment } : {}),
      })),
  }
}

const baseVariant = itsTimeVariants[0]

export const itsTimeToLesson: LessonData = {
  id: '1',
  topic: "Это / Пора",
  level: 'A2',
  variantId: baseVariant.id,
  repeatConfig: {
    ruleSummary: 'Различаем It is + прилагательное для состояния и It is time to + глагол для действия.',
    grammarFocus: ['It is + adjective', 'It is time to + verb'],
    sourceSituations: Array.from(new Set(itsTimeVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildItsTimeBlueprints(baseVariant),
    variantProfiles: itsTimeVariants.map((variant) => buildItsTimeVariantProfile(variant)),
    antiRepeatWindow: 3,
    bannedTerms: ['past simple', 'present continuous', 'future', 'conditionals', 'passive'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
    },
  },
  steps: buildItsTimeSteps(baseVariant),
}
