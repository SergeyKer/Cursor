import { formatTranslateQuestion } from '@/lib/lessonTranslatePrompt'
import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { INTRODUCING_YOURSELF_CHALLENGE_ATOMS } from '@/lib/lessons/introducingYourselfChallengeAtoms'
import {
  INTRODUCING_YOURSELF_REFERENCE_SCENARIOS,
  INTRODUCING_YOURSELF_SESSION_SCENARIOS,
  INTRODUCING_YOURSELF_SESSION_STEP_MAPS,
} from '@/lib/lessons/introducingYourselfSessionScenarios'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type {
  ExerciseDifficulty,
  LessonData,
  LessonFinale,
  LessonRepeatStepBlueprint,
  LessonRepeatVariantProfile,
  LessonStep,
  SentencePuzzleVariant,
} from '@/types/lesson'

type SelfIntroVariant = {
  id: string
  label: string
  name: string
  nameRu: string
  city: string
  cityRu: string
  country: string
  countryRu: string
  roleArticle: 'a' | 'an'
  roleNoun: string
  rolePhrase: string
  roleRu: string
  feelingAdj: string
  moodRu: string
  wrongArticle1: string
  wrongArticle2: string
  sourceSituations: string[]
}

function toIAmName(name: string): string {
  return `I am ${name}.`
}

function toIAmFromPlace(place: string): string {
  return `I am from ${place}.`
}

function toImFromPlace(place: string): string {
  return `I'm from ${place}.`
}

function toIAmRole(rolePhrase: string): string {
  return `I am ${rolePhrase}.`
}

function toIAmMood(adj: string): string {
  return `I am ${adj}.`
}

function toImMood(adj: string): string {
  return `I'm ${adj}.`
}

function toFromAccepted(place: string): string[] {
  return [toIAmFromPlace(place), toImFromPlace(place)]
}

function toMoodAccepted(adj: string): string[] {
  return [toIAmMood(adj), toImMood(adj)]
}

function toNameAccepted(name: string): string[] {
  return [toIAmName(name), `I'm ${name}.`]
}

function toCityMoodSentence(city: string, adj: string): string {
  return `I am from ${city} and I am ${adj}.`
}

function toCityMoodAccepted(city: string, adj: string): string[] {
  return [
    toCityMoodSentence(city, adj),
    `I'm from ${city} and I'm ${adj}.`,
    `I am from ${city} and I'm ${adj}.`,
    `I'm from ${city} and I am ${adj}.`,
  ]
}

const selfIntroVariants: SelfIntroVariant[] = [
  {
    id: 'vasya-russia-student',
    label: 'Россия, студент, настроение',
    name: 'Vasya',
    nameRu: 'Вася',
    city: 'Moscow',
    cityRu: 'Москвы',
    country: 'Russia',
    countryRu: 'России',
    roleArticle: 'a',
    roleNoun: 'student',
    rolePhrase: 'a student',
    roleRu: 'студент',
    feelingAdj: 'happy',
    moodRu: 'Я счастлив.',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    sourceSituations: [
      'Я Вася.',
      'Я из России.',
      'Я студент.',
      'Я счастлив.',
    ],
  },
  {
    id: 'maria-spain-engineer',
    label: 'Испания, инженер, усталость',
    name: 'Maria',
    nameRu: 'Мария',
    city: 'Madrid',
    cityRu: 'Мадрида',
    country: 'Spain',
    countryRu: 'Испании',
    roleArticle: 'an',
    roleNoun: 'engineer',
    rolePhrase: 'an engineer',
    roleRu: 'инженер',
    feelingAdj: 'tired',
    moodRu: 'Я устал.',
    wrongArticle1: 'a',
    wrongArticle2: 'the',
    sourceSituations: [
      'Я Мария.',
      'Я из Испании.',
      'Я инженер.',
      'Я устал.',
    ],
  },
  {
    id: 'alex-uk-teacher',
    label: 'Британия, учитель, всё ок',
    name: 'Alex',
    nameRu: 'Алекс',
    city: 'London',
    cityRu: 'Лондона',
    country: 'Britain',
    countryRu: 'Британии',
    roleArticle: 'a',
    roleNoun: 'teacher',
    rolePhrase: 'a teacher',
    roleRu: 'учитель',
    feelingAdj: 'fine',
    moodRu: 'У меня всё нормально.',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    sourceSituations: [
      'Я Алекс.',
      'Я из Британии.',
      'Я учитель.',
      'У меня всё нормально.',
    ],
  },
  {
    id: 'sam-france-doctor',
    label: 'Франция, врач, радость',
    name: 'Sam',
    nameRu: 'Сэм',
    city: 'Paris',
    cityRu: 'Парижа',
    country: 'France',
    countryRu: 'Франции',
    roleArticle: 'a',
    roleNoun: 'doctor',
    rolePhrase: 'a doctor',
    roleRu: 'врач',
    feelingAdj: 'happy',
    moodRu: 'Я рад.',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    sourceSituations: [
      'Я Сэм.',
      'Я из Франции.',
      'Я врач.',
      'Я рад.',
    ],
  },
]

const selfIntroPostLesson = {
  interestingFact:
    'В разговоре чаще говорят I’m happy, а I am from … звучит понятно, когда важно сказать, откуда вы.',
  options: DEFAULT_POST_LESSON_OPTIONS,
} as const

function buildSelfIntroBlueprints(variant: SelfIntroVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Выбрать полное представление с am, а не чужое лицо или другую ситуацию.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: toIAmName(variant.name),
      sourcePattern: 'I am + name',
      semanticAnchors: ['i am', variant.name.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: ['am', variant.name.toLowerCase()],
        shouldInclude: ['i'],
        mustAvoid: ['time to', 'who likes'],
        hintShouldMention: ['am', 'я'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'sentence_choice',
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Выбрать артикль a/an перед ролью.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.roleArticle,
      sourcePattern: 'I am + article + profession',
      semanticAnchors: ['i am', variant.roleArticle, variant.roleNoun],
      semanticExpectations: {
        pedagogicalRole: 'explain_rule',
        mustInclude: [variant.roleArticle],
        shouldInclude: [variant.roleNoun],
        mustAvoid: ['time to', 'am vs is'],
        hintShouldMention: ['артикль'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'contrast_gap',
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Вписать am в рамках from / role / mood.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: 'am',
      sourcePattern: 'I am from / I am a / I am + adj',
      semanticAnchors: ['am'],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['am'],
        shouldInclude: ['i'],
        mustAvoid: ['time to', 'who likes'],
        hintShouldMention: ['am', 'одно слово'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести from / role / mood на английский.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: toIAmFromPlace(variant.country),
      sourcePattern: 'I am from / I am a / I am + adj',
      semanticAnchors: ['i am', 'from', variant.country.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['am'],
        shouldInclude: ['i'],
        mustAvoid: ['time to'],
        hintShouldMention: ['i am'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать from / role / mood в puzzle-формате.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: toIAmFromPlace(variant.country),
      sourcePattern: 'word order puzzle for I am from / role / mood',
      semanticAnchors: ['am', 'from', variant.country.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['am'],
        shouldInclude: ['i', 'пазл'],
        mustAvoid: ['time to'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Синтез: имя, from+city, city+mood (макс. 2 части).',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: toIAmName(variant.name),
      sourcePattern: 'I am + name / from + city / city + mood',
      semanticAnchors: ['i am', variant.name.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['am'],
        shouldInclude: ['i'],
        mustAvoid: ['time to'],
        hintShouldMention: ['i am'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Contrast: дыра am, am vs is/are, один chip a/an.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: 'am',
      sourcePattern: 'am-gap / am vs is|are / a|an',
      semanticAnchors: ['am', variant.roleArticle],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['time to'],
        hintShouldMention: ['am'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'contrast_gap',
      },
    },
  ]
}

function buildSelfIntroPuzzleVariant(id: string, title: string, answer: string): SentencePuzzleVariant {
  const correctOrder = toSentencePuzzleCards(answer)
  return {
    id,
    title,
    instruction: '',
    words: [...correctOrder],
    correctOrder,
    correctAnswer: answer,
    successText: `Верно! ${answer}`,
    errorText: 'Начни с I am, потом from, роль или настроение.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Берём следующий вариант.',
  }
}

function buildSelfIntroStep7Variants(variant: SelfIntroVariant) {
  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: `На форуме нужно сказать, что вы из ${variant.countryRu}`,
      frameEn: `I ___ from ${variant.country}.`,
      correctWord: 'am',
      distractors: ['I', 'from'],
      hint: 'После I в такой рамке нужно am.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: `Соседка представляется: она ${variant.feelingAdj}`,
      frameEn: `She ___ ${variant.feelingAdj}.`,
      correctWord: 'is',
      distractors: ['am', 'are'],
      hint: 'С she нужна форма is; am только после I.',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: `В коротком представлении вы - ${variant.roleRu}`,
      frameEn: `I am ___ ${variant.roleNoun}.`,
      correctWord: variant.roleArticle,
      distractors: [variant.wrongArticle1, variant.wrongArticle2],
      hint: 'Перед профессией нужен артикль a или an.',
    },
  ])
}

function buildSelfIntroStep6Variants(variant: SelfIntroVariant) {
  const nameSentence = toIAmName(variant.name)
  const fromCitySentence = toIAmFromPlace(variant.city)
  const cityMoodSentence = toCityMoodSentence(variant.city, variant.feelingAdj)

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: formatTranslateQuestion(`Меня зовут ${variant.nameRu}.`),
      correctAnswer: nameSentence,
      acceptedAnswers: toNameAccepted(variant.name),
      hint: 'Коротко: I am + имя.',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: formatTranslateQuestion(`Я из ${variant.cityRu}.`),
      correctAnswer: fromCitySentence,
      acceptedAnswers: toFromAccepted(variant.city),
      hint: 'I am from + город одним словом.',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: formatTranslateQuestion(`Я из ${variant.cityRu}, и ${variant.moodRu.replace(/\.$/, '').toLowerCase()}.`),
      correctAnswer: cityMoodSentence,
      acceptedAnswers: toCityMoodAccepted(variant.city, variant.feelingAdj),
      hint: 'Две связанные части: from + город и настроение через and.',
    },
  ])
}

function buildSelfIntroSentencePuzzleVariants(
  variant: SelfIntroVariant
): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_from`,
      'Пазл 1/3: откуда ты',
      toIAmFromPlace(variant.country)
    ),
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_role`,
      'Пазл 2/3: роль',
      toIAmRole(variant.rolePhrase)
    ),
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_mood`,
      'Пазл 3/3: настроение',
      toIAmMood(variant.feelingAdj)
    ),
  ]
}

function buildSelfIntroFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content:
          'Готово! Короткие фразы о себе - ваши. Дальше - практика и кубок 🏆.',
      },
    ],
    footerDynamic: 'Урок завершен',
    myEngComment: 'Урок пройден. Готовы дальше?',
    postLesson: {
      ...selfIntroPostLesson,
      options: selfIntroPostLesson.options.map((option) => ({ ...option })),
    },
  }
}

function buildSelfIntroSteps(variant: SelfIntroVariant): LessonStep[] {
  const step1Correct = toIAmName(variant.name)
  const step1WrongPerson = `She is ${variant.name}.`
  const step1WrongMood = toIAmMood(variant.feelingAdj === 'happy' ? 'tired' : 'happy')

  const step3Variants = [
    {
      id: `${variant.id}_step3_easy`,
      question: `Дополните одним словом: "I ___ from ${variant.country}."`,
      correctAnswer: 'am',
      hint: 'После I в этой рамке нужно am.',
      difficulty: 'easy' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_medium`,
      question: `Дополните одним словом: "I ___ ${variant.rolePhrase}."`,
      correctAnswer: 'am',
      hint: 'Перед ролью тоже нужен am: I am …',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: `Дополните одним словом: "I ___ ${variant.feelingAdj}."`,
      correctAnswer: 'am',
      hint: 'И в настроении после I ставим am.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]

  const step4Variants = [
    {
      id: `${variant.id}_step4_from`,
      question: formatTranslateQuestion(`Я из ${variant.countryRu}.`),
      correctAnswer: toIAmFromPlace(variant.country),
      acceptedAnswers: toFromAccepted(variant.country),
      hint: 'Шаблон: I am from + страна.',
      difficulty: 'easy' as ExerciseDifficulty,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_role`,
      question: formatTranslateQuestion(`Я ${variant.roleRu}.`),
      correctAnswer: toIAmRole(variant.rolePhrase),
      acceptedAnswers: [toIAmRole(variant.rolePhrase)],
      hint: 'I am + артикль + роль.',
      difficulty: 'medium' as ExerciseDifficulty,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_mood`,
      question: formatTranslateQuestion(variant.moodRu),
      correctAnswer: toIAmMood(variant.feelingAdj),
      acceptedAnswers: toMoodAccepted(variant.feelingAdj),
      hint: 'I am / I’m + прилагательное настроения.',
      difficulty: 'hard' as ExerciseDifficulty,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
  ]

  const step6Variants = buildSelfIntroStep6Variants(variant)
  const step6First = step6Variants[0]!

  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: 'Сегодня коротко представимся: имя, откуда вы, роль и настроение.',
        },
        {
          type: 'info',
          content: 'На форуме знакомств нужно представиться одной короткой фразой.',
        },
        {
          type: 'task',
          content: `Выберите фразу, где вы говорите о себе: "${variant.nameRu}"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит?',
        options: [step1Correct, step1WrongPerson, step1WrongMood],
        correctAnswer: step1Correct,
        acceptedAnswers: [step1Correct],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Нужна фраза про вас с am и именем.',
      },
      footerDynamic: 'Hook: I am + name',
      myEngComment: 'Вижу, вы готовы к новой конструкции.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Отдельно посмотрим на артикль перед ролью.',
        },
        {
          type: 'info',
          content: 'В соседнем примере: I am a nurse. / I am an artist. - перед ролью часто нужен a или an.',
        },
        {
          type: 'task',
          content: `Выберите артикль: "I am ___ ${variant.roleNoun}."`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: `Дополните: "I am ___ ${variant.roleNoun}."`,
        options: [variant.roleArticle, variant.wrongArticle1, variant.wrongArticle2],
        correctAnswer: variant.roleArticle,
        acceptedAnswers: [variant.roleArticle],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'После I am перед работой или учёбой обычно нужен a или an.',
      },
      footerDynamic: 'Theory: a/an + роль',
      myEngComment: 'Отлично, теперь берем роль.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Закрепим am в трёх коротких рамках.',
        },
        {
          type: 'info',
          content: 'Три пропуска: страна, роль и настроение - везде одно слово am.',
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
      footerDynamic: 'Практика: впишите am',
      myEngComment: 'Пора почувствовать am вживую.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь три шаблона целиком: from, роль и настроение.',
        },
        {
          type: 'info',
          content: 'Каждый ход - одно короткое предложение про себя.',
        },
        {
          type: 'task',
          content: 'Напишите английское предложение.',
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
      footerDynamic: 'Практика: from / роль / mood',
      myEngComment: 'Хорошо идете, держим темп.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Соберите предложения из слов.',
        },
        {
          type: 'info',
          content: 'Три коротких пазла: страна, роль и настроение.',
        },
        {
          type: 'task',
          content: 'Расставьте слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три предложения из слов.',
        correctAnswer: toIAmFromPlace(variant.country),
        acceptedAnswers: toFromAccepted(variant.country),
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка: начните с I am и следите за порядком слов.',
        bonusXp: 30,
        puzzleVariants: buildSelfIntroSentencePuzzleVariants(variant),
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
          content: 'Финальная проверка: имя, город и город+настроение.',
        },
        {
          type: 'info',
          content: 'Сначала имя, потом город, в конце две связанные части.',
        },
        {
          type: 'task',
          content: step6First.question,
        },
      ],
      exercise: {
        type: 'translate',
        question: step6First.question,
        correctAnswer: step6First.correctAnswer,
        acceptedAnswers: step6First.acceptedAnswers,
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: step6First.hint,
        variants: step6Variants,
      },
      footerDynamic: 'Финальная проверка: 3 коротких предложения',
      myEngComment: 'Три фразы подряд - вы почти у финиша.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Быстрый финиш: три коротких слова в контрасте.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово закрывает пропуск.',
        },
        {
          type: 'task',
          content: 'Выберите одно слово для пропуска в английской рамке.',
        },
      ],
      exercise: (() => {
        const step7Variants = buildSelfIntroStep7Variants(variant)
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

function buildSelfIntroVariantProfile(variant: SelfIntroVariant): LessonRepeatVariantProfile {
  const steps = buildSelfIntroSteps(variant)
  return {
    id: variant.id,
    label: variant.label,
    sourceSituations: [...variant.sourceSituations],
    stepBlueprints: buildSelfIntroBlueprints(variant),
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

const baseSelfIntroVariant = selfIntroVariants[0]

export const introducingYourselfLesson: LessonData = {
  id: '4',
  topic: 'Знакомство',
  level: 'A1',
  intro: {
    topic: 'I am / I am from',
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: [
        'Без am фраза ломается: I Anna или I from Russia звучат неправильно.',
        'I am from + место помогает назвать страну или город.',
        'I am a/an + роль помогает коротко назвать профессию или статус.',
      ],
      how: [
        'I am Maria. / I am from Russia.',
        'I am a student. / I am an engineer.',
        "I am happy. / I'm happy.",
      ],
      examples: [
        { en: 'I am Maria.', ru: 'Я Мария.', note: 'нужен am' },
        { en: 'I am from Russia.', ru: 'Я из России.', note: 'страна' },
        { en: 'I am a student.', ru: 'Я студент.', note: 'роль + a/an' },
      ],
      takeaway: 'С I почти всегда нужен am; потом выбирай from, роль или настроение.',
    },
    details: {
      points: [
        'Главная дыра новичка - пропуск am: I from Russia вместо I am from Russia.',
        'После from пишут страну или город по-английски одним словом.',
        'Перед профессией почти всегда нужен артикль a или an.',
      ],
      examples: [
        { en: "I'm happy.", ru: 'Я счастлив.', note: 'настроение' },
        { en: "I'm from Madrid.", ru: 'Я из Мадрида.', note: 'город' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'I am from in Russia вместо I am from Russia.',
        'I Anna / I from Russia вместо I am Anna / I am from Russia.',
        'I am student вместо I am a student.',
      ],
      contrastNotes: [
        'I am Maria - имя с am.',
        'I am from Russia - место.',
        'I am a doctor - роль с a/an.',
      ],
      selfCheckRule: 'Если начали с I, проверьте am; перед ролью отдельно проверьте a/an.',
    },
    learningPlan: {
      grammarFocus: ['I am + name/from/mood', 'I am a/an + role', 'am vs is/are'],
      contrastPair: ['I am happy.', "I'm happy."],
      firstPracticeGoal: 'Не терять am и различать from / роль / mood.',
    },
  },
  variantId: baseSelfIntroVariant.id,
  finale: buildSelfIntroFinale(),
  repeatConfig: {
    ruleSummary: 'Держим am после I и различаем from, роль (a/an) и настроение.',
    grammarFocus: ['I am + name/from/mood', 'I am a/an + role', 'am vs is/are'],
    sourceSituations: Array.from(new Set(selfIntroVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildSelfIntroBlueprints(baseSelfIntroVariant),
    variantProfiles: selfIntroVariants.map((variant) => buildSelfIntroVariantProfile(variant)),
    sessionScenarios: { ...INTRODUCING_YOURSELF_SESSION_SCENARIOS },
    sessionStepMaps: {
      relaxed: [...INTRODUCING_YOURSELF_SESSION_STEP_MAPS.relaxed],
      balanced: [...INTRODUCING_YOURSELF_SESSION_STEP_MAPS.balanced],
    },
    referenceScenariosByType: { ...INTRODUCING_YOURSELF_REFERENCE_SCENARIOS },
    challengeAtoms: [...INTRODUCING_YOURSELF_CHALLENGE_ATOMS],
    antiRepeatWindow: 3,
    bannedTerms: [
      'embedded questions',
      'past perfect',
      'present perfect',
      'past simple',
      'present continuous',
      'conditionals',
      'passive voice',
    ],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildSelfIntroSteps(baseSelfIntroVariant),
}
