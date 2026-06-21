import { formatTranslateQuestion } from '@/lib/lessonTranslatePrompt'
import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type { ExerciseDifficulty, LessonData, LessonFinale, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

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
  step3HardRu: string
  step3Adjective: string
  step3Verb: string
  step3Object: string
  step5ActionRu: string
  step5ActionEn: string
  finalActionRu: string
  finalVerbBase: string
  finalVerbIng: string
  step6CreativeActionEn: string
  step6CreativeRu: string
  sourceSituations: string[]
}

const ITS_TIME_STATE_TRANSLATIONS: Record<string, string> = {
  dark: 'Темно.',
  cold: 'Холодно.',
  hot: 'Жарко.',
  late: 'Уже поздно.',
}

function toItsTimeStateSentence(adjective: string): string {
  return `It's ${adjective}.`
}

function toItsTimeStateAcceptedAnswers(adjective: string): string[] {
  return [`It's ${adjective}.`, `It is ${adjective}.`]
}

function toItsTimeStateTranslation(adjective: string): string {
  return ITS_TIME_STATE_TRANSLATIONS[adjective] ?? 'Выберите описание состояния.'
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
    step3HardRu: 'По обстановке видно, что пора согреться',
    step3Adjective: 'cold',
    step3Verb: 'drink',
    step3Object: 'tea',
    step5ActionRu: 'Пора идти домой',
    step5ActionEn: 'go home',
    finalActionRu: 'Пора спать',
    finalVerbBase: 'sleep',
    finalVerbIng: 'sleeping',
    step6CreativeActionEn: 'read a book',
    step6CreativeRu: 'Пора почитать книгу',
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
    step3HardRu: 'По обстановке видно, что пора перекусить',
    step3Adjective: 'hungry',
    step3Verb: 'eat',
    step3Object: 'lunch',
    step5ActionRu: 'Пора делать домашнее задание',
    step5ActionEn: 'do homework',
    finalActionRu: 'Пора заниматься',
    finalVerbBase: 'study',
    finalVerbIng: 'studying',
    step6CreativeActionEn: 'wash hands',
    step6CreativeRu: 'Пора вымыть руки',
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
    step3HardRu: 'По состоянию понятно, что пора утолить жажду',
    step3Adjective: 'thirsty',
    step3Verb: 'drink',
    step3Object: 'water',
    step5ActionRu: 'Пора открыть окно',
    step5ActionEn: 'open the window',
    finalActionRu: 'Пора отдыхать',
    finalVerbBase: 'rest',
    finalVerbIng: 'resting',
    step6CreativeActionEn: 'take a shower',
    step6CreativeRu: 'Пора принять душ',
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
    step3HardRu: 'По погоде ясно, что пора взять защиту от дождя',
    step3Adjective: 'rainy',
    step3Verb: 'take',
    step3Object: 'an umbrella',
    step5ActionRu: 'Пора позвонить маме',
    step5ActionEn: 'call mom',
    finalActionRu: 'Пора готовить',
    finalVerbBase: 'cook',
    finalVerbIng: 'cooking',
    step6CreativeActionEn: 'brush teeth',
    step6CreativeRu: 'Пора почистить зубы',
    sourceSituations: ['Уже поздно', 'Пора готовить', 'Идет дождь, пора брать зонт', 'Пора позвонить маме'],
  },
]

const itsTimePostLesson = {
  interestingFact:
    'В живой речи английского It is часто сокращают до It’s, а сама конструкция It’s time to звучит мягче и естественнее, чем прямой приказ.',
  options: DEFAULT_POST_LESSON_OPTIONS,
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
      learningGoal: 'Вписать пропущенный глагол после конструкции It is time to.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step3Verb,
      sourcePattern: 'It is time to + verb',
      semanticAnchors: ['time to', variant.step3Verb],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['time to'],
        shouldInclude: ['глагол'],
        mustAvoid: ['who likes', 'present continuous'],
        hintShouldMention: ['глагол', 'начальной форме'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести короткое описание состояния на английский.',
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
        hintShouldMention: ['состояние', 'шаблон'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать три коротких предложения по It is и It is time to в puzzle-формате.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `It's time to ${variant.finalVerbBase}.`,
      sourcePattern: "word order puzzle for It's time to + verb",
      semanticAnchors: ['time to', variant.finalVerbBase],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['time to', variant.finalVerbBase],
        shouldInclude: ["it's", 'пазл'],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Финальная проверка: состояние, действие по шаблону time to и перенос на новое действие.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `It's time to ${variant.finalVerbBase}.`,
      sourcePattern: "It's time to + verb phrase",
      semanticAnchors: ['time to', variant.finalVerbBase],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['time to', variant.finalVerbBase],
        shouldInclude: ["it's"],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['it is time to'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Три contrast-gap: состояние, частица to и новый глагол после time to.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.adjective,
      sourcePattern: "It's + adj / It's time + to + verb",
      semanticAnchors: [variant.adjective, 'to', variant.step6CreativeActionEn.split(' ')[0] ?? 'read'],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['who likes', 'present continuous'],
        hintShouldMention: ['состояние', 'действие'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function buildItsTimePuzzleVariant(id: string, title: string, answer: string): SentencePuzzleVariant {
  const correctOrder = toSentencePuzzleCards(answer)
  return {
    id,
    title,
    instruction: '',
    words: [...correctOrder],
    correctOrder,
    correctAnswer: answer,
    successText: `Верно! ${answer}`,
    errorText: 'Начни с It\'s, потом прилагательное или time to + глагол.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Берём следующий вариант.',
  }
}

function buildItsTimeStep7Variants(variant: ItsTimeVariant) {
  const creativeVerb = variant.step6CreativeActionEn.split(' ')[0]!
  const stateDistractors: [string, string] =
    variant.step3Adjective === variant.adjective
      ? ['cold', 'hot']
      : [variant.step3Adjective, variant.adjective === 'dark' ? 'late' : 'dark']
  const hardVerbPool = Array.from(
    new Set(
      [variant.finalVerbBase, variant.step2VerbBase, variant.step3Verb].filter(
        (verb) => verb && verb !== creativeVerb
      )
    )
  )
  const hardFallbackVerbs = ['go', 'study', 'sleep', 'eat', 'rest', 'cook', 'wash', 'brush', 'take']
  while (hardVerbPool.length < 2) {
    const next = hardFallbackVerbs.find((verb) => verb !== creativeVerb && !hardVerbPool.includes(verb))
    if (!next) break
    hardVerbPool.push(next)
  }
  const hardDistractors: [string, string] = [hardVerbPool[0] ?? 'go', hardVerbPool[1] ?? 'study']

  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: variant.introStateRu,
      frameEn: "It's ___.",
      correctWord: variant.adjective,
      distractors: stateDistractors,
      hint: 'Состояние в задании - одно прилагательное после It\'s.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: variant.finalActionRu,
      frameEn: `It's time ___ ${variant.finalVerbBase}.`,
      correctWord: 'to',
      distractors: ['for', 'at'],
      hint: 'Между time и глаголом нужно to, не for и не at.',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: variant.step6CreativeRu,
      frameEn: "It's time to ___.",
      correctWord: creativeVerb,
      distractors: hardDistractors,
      hint: 'После to - глагол в начальной форме, одно слово.',
    },
  ])
}

function buildItsTimeStep6Variants(variant: ItsTimeVariant) {
  const stateSentence = toItsTimeStateSentence(variant.adjective)
  const actionSentence = `It's time to ${variant.finalVerbBase}.`
  const creativeSentence = `It's time to ${variant.step6CreativeActionEn}.`

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: formatTranslateQuestion(variant.stateTranslationRu),
      correctAnswer: stateSentence,
      acceptedAnswers: toItsTimeStateAcceptedAnswers(variant.adjective),
      hint: 'Коротко: It is + прилагательное про состояние.',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: formatTranslateQuestion(variant.finalActionRu),
      correctAnswer: actionSentence,
      acceptedAnswers: [actionSentence, actionSentence.replace("It's", 'It is')],
      hint: 'Используйте It is time to + глагол в начальной форме.',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: formatTranslateQuestion(variant.step6CreativeRu),
      correctAnswer: creativeSentence,
      acceptedAnswers: [creativeSentence, creativeSentence.replace("It's", 'It is')],
      hint: 'It is time to + глагол из новой ситуации в начальной форме.',
    },
  ])
}

function buildItsTimeSentencePuzzleVariants(variant: ItsTimeVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildItsTimePuzzleVariant(
      `${variant.id}_puzzle_state`,
      'Пазл 1/3: состояние',
      `It's ${variant.adjective}.`
    ),
    buildItsTimePuzzleVariant(
      `${variant.id}_puzzle_action`,
      'Пазл 2/3: пора действовать',
      `It's time to ${variant.finalVerbBase}.`
    ),
    buildItsTimePuzzleVariant(
      `${variant.id}_puzzle_new_action`,
      'Пазл 3/3: новая фраза',
      `It's time to ${variant.step5ActionEn}.`
    ),
  ]
}

function buildItsTimeFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content:
          'Готово! It is и It is time to - ваши. Дальше - практика и кубок 🏆.',
      },
    ],
    footerDynamic: 'Урок завершен',
    myEngComment: 'Урок пройден. Готовы дальше?',
    postLesson: {
      ...itsTimePostLesson,
      options: itsTimePostLesson.options.map((option) => ({ ...option })),
    },
  }
}

function buildItsTimeSteps(variant: ItsTimeVariant): LessonStep[] {
  const step3Variants = [
    {
      id: `${variant.id}_step3_easy`,
      question: `Переведите на английский: "${variant.sourceSituations[2]}." - "It's ${variant.step3Adjective}. It is time to ___ ${variant.step3Object}."`,
      correctAnswer: variant.step3Verb,
      hint: 'После "time to" нужен глагол в начальной форме.',
      difficulty: 'easy' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_medium`,
      question: `Переведите на английский: "Сейчас ${variant.step3StateRu.toLowerCase()}, поэтому пора что-то сделать." - "It's ${variant.step3Adjective}. It is time to ___ ${variant.step3Object}."`,
      correctAnswer: variant.step3Verb,
      hint: '«Пора» - time to. После to - глагол в начальной форме, одно слово.',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: `Переведите на английский: "${variant.step3HardRu}." - "It's ${variant.step3Adjective}. It is time to ___ ${variant.step3Object}."`,
      correctAnswer: variant.step3Verb,
      hint: 'Прочитай действие в задании. После to - глагол без -s и без -ing.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]
  const step4Adjectives = Array.from(new Set([variant.adjective, 'cold', 'hot', 'late', 'dark'])).slice(0, 3)
  const step4Variants = step4Adjectives.map((adjective, index) => {
    const difficulty: ExerciseDifficulty = index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
    return {
      id: `${variant.id}_step4_${index + 1}`,
      question: formatTranslateQuestion(toItsTimeStateTranslation(adjective)),
      correctAnswer: toItsTimeStateSentence(adjective),
      acceptedAnswers: toItsTimeStateAcceptedAnswers(adjective),
      hint: 'Напишите короткое предложение по шаблону It is + прилагательное.',
      difficulty,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    }
  })

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
          content: `Выберите правильное предложение для ситуации: "${variant.introStateRu}"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит по смыслу?',
        options: [`It's ${variant.adjective}.`, `It's time to ${variant.step2VerbBase}.`, `It's time to ${variant.step3Verb}.`],
        correctAnswer: `It's ${variant.adjective}.`,
        acceptedAnswers: [`It's ${variant.adjective}.`],
        answerFormat: 'choice',
        answerPolicy: 'strict',
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
          content: 'Теперь посмотрим на вторую конструкцию: It is time to + глагол.',
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
          content: 'Пример: "It is rainy. It is time to take a taxi."',
        },
        {
          type: 'task',
          content: `Впишите пропущенный глагол в английскую фразу: "${variant.sourceSituations[2]}." - "It's ${variant.step3Adjective}. It is time to ___ ${variant.step3Object}."`,
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
      footerDynamic: 'Практика: впишите глагол',
      myEngComment: 'Пора почувствовать разницу вживую.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь потренируем описание состояния в нескольких новых вариантах.',
        },
        {
          type: 'info',
          content: 'Пример: "It is rainy."',
        },
        {
          type: 'task',
          content: 'Напишите английское предложение для короткого описания состояния.',
        },
      ],
      exercise: {
        type: 'translate',
        question: step4Variants[0]?.question ?? formatTranslateQuestion(variant.stateTranslationRu),
        correctAnswer: step4Variants[0]?.correctAnswer ?? `It's ${variant.adjective}.`,
        acceptedAnswers: step4Variants[0]?.acceptedAnswers ?? toItsTimeStateAcceptedAnswers(variant.adjective),
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: step4Variants[0]?.hint ?? 'Напишите короткое предложение по шаблону It is + прилагательное.',
        variants: step4Variants.map((stepVariant) => ({
          ...stepVariant,
          acceptedAnswers: stepVariant.acceptedAnswers,
        })),
      },
      footerDynamic: 'Практика: напишите предложение',
      myEngComment: 'Хорошо идете, держим темп.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Финальная сборка: теперь соберите предложения из слов.',
        },
        {
          type: 'info',
          content: 'Будет три коротких пазла: состояние, действие и новая фраза.',
        },
        {
          type: 'task',
          content: 'Расставьте слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три предложения из слов.',
        correctAnswer: `It's time to ${variant.step5ActionEn}.`,
        acceptedAnswers: [`It's time to ${variant.step5ActionEn}.`],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка про первое слово: начните с It’s и следите за порядком time to + глагол.',
        bonusXp: 30,
        puzzleVariants: buildItsTimeSentencePuzzleVariants(variant),
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
          content: 'Финальная проверка: три коротких предложения подряд.',
        },
        {
          type: 'info',
          content: 'Состояние, действие по шаблону, затем новое действие - без подсказки из урока.',
        },
        {
          type: 'task',
          content: formatTranslateQuestion(variant.stateTranslationRu),
        },
      ],
      exercise: (() => {
        const step6Variants = buildItsTimeStep6Variants(variant)
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
      myEngComment: 'Три фразы подряд - вы почти у финиша.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Быстрый финиш: три слова в новых ситуациях.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово - прилагательное, нужная частица или глагол.',
        },
        {
          type: 'task',
          content: 'Выберите одно слово для пропуска в английской рамке.',
        },
      ],
      exercise: (() => {
        const step7Variants = buildItsTimeStep7Variants(variant)
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
      myEngComment: 'Финиш рядом, осталось три коротких слова.',
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

const baseVariant = itsTimeVariants[0]

export const itsTimeToLesson: LessonData = {
  id: '1',
  topic: "Это / Пора",
  level: 'A2',
  intro: {
    topic: "It's / It's time to",
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: [
        "It's помогает описать состояние: темно, холодно, поздно.",
        "It's time to помогает сказать, что пора что-то делать.",
        'Главный выбор: описываем ситуацию или зовем к действию.',
      ],
      how: [
        "It's + adjective: It's cold.",
        "It's time to + verb: It's time to go.",
        'После time to нужен обычный глагол без -ing и без -s.',
      ],
      examples: [
        { en: "It's dark.", ru: 'Темно.', note: 'описали состояние' },
        { en: "It's time to sleep.", ru: 'Пора спать.', note: 'переходим к действию' },
        { en: "It's late. It's time to go.", ru: 'Поздно. Пора идти.', note: 'состояние объясняет действие' },
      ],
      takeaway: "Думай так: It's описывает, а It's time to подталкивает к действию.",
    },
    details: {
      points: [
        "В It's cold слово cold не действие, а описание ситуации.",
        "В It's time to go слово go уже действие, поэтому перед ним стоит time to.",
        "Не добавляй лишнюю форму: It's time to goes и It's time to going звучат неверно.",
      ],
      examples: [
        { en: "It's hot.", ru: 'Жарко.', note: 'только состояние' },
        { en: "It's time to open the window.", ru: 'Пора открыть окно.', note: 'уже действие' },
      ],
    },
    deepDive: {
      commonMistakes: [
        "It's time to going вместо It's time to go.",
        "It's time to sleeps вместо It's time to sleep.",
        'Пытаться переводить каждое русское "пора" через одно слово без шаблона time to.',
      ],
      contrastNotes: ["It's late = уже поздно.", "It's time to leave = пора уходить."],
      selfCheckRule: 'Если после фразы можно спросить "что делать?", используй It’s time to + verb.',
    },
    learningPlan: {
      grammarFocus: ['It is + adjective', 'It is time to + verb'],
      firstPracticeGoal: 'Отличить описание состояния от действия.',
    },
  },
  variantId: baseVariant.id,
  finale: buildItsTimeFinale(),
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
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildItsTimeSteps(baseVariant),
}
