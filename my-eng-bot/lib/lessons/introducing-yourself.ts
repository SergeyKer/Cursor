import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
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
  introSituationRu: string
  step1Correct: string
  step1WrongFrom: string
  step1WrongRole: string
  feelingAdj: string
  moodRuShort: string
  country: string
  roleArticle: 'a' | 'an'
  roleNoun: string
  rolePhrase: string
  wrongArticle1: string
  wrongArticle2: string
  step3FillWord: string
  step3HintEn: string
  step3StateRu: string
  step3MediumRu: string
  step3HardRu: string
  step4AltAdj1: string
  step4AltAdj2: string
  step4Ru1: string
  step4Ru2: string
  step4Ru3: string
  step5RoleRu: string
  step5EnFull: string
  finalCheckRu: string
  finalCorrectSentence: string
  finalWrong1: string
  finalWrong2: string
  step6CreativeCountry: string
  step6CreativeRu: string
  sourceSituations: string[]
}

function toImFeelingSentence(adj: string): string {
  return `I'm ${adj}.`
}

function toImFeelingAccepted(adj: string): string[] {
  return [`I'm ${adj}.`, `I am ${adj}.`]
}

function normalizeRuPromptLabel(text: string): string {
  return text.trim().replace(/[.!?…]+$/u, '')
}

const selfIntroVariants: SelfIntroVariant[] = [
  {
    id: 'vasya-russia-student',
    label: 'Россия, студент, настроение',
    introSituationRu: 'Ты коротко говоришь, что чувствуешь себя хорошо',
    step1Correct: "I'm happy.",
    step1WrongFrom: "I'm from Russia.",
    step1WrongRole: 'I am a student.',
    feelingAdj: 'happy',
    moodRuShort: 'Я счастлив.',
    country: 'Russia',
    roleArticle: 'a',
    roleNoun: 'student',
    rolePhrase: 'a student',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    step3FillWord: 'Russia',
    step3HintEn: 'I am from ___.',
    step3StateRu: 'Сейчас говорим только про страну',
    step3MediumRu: 'Хочешь сказать, откуда ты родом',
    step3HardRu: 'В анкете нужно указать страну после I am from',
    step4AltAdj1: 'tired',
    step4AltAdj2: 'fine',
    step4Ru1: 'Я счастлив.',
    step4Ru2: 'Я устал.',
    step4Ru3: 'У меня всё нормально.',
    step5RoleRu: 'Я студент.',
    step5EnFull: 'I am a student.',
    finalCheckRu: 'Ты говоришь, откуда ты',
    finalCorrectSentence: "I'm from Russia.",
    finalWrong1: "I'm happy.",
    finalWrong2: 'I am a student.',
    step6CreativeCountry: 'Canada',
    step6CreativeRu: 'В анкете ты из Канады. Напиши коротко, откуда ты.',
    sourceSituations: [
      'Привет! Я из России.',
      'Я студент.',
      'Я счастлив учиться.',
      'Расскажи: откуда ты?',
    ],
  },
  {
    id: 'maria-spain-engineer',
    label: 'Испания, инженер, усталость',
    introSituationRu: 'Ты говоришь, что немного устал после дня',
    step1Correct: "I'm tired.",
    step1WrongFrom: "I'm from Spain.",
    step1WrongRole: 'I am an engineer.',
    feelingAdj: 'tired',
    moodRuShort: 'Я устал.',
    country: 'Spain',
    roleArticle: 'an',
    roleNoun: 'engineer',
    rolePhrase: 'an engineer',
    wrongArticle1: 'a',
    wrongArticle2: 'the',
    step3FillWord: 'Spain',
    step3HintEn: 'I am from ___.',
    step3StateRu: 'Только название страны',
    step3MediumRu: 'Ты из Испании, это важно для знакомства',
    step3HardRu: 'После from нужно английское имя страны одним словом',
    step4AltAdj1: 'happy',
    step4AltAdj2: 'fine',
    step4Ru1: 'Я устал.',
    step4Ru2: 'Я счастлив.',
    step4Ru3: 'Всё хорошо, я в порядке.',
    step5RoleRu: 'Я инженер.',
    step5EnFull: 'I am an engineer.',
    finalCheckRu: 'Ты представляешь профессию',
    finalCorrectSentence: 'I am an engineer.',
    finalWrong1: "I'm from Spain.",
    finalWrong2: "I'm tired.",
    step6CreativeCountry: 'Italy',
    step6CreativeRu: 'В этой задаче ты из Италии. Напиши коротко, откуда ты.',
    sourceSituations: [
      'Я из Испании.',
      'Я инженер.',
      'Сегодня я устал.',
      'Кем ты работаешь?',
    ],
  },
  {
    id: 'alex-uk-teacher',
    label: 'Британия, учитель, всё ок',
    introSituationRu: 'Ты говоришь, что у тебя всё нормально',
    step1Correct: "I'm fine.",
    step1WrongFrom: "I'm from Britain.",
    step1WrongRole: 'I am a teacher.',
    feelingAdj: 'fine',
    moodRuShort: 'У меня всё нормально.',
    country: 'Britain',
    roleArticle: 'a',
    roleNoun: 'teacher',
    rolePhrase: 'a teacher',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    step3FillWord: 'Britain',
    step3HintEn: 'I am from ___.',
    step3StateRu: 'Одно слово — название страны',
    step3MediumRu: 'Ты из Великобритании',
    step3HardRu: 'В короткой фразе часто говорят Britain после from',
    step4AltAdj1: 'happy',
    step4AltAdj2: 'tired',
    step4Ru1: 'У меня всё нормально.',
    step4Ru2: 'Я рад.',
    step4Ru3: 'Я немного устал.',
    step5RoleRu: 'Я учитель.',
    step5EnFull: 'I am a teacher.',
    finalCheckRu: 'Ты говоришь про страну',
    finalCorrectSentence: "I'm from Britain.",
    finalWrong1: "I'm fine.",
    finalWrong2: 'I am a teacher.',
    step6CreativeCountry: 'Japan',
    step6CreativeRu: 'Представь, что ты из Японии. Напиши коротко, откуда ты.',
    sourceSituations: [
      'Я из Великобритании.',
      'Я учитель.',
      'Со мной всё в порядке.',
      'Откуда ты приехал?',
    ],
  },
  {
    id: 'sam-france-doctor',
    label: 'Франция, врач, радость',
    introSituationRu: 'Ты говоришь, что рад встрече',
    step1Correct: "I'm happy.",
    step1WrongFrom: "I'm from France.",
    step1WrongRole: 'I am a doctor.',
    feelingAdj: 'happy',
    moodRuShort: 'Я рад.',
    country: 'France',
    roleArticle: 'a',
    roleNoun: 'doctor',
    rolePhrase: 'a doctor',
    wrongArticle1: 'an',
    wrongArticle2: 'the',
    step3FillWord: 'France',
    step3HintEn: 'I am from ___.',
    step3StateRu: 'Одно слово — страна',
    step3MediumRu: 'Ты родом из Франции',
    step3HardRu: 'После from нужно английское France',
    step4AltAdj1: 'fine',
    step4AltAdj2: 'tired',
    step4Ru1: 'Я рад.',
    step4Ru2: 'Всё отлично.',
    step4Ru3: 'Я сегодня устал.',
    step5RoleRu: 'Я врач.',
    step5EnFull: 'I am a doctor.',
    finalCheckRu: 'Ты называешь работу',
    finalCorrectSentence: 'I am a doctor.',
    finalWrong1: "I'm from France.",
    finalWrong2: "I'm happy.",
    step6CreativeCountry: 'Germany',
    step6CreativeRu: 'Тебя спрашивают про Германию. Напиши коротко, откуда ты.',
    sourceSituations: [
      'Я из Франции.',
      'Я врач.',
      'Я очень рад.',
      'Кто ты по профессии?',
    ],
  },
]

const selfIntroPostLesson = {
  dynamicFooterText: 'Выбор за вами! Любое действие закрепит материал',
    interestingFact:
    'В разговоре чаще говорят I’m happy, а I am from … звучит понятно, когда важно сказать, откуда вы.',
  options: [
    { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
    { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
    { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
    { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
  ],
} as const

function buildSelfIntroBlueprints(variant: SelfIntroVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Показать ситуацию, где нужно выбрать фразу про настроение, страну или роль.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step1Correct,
      sourcePattern: "I'm + adjective",
      semanticAnchors: ['i am', "i'm", variant.feelingAdj],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: [variant.feelingAdj],
        shouldInclude: ["i'm"],
        mustAvoid: ['time to', 'who likes'],
        hintShouldMention: ['настроение', 'смысл'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Показать ситуацию, где нужно выбрать правильный артикль перед профессией.',
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
        mustAvoid: ['time to', 'from'],
        hintShouldMention: ['артикль', 'профессия'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Вписать название страны после I am from.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step3FillWord,
      sourcePattern: 'I am from + country',
      semanticAnchors: ['from', variant.step3FillWord],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['from'],
        shouldInclude: [variant.step3FillWord],
        mustAvoid: ['time to', 'who likes'],
        hintShouldMention: ['страна', 'одно слово'],
        requireCyrillicHint: true,
        allowEnglishInRussianPrompt: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести короткое описание настроения на английский.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: toImFeelingSentence(variant.feelingAdj),
      sourcePattern: "I'm + adjective",
      semanticAnchors: ["i'm", variant.feelingAdj],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.feelingAdj],
        shouldInclude: ["i'm"],
        mustAvoid: ['from', 'time to'],
        hintShouldMention: ['настроение', 'шаблон'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать три коротких предложения про настроение, страну и роль в puzzle-формате.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.finalCorrectSentence,
      sourcePattern: "word order puzzle for I'm from / I am",
      semanticAnchors: ['from', variant.country],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['from'],
        shouldInclude: ['i am', 'пазл'],
        mustAvoid: ['time to'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Финальная проверка: три коротких предложения про страну, роль и перенос на новую страну.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: variant.step5EnFull,
      sourcePattern: 'I am + article + profession',
      semanticAnchors: ['i am', variant.roleNoun],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: [variant.roleNoun],
        shouldInclude: ['i am'],
        mustAvoid: ['time to'],
        hintShouldMention: ['i am', 'профессия'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 2,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Три contrast-gap: одно ключевое слово в новой рамке (настроение, страна, артикль).',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.feelingAdj,
      sourcePattern: 'contrast gap: I am + adj / from + country / a|an + role',
      semanticAnchors: [variant.feelingAdj, variant.step6CreativeCountry.toLowerCase(), variant.roleArticle],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['time to'],
        hintShouldMention: ['смысл', 'ситуация'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
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
    errorText: 'Порядок неверный. Попробуйте ещё раз.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Берём следующий вариант.',
  }
}

const SELF_INTRO_STEP7_COUNTRY_POOL = ['Canada', 'Italy', 'Japan', 'Germany', 'Brazil', 'Mexico'] as const

function pickStep7CountryDistractors(correctCountry: string): [string, string] {
  const pool = SELF_INTRO_STEP7_COUNTRY_POOL.filter((country) => country !== correctCountry)
  return [pool[0] ?? 'Italy', pool[1] ?? 'Japan']
}

function buildSelfIntroStep7Variants(variant: SelfIntroVariant) {
  const moodDistractors = [variant.step4AltAdj1, variant.step4AltAdj2].filter(
    (adj) => adj !== variant.feelingAdj
  ) as [string, string]

  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: variant.introSituationRu,
      frameEn: "I'm ___.",
      correctWord: variant.feelingAdj,
      distractors: moodDistractors,
      hint: 'Ситуация про чувство — нужно прилагательное настроения.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: variant.step6CreativeRu,
      frameEn: "I'm from ___.",
      correctWord: variant.step6CreativeCountry,
      distractors: pickStep7CountryDistractors(variant.step6CreativeCountry),
      hint: 'Новая страна в анкете — одно слово после from.',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: `В коротком представлении вы — ${variant.roleNoun}.`,
      frameEn: `I am ___ ${variant.roleNoun}.`,
      correctWord: variant.roleArticle,
      distractors: [variant.wrongArticle1, variant.wrongArticle2],
      hint: 'Перед профессией нужен артикль a или an.',
    },
  ])
}

function buildSelfIntroStep6Variants(variant: SelfIntroVariant) {
  const fromSentence = `I'm from ${variant.country}.`
  const fromAccepted = [fromSentence, fromSentence.replace("I'm", 'I am')]
  const roleSentence = variant.step5EnFull
  const roleAccepted = [roleSentence]
  const creativeSentence = `I'm from ${variant.step6CreativeCountry}.`
  const creativeAccepted = [creativeSentence, creativeSentence.replace("I'm", 'I am')]

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: `Переведите на английский: ${normalizeRuPromptLabel(variant.sourceSituations[0] ?? `Я из ${variant.country}`)}`,
      correctAnswer: fromSentence,
      acceptedAnswers: fromAccepted,
      hint: 'Короткая фраза: I am from + страна одним словом.',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: `Переведите на английский: ${normalizeRuPromptLabel(variant.step5RoleRu)}`,
      correctAnswer: roleSentence,
      acceptedAnswers: roleAccepted,
      hint: 'Используйте I am + артикль + существительное.',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: `Переведите на английский: ${normalizeRuPromptLabel(variant.step6CreativeRu)}`,
      correctAnswer: creativeSentence,
      acceptedAnswers: creativeAccepted,
      hint: 'Тот же шаблон про страну, но другое название после from.',
    },
  ])
}

function buildSelfIntroSentencePuzzleVariants(variant: SelfIntroVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_mood`,
      'Пазл 1/3: настроение',
      toImFeelingSentence(variant.feelingAdj)
    ),
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_from`,
      'Пазл 2/3: откуда ты',
      `I'm from ${variant.country}.`
    ),
    buildSelfIntroPuzzleVariant(
      `${variant.id}_puzzle_role`,
      'Пазл 3/3: роль',
      `I am ${variant.rolePhrase}.`
    ),
  ]
}

function buildSelfIntroFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content: 'Урок завершен. Теперь вы по-разному говорите о настроении, стране и роли — короткими фразами.',
      },
      {
        type: 'info',
        content: 'Запомните три коротких шаблона: I am / I’m + слово про настроение; I am from + страна; I am a или an + кем вы.',
      },
      {
        type: 'task',
        content: 'Нажмите «Далее» ниже — и выберите, как закрепить тему.',
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
  const step3Variants = [
    {
      id: `${variant.id}_step3_easy`,
      question: `Переведите на английский: "${variant.sourceSituations[0]}." - "${variant.step3HintEn}"`,
      correctAnswer: variant.step3FillWord,
      hint: 'После from напишите одно английское слово — название страны.',
      difficulty: 'easy' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_medium`,
      question: `Переведите на английский: "${variant.step3MediumRu}." - "${variant.step3HintEn}"`,
      correctAnswer: variant.step3FillWord,
      hint: 'Снова одно слово — страна по-английски.',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: `Переведите на английский: "${variant.step3HardRu}." - "${variant.step3HintEn}"`,
      correctAnswer: variant.step3FillWord,
      hint: 'Одно слово после from — как Russia или France.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]

  const step4Adjectives = Array.from(new Set([variant.feelingAdj, variant.step4AltAdj1, variant.step4AltAdj2])).slice(0, 3)
  const step4RuPrompts = [variant.step4Ru1, variant.step4Ru2, variant.step4Ru3]
  const step4Variants = step4Adjectives.map((adj, index) => {
    const difficulty: ExerciseDifficulty = index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
    const ru = step4RuPrompts[index] ?? variant.moodRuShort
    return {
      id: `${variant.id}_step4_${index + 1}`,
      question: `Переведите на английский: ${normalizeRuPromptLabel(ru)}`,
      correctAnswer: toImFeelingSentence(adj),
      acceptedAnswers: toImFeelingAccepted(adj),
      hint: 'Напишите короткое предложение по шаблону I am / I’m + прилагательное.',
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
          content: 'Сегодня разберем три короткие фразы для знакомства: настроение, страна и роль.',
        },
        {
          type: 'info',
          content: 'I am / I’m + прилагательное — про чувство. I am from + место — про страну. I am a/an + роль — про работу или статус.',
        },
        {
          type: 'task',
          content: `Выберите правильное предложение для ситуации: "${variant.introSituationRu}"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит по смыслу?',
        options: [variant.step1Correct, variant.step1WrongFrom, variant.step1WrongRole],
        correctAnswer: variant.step1Correct,
        acceptedAnswers: [variant.step1Correct],
        answerFormat: 'choice',
        answerPolicy: 'strict',
      },
      footerDynamic: 'Правило 1: настроение — I am / I’m + прилагательное',
      myEngComment: 'Вижу, вы готовы к новой конструкции.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь посмотрим на роль: I am a/an + существительное.',
        },
        {
          type: 'info',
          content: `Перед профессией часто нужен артикль: ${variant.rolePhrase}, a doctor, an engineer.`,
        },
        {
          type: 'task',
          content: `Выберите правильный артикль: "I am ___ ${variant.roleNoun}."`,
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
      footerDynamic: 'Правило 2: I am a/an + роль',
      myEngComment: 'Отлично, теперь берем роль.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Сравним страну и роль в нескольких коротких ситуациях.',
        },
        {
          type: 'info',
          content: 'Пример: "I am from Japan. I am a nurse."',
        },
        {
          type: 'task',
          content: `Впишите пропуск: "${variant.sourceSituations[0]}." - "${variant.step3HintEn}"`,
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
      footerDynamic: 'Практика: впишите страну',
      myEngComment: 'Пора почувствовать разницу вживую.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь потренируем настроение в нескольких новых вариантах.',
        },
        {
          type: 'info',
          content: 'Пример: "I am calm."',
        },
        {
          type: 'task',
          content: 'Напишите английское предложение для короткого описания настроения.',
        },
      ],
      exercise: {
        type: 'translate',
        question: step4Variants[0]?.question ?? `Переведите на английский: ${normalizeRuPromptLabel(variant.moodRuShort)}`,
        correctAnswer: step4Variants[0]?.correctAnswer ?? toImFeelingSentence(variant.feelingAdj),
        acceptedAnswers: step4Variants[0]?.acceptedAnswers ?? toImFeelingAccepted(variant.feelingAdj),
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: step4Variants[0]?.hint ?? 'Напишите короткое предложение по шаблону I am / I’m + прилагательное.',
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
          content: 'Будет три коротких пазла: настроение, страна и роль.',
        },
        {
          type: 'task',
          content: 'Расставьте слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три предложения из слов.',
        correctAnswer: variant.finalCorrectSentence,
        acceptedAnswers: [variant.finalCorrectSentence, variant.finalCorrectSentence.replace("I'm", 'I am')],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка: начните с I’m или I am и следите за порядком слов после from.',
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
          content: 'Финальная проверка: три коротких предложения подряд.',
        },
        {
          type: 'info',
          content: 'Сначала страна, потом роль, в конце — та же грамматика, но новая страна.',
        },
        {
          type: 'task',
          content: `Переведите на английский: ${normalizeRuPromptLabel(variant.sourceSituations[0] ?? `Я из ${variant.country}`)}`,
        },
      ],
      exercise: (() => {
        const step6Variants = buildSelfIntroStep6Variants(variant)
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
          content: 'Быстрый финиш: три коротких слова в новых ситуациях.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово закрывает пропуск — без подсказки из карточки.',
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
        'I am / I’m + прилагательное помогает сказать, как вы себя чувствуете.',
        'I am from + место помогает назвать страну или город.',
        'I am a/an + роль помогает коротко назвать профессию или статус.',
      ],
      how: [
        "I'm happy. / I am happy.",
        'I am from Russia.',
        'I am a student. / I am an engineer.',
      ],
      examples: [
        { en: "I'm happy.", ru: 'Я счастлив.', note: 'настроение' },
        { en: 'I am from Russia.', ru: 'Я из России.', note: 'страна' },
        { en: 'I am a student.', ru: 'Я студент.', note: 'роль' },
      ],
      takeaway: 'Сначала подумай: настроение, страна или роль — потом выбери короткий шаблон.',
    },
    details: {
      points: [
        'В I am happy слово happy описывает чувство, а не место.',
        'После from пишут страну по-английски: Russia, Spain — чаще всего одно слово.',
        'Перед профессией почти всегда нужен артикль a или an: a teacher, an engineer.',
      ],
      examples: [
        { en: "I'm fine.", ru: 'У меня всё нормально.', note: 'только настроение' },
        { en: "I'm from Spain.", ru: 'Я из Испании.', note: 'только место' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'I am from in Russia вместо I am from Russia.',
        'I am student вместо I am a student.',
        'Писать длинно, когда достаточно трёх слов: I am a student.',
      ],
      contrastNotes: ["I'm happy — про настроение.", 'I am from Russia — про страну.', 'I am a doctor — про работу.'],
      selfCheckRule: 'Если называете страну после from, не добавляйте лишний предлог in перед названием.',
    },
    learningPlan: {
      grammarFocus: ['I am / I’m + adjective', 'I am from + place', 'I am a/an + role'],
      contrastPair: ['I am happy.', "I'm happy."],
      firstPracticeGoal: 'Сказать коротко: как я себя чувствую, откуда я, кем я учусь или работаю.',
    },
  },
  variantId: baseSelfIntroVariant.id,
  finale: buildSelfIntroFinale(),
  repeatConfig: {
    ruleSummary: 'Различаем настроение, страну и роль в коротком самопредставлении.',
    grammarFocus: ['I am + adjective', 'I am from + place', 'I am a/an + noun'],
    sourceSituations: Array.from(new Set(selfIntroVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildSelfIntroBlueprints(baseSelfIntroVariant),
    variantProfiles: selfIntroVariants.map((variant) => buildSelfIntroVariantProfile(variant)),
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
