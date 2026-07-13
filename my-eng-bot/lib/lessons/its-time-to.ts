import { formatTranslateQuestion } from '@/lib/lessonTranslatePrompt'
import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { ITS_TIME_TO_CHALLENGE_ATOMS } from '@/lib/lessons/itsTimeToChallengeAtoms'
import {
  ITS_TIME_TO_REFERENCE_SCENARIOS,
  ITS_TIME_TO_SESSION_SCENARIOS,
  ITS_TIME_TO_SESSION_STEP_MAPS,
} from '@/lib/lessons/itsTimeToSessionScenarios'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type { LessonData, LessonFinale, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

type ItsTimeVariant = {
  id: string
  label: string
  hookSituationRu: string
  hookCorrect: string
  hookDistractors: [string, string]
  /** Step2 theory: It's time ___ {noun}. → for */
  step2Noun: string
  step2SituationRu: string
  /** Primary morph verb for step7 hard only */
  verbBase: string
  verbThird: string
  verbIng: string
  /** Step3 fill frames */
  step3Adj: string
  step3Verb: string
  step3Noun: string
  /** Step4 translate */
  step4Adj: string
  step4AdjRu: string
  step4VerbPhrase: string
  step4VerbRu: string
  step4Noun: string
  step4NounRu: string
  /** Step5 puzzles */
  step5StateSentence: string
  step5TimeToSentence: string
  step5TimeForSentence: string
  /** Step6 exam */
  step6Adj: string
  step6AdjRu: string
  step6VerbPhrase: string
  step6VerbRu: string
  sourceSituations: string[]
}

const STEP6_CLOCK_SENTENCE = "It's five o'clock and it's time to go home."
const STEP6_CLOCK_RU = 'Сейчас пять часов, и пора идти домой'

function withItIsAccepted(sentence: string): string[] {
  const answers = new Set<string>([sentence])
  answers.add(sentence.replace(/It's/g, 'It is').replace(/it's/g, 'it is'))
  return Array.from(answers)
}

function withClockAccepted(): string[] {
  const five = STEP6_CLOCK_SENTENCE
  const numeric = "It's 5 o'clock and it's time to go home."
  return Array.from(
    new Set([
      ...withItIsAccepted(five),
      ...withItIsAccepted(numeric),
    ])
  )
}

const FORMAL_IT_EXTRA_SOURCE_SITUATIONS = [
  'Сегодня тепло',
  'Сейчас прохладно',
  'На улице солнечно',
  'Сильный ветер',
  'Ещё рано',
  'Сейчас пять часов',
  'Пора пить чай',
  'Пора обедать',
  'Пора ужинать',
  'Далеко отсюда',
  'Отсюда недалеко',
] as const

const itsTimeVariants: ItsTimeVariant[] = [
  {
    id: 'evening-dark',
    label: 'Темно и пора спать',
    hookSituationRu: 'Смотрите на улицу — уже темно, пора спать',
    hookCorrect: "It's dark. It's time to sleep.",
    hookDistractors: ["It's early. It's time to wait.", "It's hot. It's time to stay."],
    step2Noun: 'bed',
    step2SituationRu: 'Пора спать — время для кровати',
    verbBase: 'sleep',
    verbThird: 'sleeps',
    verbIng: 'sleeping',
    step3Adj: 'cold',
    step3Verb: 'sleep',
    step3Noun: 'lunch',
    step4Adj: 'cold',
    step4AdjRu: 'Холодно',
    step4VerbPhrase: 'go',
    step4VerbRu: 'Пора идти',
    step4Noun: 'lunch',
    step4NounRu: 'Пора обедать',
    step5StateSentence: "It's cold today.",
    step5TimeToSentence: "It's time to go.",
    step5TimeForSentence: "It's time for dinner.",
    step6Adj: 'hot',
    step6AdjRu: 'Жарко',
    step6VerbPhrase: 'sleep',
    step6VerbRu: 'Пора спать',
    sourceSituations: ['На улице темно', 'Пора спать', 'Холодно', 'Пора обедать', 'Пора идти'],
  },
  {
    id: 'cold-study',
    label: 'Холодно и пора заниматься',
    hookSituationRu: 'Сегодня холодно, пора заниматься',
    hookCorrect: "It's cold. It's time to study.",
    hookDistractors: ["It's early. It's time to wait.", "It's hot. It's time to stay."],
    step2Noun: 'lunch',
    step2SituationRu: 'Пора обедать',
    verbBase: 'study',
    verbThird: 'studies',
    verbIng: 'studying',
    step3Adj: 'cold',
    step3Verb: 'study',
    step3Noun: 'lunch',
    step4Adj: 'cold',
    step4AdjRu: 'Холодно',
    step4VerbPhrase: 'study',
    step4VerbRu: 'Пора заниматься',
    step4Noun: 'lunch',
    step4NounRu: 'Пора обедать',
    step5StateSentence: "It's cold today.",
    step5TimeToSentence: "It's time to study.",
    step5TimeForSentence: "It's time for dinner.",
    step6Adj: 'hot',
    step6AdjRu: 'Жарко',
    step6VerbPhrase: 'rest',
    step6VerbRu: 'Пора отдыхать',
    sourceSituations: ['Сегодня холодно', 'Пора заниматься', 'Пора обедать', 'Жарко', 'Пора отдыхать'],
  },
  {
    id: 'hot-rest',
    label: 'Жарко и пора отдохнуть',
    hookSituationRu: 'В комнате жарко, пора отдохнуть',
    hookCorrect: "It's hot. It's time to rest.",
    hookDistractors: ["It's early. It's time to wait.", "It's cold. It's time to stay."],
    step2Noun: 'a break',
    step2SituationRu: 'Пора сделать перерыв',
    verbBase: 'rest',
    verbThird: 'rests',
    verbIng: 'resting',
    step3Adj: 'hot',
    step3Verb: 'rest',
    step3Noun: 'dinner',
    step4Adj: 'hot',
    step4AdjRu: 'Жарко',
    step4VerbPhrase: 'rest',
    step4VerbRu: 'Пора отдыхать',
    step4Noun: 'a break',
    step4NounRu: 'Пора на перерыв',
    step5StateSentence: "It's hot today.",
    step5TimeToSentence: "It's time to rest.",
    step5TimeForSentence: "It's time for dinner.",
    step6Adj: 'cold',
    step6AdjRu: 'Холодно',
    step6VerbPhrase: 'sleep',
    step6VerbRu: 'Пора спать',
    sourceSituations: ['В комнате жарко', 'Пора отдыхать', 'Пора на перерыв', 'Холодно', 'Пора спать'],
  },
  {
    id: 'late-cook',
    label: 'Поздно и пора готовить',
    hookSituationRu: 'Смотрите на часы — поздно, пора идти',
    hookCorrect: "It's late. It's time to go.",
    hookDistractors: ["It's early. It's time to wait.", "It's cold. It's time to stay."],
    step2Noun: 'dinner',
    step2SituationRu: 'Пора ужинать',
    verbBase: 'cook',
    verbThird: 'cooks',
    verbIng: 'cooking',
    step3Adj: 'late',
    step3Verb: 'cook',
    step3Noun: 'dinner',
    step4Adj: 'late',
    step4AdjRu: 'Уже поздно',
    step4VerbPhrase: 'cook',
    step4VerbRu: 'Пора готовить',
    step4Noun: 'dinner',
    step4NounRu: 'Пора ужинать',
    step5StateSentence: "It's late today.",
    step5TimeToSentence: "It's time to cook.",
    step5TimeForSentence: "It's time for lunch.",
    step6Adj: 'hot',
    step6AdjRu: 'Жарко',
    step6VerbPhrase: 'sleep',
    step6VerbRu: 'Пора спать',
    sourceSituations: ['Уже поздно', 'Пора идти', 'Пора готовить', 'Пора ужинать', 'Жарко'],
  },
]

const itsTimePostLesson = {
  interestingFact:
    'В живой речи английского It is часто сокращают до It’s. It’s time to зовёт к действию (глагол), а It’s time for — к вещи или событию (существительное).',
  options: DEFAULT_POST_LESSON_OPTIONS,
} as const

function buildItsTimeBlueprints(variant: ItsTimeVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Узнать ситуацию «состояние + пора действовать» и выбрать подходящую полную фразу.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.hookCorrect,
      sourcePattern: "It's + adjective. It's time to + verb",
      semanticAnchors: ["it's", 'time to'],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        choiceMode: 'sentence_choice',
        mustInclude: ["it's", 'time to'],
        shouldInclude: ['состояние', 'действие'],
        mustAvoid: ['time for', 'who likes', 'past simple'],
        hintShouldMention: ['ситуация', 'состояние'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Различить time to + глагол и time for + существительное (не морфология глагола).',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: 'for',
      sourcePattern: "It's time for + noun",
      semanticAnchors: ['time for', variant.step2Noun],
      semanticExpectations: {
        pedagogicalRole: 'explain_rule',
        choiceMode: 'contrast_gap',
        mustInclude: ['for', 'time'],
        shouldInclude: ['существительн', 'глагол'],
        mustAvoid: ['who likes', 'past simple', 'sleeps', 'sleeping'],
        hintShouldMention: ['for', 'существительн'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: "Вписать It's / to / for по трём разным рамкам одной спирали.",
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: "It's",
      sourcePattern: "It's / time to + V / time for + N",
      semanticAnchors: ["it's", 'to', 'for'],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ["it's"],
        shouldInclude: ['to', 'for'],
        mustAvoid: ['who likes', 'переведите'],
        hintShouldMention: ['одним словом'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести три коротких шаблона: состояние, time to + V, time for + noun.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `It's ${variant.step4Adj}.`,
      sourcePattern: "It's + adj / time to + V / time for + N",
      semanticAnchors: ["it's", variant.step4Adj, 'time'],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.step4Adj],
        shouldInclude: ["it's", 'time'],
        mustAvoid: ['who likes', 'time for go', 'time to dinner'],
        hintShouldMention: ['шаблон'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать три предложения: состояние, time to + V, time for + noun.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step5TimeForSentence,
      sourcePattern: "word order for It's / time to / time for",
      semanticAnchors: ['time to', 'time for'],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['time'],
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
      learningGoal: 'Финальная проверка: состояние, time to + V и один clock-compound.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: STEP6_CLOCK_SENTENCE,
      sourcePattern: "It's + adj / time to + V / clock compound",
      semanticAnchors: ["it's", 'time to', "o'clock"],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['time to'],
        shouldInclude: ["it's", "o'clock"],
        mustAvoid: ['who likes', 'past simple'],
        hintShouldMention: ['it is'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 4,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Три contrast-gap: It\'s vs It/Its, to vs for, морфология глагола только на hard.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: "It's",
      sourcePattern: "It's vs Its / to vs for / base verb after to",
      semanticAnchors: ["it's", 'to', variant.verbBase],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        choiceMode: 'contrast_gap',
        mustAvoid: ['who likes', 'present continuous'],
        hintShouldMention: ['контраст'],
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
    errorText: 'Начни с It\'s, потом прилагательное или time to / time for.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Берём следующий вариант.',
  }
}

function buildItsTimeStep7Variants(variant: ItsTimeVariant) {
  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: `Коротко опишите состояние: ${variant.step4AdjRu.toLowerCase()}`,
      frameEn: `___ ${variant.step4Adj}.`,
      correctWord: "It's",
      distractors: ['It', 'Its'],
      hint: 'Нужна сжатая форма в начале рамки про состояние.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: variant.step2SituationRu,
      frameEn: `It's time ___ ${variant.step2Noun}.`,
      correctWord: 'for',
      distractors: ['to', 'at'],
      hint: 'Смотрите, что стоит после пропуска — глагол или существительное?',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: `Пора действовать: ${variant.step6VerbRu.toLowerCase()}`,
      frameEn: "It's time to ___.",
      correctWord: variant.verbBase,
      distractors: [variant.verbThird, variant.verbIng],
      hint: 'После частицы перед действием нужна начальная форма глагола.',
    },
  ])
}

function buildItsTimeStep6Variants(variant: ItsTimeVariant) {
  const stateSentence = `It's ${variant.step6Adj}.`
  const actionSentence = `It's time to ${variant.step6VerbPhrase}.`

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: formatTranslateQuestion(variant.step6AdjRu),
      correctAnswer: stateSentence,
      acceptedAnswers: withItIsAccepted(stateSentence),
      hint: 'Коротко: It is + прилагательное про состояние.',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: formatTranslateQuestion(variant.step6VerbRu),
      correctAnswer: actionSentence,
      acceptedAnswers: withItIsAccepted(actionSentence),
      hint: 'It is time to + глагол в начальной форме.',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: formatTranslateQuestion(STEP6_CLOCK_RU),
      correctAnswer: STEP6_CLOCK_SENTENCE,
      acceptedAnswers: withClockAccepted(),
      hint: 'Свяжите время на часах и действие через and.',
    },
  ])
}

function buildItsTimeSentencePuzzleVariants(variant: ItsTimeVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildItsTimePuzzleVariant(`${variant.id}_puzzle_state`, 'Пазл 1/3: состояние', variant.step5StateSentence),
    buildItsTimePuzzleVariant(`${variant.id}_puzzle_time_to`, 'Пазл 2/3: time to', variant.step5TimeToSentence),
    buildItsTimePuzzleVariant(`${variant.id}_puzzle_time_for`, 'Пазл 3/3: time for', variant.step5TimeForSentence),
  ]
}

function buildItsTimeFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content:
          "Готово! It's, time to + глагол и time for + существительное — ваши. Дальше — практика и кубок 🏆.",
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
      question: `Дополните одним словом: "___ ${variant.step3Adj} today."`,
      correctAnswer: "It's",
      hint: 'Впишите одним словом сжатую форму в начале рамки про состояние.',
      difficulty: 'easy' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_medium`,
      question: `Дополните одним словом: "It's time ___ ${variant.step3Verb}."`,
      correctAnswer: 'to',
      hint: 'Впишите одним словом частицу перед глаголом действия.',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: `Дополните одним словом: "It's time ___ ${variant.step3Noun}."`,
      correctAnswer: 'for',
      hint: 'Впишите одним словом частицу перед существительным.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]

  const step4State = `It's ${variant.step4Adj}.`
  const step4TimeTo = `It's time to ${variant.step4VerbPhrase}.`
  const step4TimeFor = `It's time for ${variant.step4Noun}.`
  const step4Variants = [
    {
      id: `${variant.id}_step4_easy`,
      question: formatTranslateQuestion(variant.step4AdjRu),
      correctAnswer: step4State,
      acceptedAnswers: withItIsAccepted(step4State),
      hint: 'Шаблон: It is + прилагательное.',
      difficulty: 'easy' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_medium`,
      question: formatTranslateQuestion(variant.step4VerbRu),
      correctAnswer: step4TimeTo,
      acceptedAnswers: withItIsAccepted(step4TimeTo),
      hint: 'Шаблон: It is time to + глагол.',
      difficulty: 'medium' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_hard`,
      question: formatTranslateQuestion(variant.step4NounRu),
      correctAnswer: step4TimeFor,
      acceptedAnswers: withItIsAccepted(step4TimeFor),
      hint: 'Шаблон: It is time for + существительное.',
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
          content: "Сегодня разберём состояние и «пора»: It's и time to.",
        },
        {
          type: 'info',
          content: 'Сначала выберите фразу, которая подходит к ситуации целиком — и состояние, и действие.',
        },
        {
          type: 'task',
          content: `Выберите правильное предложение для ситуации: "${variant.hookSituationRu}"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит по смыслу?',
        options: [variant.hookCorrect, variant.hookDistractors[0], variant.hookDistractors[1]],
        correctAnswer: variant.hookCorrect,
        acceptedAnswers: [variant.hookCorrect],
        answerFormat: 'choice',
        answerPolicy: 'strict',
      },
      footerDynamic: 'Правило 1: состояние + пора действовать',
      myEngComment: 'Вижу, вы готовы к новой конструкции.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Важный контраст: после time бывает to или for.',
        },
        {
          type: 'info',
          content: 'to — перед глаголом (действие). for — перед существительным (вещь или событие).',
        },
        {
          type: 'task',
          content: `Выберите слово для пропуска: "${variant.step2SituationRu}" — «It's time ___ ${variant.step2Noun}.»`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: `Дополните: "It's time ___ ${variant.step2Noun}."`,
        options: ['for', 'to', 'at'],
        correctAnswer: 'for',
        acceptedAnswers: ['for'],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Смотрите на слово после пропуска: это существительное или глагол?',
      },
      footerDynamic: 'Правило 2: time to + V · time for + N',
      myEngComment: 'Отлично, держим контраст to / for.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Закрепим три коротких пропуска — по одному слову.',
        },
        {
          type: 'info',
          content: 'В каждом кадре своя дыра: начало предложения, частица перед глаголом или перед существительным.',
        },
        {
          type: 'task',
          content: 'Дополните одним словом.',
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
      footerDynamic: "Практика: It's / to / for",
      myEngComment: 'Одно слово — одна дыра.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь соберём три шаблона целиком — переводом.',
        },
        {
          type: 'info',
          content: 'Три оси: состояние, пора + глагол, пора + существительное.',
        },
        {
          type: 'task',
          content: 'Напишите английское предложение по русской фразе.',
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
        variants: step4Variants.map((stepVariant) => ({
          ...stepVariant,
          acceptedAnswers: stepVariant.acceptedAnswers,
        })),
      },
      footerDynamic: 'Практика: три шаблона',
      myEngComment: 'Хорошо идёте, держим темп.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Сборка из слов: состояние, time to и time for.',
        },
        {
          type: 'info',
          content: 'Три коротких пазла — следите за порядком to и for.',
        },
        {
          type: 'task',
          content: 'Расставьте слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три предложения из слов.',
        correctAnswer: variant.step5TimeForSentence,
        acceptedAnswers: [variant.step5TimeForSentence],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка про первое слово: начните с It’s и следите за to / for.',
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
          content: 'Финальная проверка: три предложения подряд.',
        },
        {
          type: 'info',
          content: 'Состояние, действие по шаблону, затем фраза с часами — без подсказки из урока.',
        },
        {
          type: 'task',
          content: formatTranslateQuestion(variant.step6AdjRu),
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
      footerDynamic: 'Финальная проверка: 3 предложения',
      myEngComment: 'Три фразы подряд — вы почти у финиша.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Быстрый финиш: три контрастных пропуска.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово — ловите типичную ошибку темы.',
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
          hint: 'Контраст: сжатая форма в начале или нужная частица перед следующим словом.',
          variants: step7Variants,
        }
      })(),
      footerDynamic: 'Финиш: 3 контраста',
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

const baseVariant = itsTimeVariants[0]!

export const itsTimeToLesson: LessonData = {
  id: '1',
  topic: "Это / Пора",
  level: 'A2',
  intro: {
    topic: "It's / It's time to / It's time for",
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: [
        "It's помогает описать состояние: темно, холодно, поздно.",
        "It's time to помогает сказать, что пора сделать действие.",
        "It's time for помогает сказать, что пора nominalного события: обед, ужин, перерыв.",
      ],
      how: [
        "It's + adjective: It's cold.",
        "It's time to + verb: It's time to go.",
        "It's time for + noun: It's time for lunch.",
      ],
      examples: [
        { en: "It's dark.", ru: 'Темно.', note: 'описали состояние' },
        { en: "It's time to sleep.", ru: 'Пора спать.', note: 'time to + глагол' },
        { en: "It's time for dinner.", ru: 'Пора ужинать.', note: 'time for + существительное' },
      ],
      takeaway: "Думай так: It's описывает, time to зовёт к глаголу, time for — к существительному.",
    },
    details: {
      points: [
        "В It's cold слово cold не действие, а описание ситуации.",
        "В It's time to go слово go — глагол, поэтому перед ним to.",
        "В It's time for lunch слово lunch — существительное, поэтому for.",
      ],
      examples: [
        { en: "It's hot.", ru: 'Жарко.', note: 'только состояние' },
        { en: "It's late. It's time to go.", ru: 'Поздно. Пора идти.', note: 'состояние + действие' },
        { en: "It's time for a break.", ru: 'Пора на перерыв.', note: 'time for + noun' },
      ],
    },
    deepDive: {
      commonMistakes: [
        "Its cold вместо It's cold.",
        "It's time for go вместо It's time to go.",
        "It's time to dinner вместо It's time for dinner.",
        "It's time to going / It's time to sleeps — неверная форма глагола после to.",
      ],
      contrastNotes: [
        "It's late = уже поздно.",
        "It's time to leave = пора уходить (глагол).",
        "It's time for lunch = пора обеда (существительное).",
      ],
      selfCheckRule:
        'Если после «пора» можно спросить «что делать?» — time to + verb. Если «чего / какого события?» — time for + noun.',
    },
    learningPlan: {
      grammarFocus: ['It is + adjective', 'It is time to + verb', 'It is time for + noun'],
      firstPracticeGoal: 'Отличить состояние, действие (to + V) и событие (for + noun).',
    },
  },
  variantId: baseVariant.id,
  finale: buildItsTimeFinale(),
  repeatConfig: {
    ruleSummary:
      'Различаем It is + прилагательное, It is time to + глагол и It is time for + существительное.',
    grammarFocus: ['It is + adjective', 'It is time to + verb', 'It is time for + noun'],
    sourceSituations: Array.from(
      new Set([
        ...itsTimeVariants.flatMap((variant) => variant.sourceSituations),
        ...FORMAL_IT_EXTRA_SOURCE_SITUATIONS,
      ])
    ),
    stepBlueprints: buildItsTimeBlueprints(baseVariant),
    variantProfiles: itsTimeVariants.map((variant) => buildItsTimeVariantProfile(variant)),
    sessionScenarios: { ...ITS_TIME_TO_SESSION_SCENARIOS },
    sessionStepMaps: {
      relaxed: [...ITS_TIME_TO_SESSION_STEP_MAPS.relaxed],
      balanced: [...ITS_TIME_TO_SESSION_STEP_MAPS.balanced],
    },
    referenceScenariosByType: { ...ITS_TIME_TO_REFERENCE_SCENARIOS },
    challengeAtoms: [...ITS_TIME_TO_CHALLENGE_ATOMS],
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
