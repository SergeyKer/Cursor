import type {
  ExerciseDifficulty,
  ExerciseVariant,
  LessonData,
  LessonRepeatStepBlueprint,
  LessonRepeatVariantProfile,
  LessonStep,
} from '@/types/lesson'

type EmbeddedQuestionVariant = {
  id: string
  label: string
  introSituationRu: string
  introCorrectSentence: string
  introWrongSentence: string
  introExtraSentence: string
  theoryLeadEn: string
  theoryCorrectClause: string
  theoryWrongClause: string
  theoryExtraClause: string
  theoryRuleRu: string
  step3Variants: ExerciseVariant[]
  step4Variants: ExerciseVariant[]
  step5TaskRu: string
  step5CorrectAnswer: string
  step5AcceptedAnswers: string[]
  step6TaskRu: string
  step6Options: [string, string, string]
  step6CorrectAnswer: string
  sourceSituations: string[]
}

const embeddedQuestionVariants: EmbeddedQuestionVariant[] = [
  {
    id: 'home-lives',
    label: 'Где он живет',
    introSituationRu: 'Я не знаю, где он живет',
    introCorrectSentence: "I don't know where he lives.",
    introWrongSentence: "I don't know where does he live.",
    introExtraSentence: "I don't know where he live.",
    theoryLeadEn: 'Do you know',
    theoryCorrectClause: 'what she likes',
    theoryWrongClause: 'what does she like',
    theoryExtraClause: 'what she like',
    theoryRuleRu:
      'После do you know, tell me, can you say внутри второй части сохраняем обычный порядок слов: wh-word + subject + verb.',
    step3Variants: [
      {
        id: 'home-lives_step3_easy',
        question: "Дополните одним словом: \"I don't know where he ___.\"",
        correctAnswer: 'lives',
        hint: 'После where ставим обычный порядок слов: сначала he, потом глагол.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'home-lives_step3_medium',
        question: 'Дополните одним словом: "Do you know what she ___?"',
        correctAnswer: 'likes',
        hint: 'Во второй части не нужен does: оставляем обычное подлежащее и глагол.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'home-lives_step3_hard',
        question: 'Дополните одним словом: "Tell me where the station ___."',
        correctAnswer: 'is',
        hint: 'После tell me пишем вложенный вопрос как обычное утверждение.',
        difficulty: 'hard',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
    ],
    step4Variants: [
      {
        id: 'home-lives_step4_easy',
        question: 'Переведите на английский: "Я не знаю, где он живет."',
        correctAnswer: "I don't know where he lives.",
        acceptedAnswers: ['I do not know where he lives.'],
        hint: "Начните с I do not know или I don't know, потом добавьте where + subject + verb.",
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'home-lives_step4_medium',
        question: 'Переведите на английский: "Ты знаешь, что ей нравится?"',
        correctAnswer: 'Do you know what she likes?',
        hint: 'После do you know не меняйте порядок слов внутри второй части.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'home-lives_step4_hard',
        question: 'Переведите на английский: "Скажи мне, где находится станция."',
        correctAnswer: 'Tell me where the station is.',
        hint: 'После tell me используйте where + subject + verb.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, где живет Алекс? Он живет рядом с парком."',
    step5CorrectAnswer: 'Do you know where Alex lives? He lives near the park.',
    step5AcceptedAnswers: ['Do you know where Alex lives? Alex lives near the park.'],
    step6TaskRu: 'Быстрая проверка: выберите правильный вариант для фразы "Скажи мне, где работает Анна."',
    step6Options: [
      'Tell me where Anna works.',
      'Tell me where does Anna work.',
      'Tell me where Anna work.',
    ],
    step6CorrectAnswer: 'Tell me where Anna works.',
    sourceSituations: [
      'Я не знаю, где он живет.',
      'Ты знаешь, что ей нравится?',
      'Скажи мне, где находится станция.',
      'Ты знаешь, где живет Алекс?',
      'Скажи мне, где работает Анна.',
    ],
  },
  {
    id: 'music-likes',
    label: 'Что ей нравится',
    introSituationRu: 'Ты знаешь, что ей нравится',
    introCorrectSentence: 'Do you know what she likes?',
    introWrongSentence: 'Do you know what does she like?',
    introExtraSentence: 'Do you know what she like?',
    theoryLeadEn: 'Can you say',
    theoryCorrectClause: 'when the film starts',
    theoryWrongClause: 'when does the film start',
    theoryExtraClause: 'when the film start',
    theoryRuleRu:
      'Во вложенном вопросе после can you say или do you know не ставим does перед подлежащим.',
    step3Variants: [
      {
        id: 'music-likes_step3_easy',
        question: 'Дополните одним словом: "Do you know what she ___?"',
        correctAnswer: 'likes',
        hint: 'После what she нужен обычный глагол для she.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'music-likes_step3_medium',
        question: 'Дополните одним словом: "Can you say when the film ___?"',
        correctAnswer: 'starts',
        hint: 'Внутри второй части порядок слов как в обычном предложении.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'music-likes_step3_hard',
        question: 'Дополните одним словом: "I do not know where he ___."',
        correctAnswer: 'works',
        hint: 'После where he не нужен does. Нужен обычный глагол.',
        difficulty: 'hard',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
    ],
    step4Variants: [
      {
        id: 'music-likes_step4_easy',
        question: 'Переведите на английский: "Ты знаешь, что ей нравится?"',
        correctAnswer: 'Do you know what she likes?',
        hint: 'Сначала do you know, потом what + subject + verb.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'music-likes_step4_medium',
        question: 'Переведите на английский: "Я не знаю, где он работает."',
        correctAnswer: "I don't know where he works.",
        acceptedAnswers: ['I do not know where he works.'],
        hint: 'Во второй части используйте обычный порядок слов.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'music-likes_step4_hard',
        question: 'Переведите на английский: "Скажи, когда начинается фильм."',
        correctAnswer: 'Can you say when the film starts?',
        hint: 'После can you say не переставляйте start и subject.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, что любит Оля? Она любит джаз."',
    step5CorrectAnswer: 'Do you know what Olya likes? She likes jazz.',
    step5AcceptedAnswers: ['Do you know what Olya likes? Olya likes jazz.'],
    step6TaskRu: 'Быстрая проверка: выберите правильный вариант для фразы "Скажи, когда начинается урок."',
    step6Options: [
      'Can you say when the lesson starts?',
      'Can you say when does the lesson start?',
      'Can you say when the lesson start?',
    ],
    step6CorrectAnswer: 'Can you say when the lesson starts?',
    sourceSituations: [
      'Ты знаешь, что ей нравится?',
      'Скажи, когда начинается фильм.',
      'Я не знаю, где он работает.',
      'Ты знаешь, что любит Оля?',
      'Скажи, когда начинается урок.',
    ],
  },
  {
    id: 'lesson-starts',
    label: 'Когда начинается урок',
    introSituationRu: 'Скажи, когда начинается урок',
    introCorrectSentence: 'Can you say when the lesson starts?',
    introWrongSentence: 'Can you say when does the lesson start?',
    introExtraSentence: 'Can you say when the lesson start?',
    theoryLeadEn: 'Tell me',
    theoryCorrectClause: 'where the cafe is',
    theoryWrongClause: 'where is the cafe',
    theoryExtraClause: 'where the cafe are',
    theoryRuleRu:
      'Во второй части после tell me и can you say используем порядок слов как в обычном сообщении.',
    step3Variants: [
      {
        id: 'lesson-starts_step3_easy',
        question: 'Дополните одним словом: "Can you say when the lesson ___?"',
        correctAnswer: 'starts',
        hint: 'После when the lesson нужен обычный глагол для lesson.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'lesson-starts_step3_medium',
        question: 'Дополните одним словом: "Tell me where the cafe ___."',
        correctAnswer: 'is',
        hint: 'Во вложенном вопросе не переносим is перед subject.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'lesson-starts_step3_hard',
        question: "Дополните одним словом: \"I don't know what she ___.\"",
        correctAnswer: 'wants',
        hint: 'После what she нужен обычный порядок слов и глагол для she.',
        difficulty: 'hard',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
    ],
    step4Variants: [
      {
        id: 'lesson-starts_step4_easy',
        question: 'Переведите на английский: "Скажи, когда начинается урок."',
        correctAnswer: 'Can you say when the lesson starts?',
        hint: 'Сначала can you say, потом when + subject + verb.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'lesson-starts_step4_medium',
        question: 'Переведите на английский: "Скажи мне, где находится кафе."',
        correctAnswer: 'Tell me where the cafe is.',
        hint: 'После tell me используйте where + subject + verb.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'lesson-starts_step4_hard',
        question: 'Переведите на английский: "Я не знаю, чего она хочет."',
        correctAnswer: "I don't know what she wants.",
        acceptedAnswers: ['I do not know what she wants.'],
        hint: 'Внутри второй части не добавляйте does.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, когда начинается фильм? Он начинается в семь."',
    step5CorrectAnswer: 'Do you know when the film starts? It starts at seven.',
    step5AcceptedAnswers: ['Do you know when the film starts? The film starts at seven.'],
    step6TaskRu: 'Быстрая проверка: выберите правильный вариант для фразы "Я не знаю, где находится банк."',
    step6Options: [
      "I don't know where the bank is.",
      "I don't know where is the bank.",
      "I don't know where the bank are.",
    ],
    step6CorrectAnswer: "I don't know where the bank is.",
    sourceSituations: [
      'Скажи, когда начинается урок.',
      'Скажи мне, где находится кафе.',
      'Я не знаю, чего она хочет.',
      'Ты знаешь, когда начинается фильм?',
      'Я не знаю, где находится банк.',
    ],
  },
  {
    id: 'station-is',
    label: 'Где находится станция',
    introSituationRu: 'Скажи мне, где находится станция',
    introCorrectSentence: 'Tell me where the station is.',
    introWrongSentence: 'Tell me where is the station.',
    introExtraSentence: 'Tell me where the station are.',
    theoryLeadEn: "I don't know",
    theoryCorrectClause: 'when they start',
    theoryWrongClause: 'when do they start',
    theoryExtraClause: 'when they starts',
    theoryRuleRu:
      'После I do not know, tell me и can you say во встроенном вопросе порядок слов остаётся обычным.',
    step3Variants: [
      {
        id: 'station-is_step3_easy',
        question: 'Дополните одним словом: "Tell me where the station ___."',
        correctAnswer: 'is',
        hint: 'После where the station нужен обычный порядок слов.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'station-is_step3_medium',
        question: "Дополните одним словом: \"I don't know when they ___.\"",
        correctAnswer: 'start',
        hint: 'Для they используйте обычный глагол без do.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'station-is_step3_hard',
        question: 'Дополните одним словом: "Do you know what he ___?"',
        correctAnswer: 'needs',
        hint: 'Во второй части ставим subject, потом нужную форму глагола.',
        difficulty: 'hard',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
    ],
    step4Variants: [
      {
        id: 'station-is_step4_easy',
        question: 'Переведите на английский: "Скажи мне, где находится станция."',
        correctAnswer: 'Tell me where the station is.',
        hint: 'После tell me используйте where + subject + verb.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'station-is_step4_medium',
        question: 'Переведите на английский: "Я не знаю, когда они начинают."',
        correctAnswer: "I don't know when they start.",
        acceptedAnswers: ['I do not know when they start.'],
        hint: 'Во второй части не нужен do перед they.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'station-is_step4_hard',
        question: 'Переведите на английский: "Ты знаешь, что ему нужно?"',
        correctAnswer: 'Do you know what he needs?',
        hint: 'Сначала do you know, потом what + subject + verb.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Скажи мне, где находится музей. Он рядом со школой."',
    step5CorrectAnswer: 'Tell me where the museum is. It is near the school.',
    step5AcceptedAnswers: ['Tell me where the museum is. The museum is near the school.'],
    step6TaskRu: 'Быстрая проверка: выберите правильный вариант для фразы "Я не знаю, когда они начинают."',
    step6Options: [
      "I don't know when they start.",
      "I don't know when do they start.",
      "I don't know when they starts.",
    ],
    step6CorrectAnswer: "I don't know when they start.",
    sourceSituations: [
      'Скажи мне, где находится станция.',
      'Я не знаю, когда они начинают.',
      'Ты знаешь, что ему нужно?',
      'Скажи мне, где находится музей.',
      'Я не знаю, когда они начинают.',
    ],
  },
]

const embeddedQuestionsPostLesson = {
  dynamicFooterText: 'Выбор за вами! Любое действие закрепит тему',
  staticFooterText: '🏆 +50 XP | 🔥 COMBO x7! | 📈 [████████] 7/7',
  interestingFact:
    'Во встроенных вопросах английский обычно возвращается к обычному порядку слов: where he lives, what she likes, where the station is.',
  options: [
    { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
    { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
    { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
    { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
  ],
} as const

function extractWhWord(text: string): string {
  const match = text.match(/\b(where|what|when)\b/i)
  return match?.[1]?.toLowerCase() ?? 'where'
}

function buildEmbeddedQuestionBlueprints(variant: EmbeddedQuestionVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Распознать правильный порядок слов во встроенном вопросе.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.introCorrectSentence,
      sourcePattern: 'lead phrase + wh-clause with statement word order',
      semanticAnchors: [variant.introCorrectSentence.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: [variant.introCorrectSentence.toLowerCase()],
        shouldInclude: ['порядок слов', 'обычном предложении'],
        mustAvoid: ['if', 'whether', 'past simple'],
        hintShouldMention: ['порядок слов', 'does'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Показать, что внутри встроенного вопроса не нужен вопросительный порядок слов.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.theoryCorrectClause,
      sourcePattern: 'wh-word + subject + verb',
      semanticAnchors: [variant.theoryCorrectClause.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'explain_rule',
        mustInclude: [variant.theoryCorrectClause.toLowerCase()],
        shouldInclude: ['порядок слов', 'subject', 'verb'],
        mustAvoid: ['if', 'whether', 'future perfect'],
        hintShouldMention: ['subject', 'verb'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Вписать глагол или be-форму внутри встроенного вопроса.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step3Variants[0].correctAnswer,
      sourcePattern: 'embedded question with one missing word',
      semanticAnchors: [variant.step3Variants[0].correctAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [extractWhWord(variant.step3Variants[0].question)],
        shouldInclude: ['обычный порядок слов'],
        mustAvoid: ['if', 'whether', 'present continuous'],
        hintShouldMention: ['порядок слов', 'подлежащее'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести короткую фразу во встроенный вопрос.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: variant.step4Variants[0].correctAnswer,
      sourcePattern: 'lead phrase + wh-clause',
      semanticAnchors: [variant.step4Variants[0].correctAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [extractWhWord(variant.step4Variants[0].correctAnswer)],
        shouldInclude: ['порядок слов'],
        mustAvoid: ['if', 'whether', 'where does'],
        hintShouldMention: ['where', 'subject', 'verb'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать маленький бытовой диалог со встроенным вопросом.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'equivalent_variants',
      sourceCorrectAnswer: variant.step5CorrectAnswer,
      sourcePattern: 'question with embedded clause + short answer',
      semanticAnchors: [variant.step5CorrectAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: [extractWhWord(variant.step5CorrectAnswer), '?'],
        shouldInclude: ['вопрос', 'ответ'],
        mustAvoid: ['if', 'whether', 'past simple'],
        hintShouldMention: ['вопрос', 'обычный порядок слов'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 3,
      },
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      learningGoal: 'Отличить правильный встроенный вопрос от ошибки с инверсией.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step6CorrectAnswer,
      sourcePattern: 'correct embedded question without inversion',
      semanticAnchors: [variant.step6CorrectAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustInclude: [variant.step6CorrectAnswer.toLowerCase()],
        shouldInclude: ['does', 'is', 'порядок слов'],
        mustAvoid: ['if', 'whether', 'present continuous'],
        hintShouldMention: ['does', 'is', 'обычный порядок слов'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function cloneExerciseVariant(variant: ExerciseVariant): ExerciseVariant {
  return {
    ...variant,
    ...(variant.options ? { options: [...variant.options] } : {}),
    ...(variant.acceptedAnswers ? { acceptedAnswers: [...variant.acceptedAnswers] } : {}),
  }
}

function difficultyByIndex(index: number): ExerciseDifficulty {
  if (index === 0) return 'easy'
  if (index === 1) return 'medium'
  return 'hard'
}

function buildEmbeddedQuestionSteps(variant: EmbeddedQuestionVariant): LessonStep[] {
  const step3Variants = variant.step3Variants.map((item) => ({
    ...cloneExerciseVariant(item),
    acceptedAnswers: [item.correctAnswer],
  }))
  const step4Variants = variant.step4Variants.map((item) => ({
    ...cloneExerciseVariant(item),
    difficulty: difficultyByIndex(variant.step4Variants.indexOf(item)),
    acceptedAnswers: item.acceptedAnswers ? [item.correctAnswer, ...item.acceptedAnswers] : [item.correctAnswer],
  }))

  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: 'Сегодня тренируем полезную модель: do you know, tell me, can you say + встроенный вопрос.',
        },
        {
          type: 'info',
          content: 'Во второй части порядок слов обычно такой же, как в обычном предложении: where he lives, what she likes.',
        },
        {
          type: 'task',
          content: `Выберите правильную фразу для ситуации: "${variant.introSituationRu}".`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вариант звучит правильно?',
        options: [variant.introCorrectSentence, variant.introWrongSentence, variant.introExtraSentence],
        correctAnswer: variant.introCorrectSentence,
        acceptedAnswers: [variant.introCorrectSentence],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Во встроенном вопросе не ставим does или is перед подлежащим.',
      },
      footerDynamic: 'Правило: wh-word + subject + verb',
      myEngComment: 'Начинаем с самого важного: порядка слов.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Хорошо. Теперь закрепим правило в коротком шаблоне.',
        },
        {
          type: 'info',
          content: `${variant.theoryRuleRu} Сравните: прямой вопрос — "Where does he live?", а во встроенной части — "where he lives".`,
        },
        {
          type: 'task',
          content: `Выберите правильное завершение после "${variant.theoryLeadEn} ...".`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой кусок подходит по правилу?',
        options: [variant.theoryCorrectClause, variant.theoryWrongClause, variant.theoryExtraClause],
        correctAnswer: variant.theoryCorrectClause,
        acceptedAnswers: [variant.theoryCorrectClause],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'После вводной фразы внутри второй части оставляем subject + verb.',
      },
      footerDynamic: 'Теория: без инверсии внутри второй части',
      myEngComment: 'Отлично, теперь правило видно чётко.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь потренируем пропущенное слово внутри встроенного вопроса.',
        },
        {
          type: 'info',
          content: 'Опорный пример с другой лексикой: "I do not know where Tom works."',
        },
        {
          type: 'task',
          content: 'Впишите одно слово так, чтобы внутри второй части остался обычный порядок слов.',
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
        variants: step3Variants,
      },
      footerDynamic: 'Практика: впишите слово',
      myEngComment: 'Здесь важно удержать порядок слов без лишнего does.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь собираем целую фразу на английском.',
        },
        {
          type: 'info',
          content: 'Опорный пример с другой лексикой: "Can you say where the bank is?"',
        },
        {
          type: 'task',
          content: 'Переведите короткую фразу со встроенным вопросом.',
        },
      ],
      exercise: {
        type: 'translate',
        question: step4Variants[0].question,
        correctAnswer: step4Variants[0].correctAnswer,
        acceptedAnswers: step4Variants[0].acceptedAnswers,
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: step4Variants[0].hint,
        variants: step4Variants,
      },
      footerDynamic: 'Практика: соберите полную фразу',
      myEngComment: 'Хорошо, теперь делаем целое предложение.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Переходим к короткому живому мини-диалогу.',
        },
        {
          type: 'info',
          content: 'Сначала дайте фразу со встроенным вопросом, потом добавьте короткий ответ по смыслу.',
        },
        {
          type: 'task',
          content: variant.step5TaskRu,
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите две короткие фразы на английском.',
        correctAnswer: variant.step5CorrectAnswer,
        acceptedAnswers: [variant.step5CorrectAnswer, ...variant.step5AcceptedAnswers],
        answerFormat: 'full_sentence',
        answerPolicy: 'equivalent_variants',
        hint: 'Сначала вопрос или просьба со встроенным вопросом, потом короткий ясный ответ.',
      },
      footerDynamic: 'Практика: вопрос и ответ',
      myEngComment: 'Теперь это уже звучит как реальная речь.',
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Остался быстрый контрастный тест.',
        },
        {
          type: 'info',
          content: 'Смотрите именно на порядок слов после where, what, when: обычный или вопросительный.',
        },
        {
          type: 'task',
          content: variant.step6TaskRu,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вариант правильный?',
        options: [...variant.step6Options],
        correctAnswer: variant.step6CorrectAnswer,
        acceptedAnswers: [variant.step6CorrectAnswer],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Правильный встроенный вопрос не использует инверсию внутри второй части.',
      },
      footerDynamic: 'Проверка: прямой вопрос и встроенный вопрос',
      myEngComment: 'Финиш рядом, осталось увидеть ошибку сразу.',
    },
    {
      stepNumber: 7,
      stepType: 'completion',
      bubbles: [
        {
          type: 'positive',
          content: 'Урок завершен. Теперь вы лучше чувствуете порядок слов во встроенных вопросах.',
        },
        {
          type: 'info',
          content: 'После do you know, tell me, can you say используйте wh-word + subject + verb.',
        },
        {
          type: 'task',
          content: 'Можно закрепить тему на новых бытовых ситуациях.',
        },
      ],
      footerDynamic: 'Урок завершен',
      myEngComment: 'Готово. Теперь where he lives уже звучит естественно.',
      postLesson: {
        ...embeddedQuestionsPostLesson,
        options: embeddedQuestionsPostLesson.options.map((option) => ({ ...option })),
      },
    },
  ]
}

function buildEmbeddedQuestionVariantProfile(variant: EmbeddedQuestionVariant): LessonRepeatVariantProfile {
  const steps = buildEmbeddedQuestionSteps(variant)
  return {
    id: variant.id,
    label: variant.label,
    sourceSituations: [...variant.sourceSituations],
    stepBlueprints: buildEmbeddedQuestionBlueprints(variant),
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
                ...(step.exercise.adaptive ? { adaptive: { ...step.exercise.adaptive } } : {}),
              },
            }
          : {}),
        footerDynamic: step.footerDynamic,
        ...(step.myEngComment ? { myEngComment: step.myEngComment } : {}),
      })),
  }
}

const baseVariant = embeddedQuestionVariants[0]

export const embeddedQuestionsLesson: LessonData = {
  id: '3',
  topic: "I don't know where he lives",
  level: 'A2',
  variantId: baseVariant.id,
  repeatConfig: {
    ruleSummary:
      'После do you know, tell me, can you say и I do not know во второй части используем обычный порядок слов: wh-word + subject + verb.',
    grammarFocus: ['встроенный вопрос', 'wh-word', 'порядок слов'],
    sourceSituations: Array.from(new Set(embeddedQuestionVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildEmbeddedQuestionBlueprints(baseVariant),
    variantProfiles: embeddedQuestionVariants.map((variant) => buildEmbeddedQuestionVariantProfile(variant)),
    antiRepeatWindow: 3,
    bannedTerms: ['if', 'whether', 'past simple', 'present continuous', 'future perfect', 'conditionals', 'passive'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
    },
  },
  steps: buildEmbeddedQuestionSteps(baseVariant),
}
