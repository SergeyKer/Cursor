import { formatTranslateQuestion } from '@/lib/lessonTranslatePrompt'
import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { WHO_LIKES_CHALLENGE_ATOMS } from '@/lib/lessons/whoLikesChallengeAtoms'
import {
  WHO_LIKES_REFERENCE_SCENARIOS,
  WHO_LIKES_SESSION_SCENARIOS,
  WHO_LIKES_SESSION_STEP_MAPS,
} from '@/lib/lessons/whoLikesSessionScenarios'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type { LessonData, LessonFinale, LessonRepeatStepBlueprint, LessonRepeatVariantProfile, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

type WhoLikesVariant = {
  id: string
  label: string
  introQuestionRu: string
  introObject: string
  introSubject: string
  introSubjectRu: string
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
    introSubjectRu: 'Анна',
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
    sourceSituations: ['Кто любит музыку?', 'Кто любит чай?', 'Кто это?', 'Кто работает здесь?'],
  },
  {
    id: 'tea-drinks',
    label: 'Напитки и drinks',
    introQuestionRu: 'Кто пьет чай?',
    introObject: 'tea',
    introSubject: 'Max',
    introSubjectRu: 'Макс',
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
    sourceSituations: ['Кто пьет чай?', 'Кто пьет кофе?', 'Кто это?', 'Кто работает здесь?'],
  },
  {
    id: 'books-reads',
    label: 'Книги и reads',
    introQuestionRu: 'Кто читает книги?',
    introObject: 'books',
    introSubject: 'Nina',
    introSubjectRu: 'Нина',
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
    sourceSituations: ['Кто читает книги?', 'Кто читает комиксы?', 'Кто это?', 'Кто работает здесь?'],
  },
  {
    id: 'sports-plays',
    label: 'Спорт и plays',
    introQuestionRu: 'Кто играет в футбол?',
    introObject: 'football',
    introSubject: 'Alex',
    introSubjectRu: 'Алекс',
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
    sourceSituations: ['Кто играет в футбол?', 'Кто играет в теннис?', 'Кто это?', 'Кто работает здесь?'],
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
  pizza: 'пиццу',
  milk: 'молоко',
  poems: 'стихи',
  basketball: 'баскетбол',
}

function toWhoLikesVerbRu(verbBase: string, object: string): string {
  const translatedObject = WHO_OBJECT_TRANSLATIONS[object] ?? object
  if (verbBase === 'play') return `играет в ${translatedObject}`
  if (verbBase === 'drink') return `пьет ${translatedObject}`
  if (verbBase === 'read') return `читает ${translatedObject}`
  return `любит ${translatedObject}`
}

function toWhoLikesAnswerRu(subjectRu: string, verbBase: string, object: string): string {
  return `${subjectRu} ${toWhoLikesVerbRu(verbBase, object)}.`
}

const whoLikesPostLesson = {
  interestingFact:
    'В Who-вопросах про одного человека глагол часто сразу с -s: Who likes…, Who works…',
  options: DEFAULT_POST_LESSON_OPTIONS,
} as const

function buildWhoLikesBlueprints(variant: WhoLikesVariant): LessonRepeatStepBlueprint[] {
  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      learningGoal: 'Узнать вопрос Who is that? в ситуации с незнакомцем.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: 'Who is that?',
      sourcePattern: 'Who + is + that?',
      semanticAnchors: ['who', 'is', 'that'],
      semanticExpectations: {
        pedagogicalRole: 'introduce_context',
        mustInclude: ['who', 'is'],
        shouldInclude: ['that'],
        mustAvoid: ['who does', 'whom', 'object who'],
        hintShouldMention: ['who', 'человек'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'sentence_choice',
      },
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      learningGoal: 'Закрепить форму глагола с -s после Who.',
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
        mustAvoid: ['who does', 'whom'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'contrast_gap',
      },
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      learningGoal: 'Вписать Who, verb-s или works в коротких subject-Who рамках.',
      exerciseType: 'fill_text',
      answerFormat: 'single_word',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.verbThird,
      sourcePattern: `Who / ${variant.verbThird} / works`,
      semanticAnchors: ['who', variant.verbThird, 'works'],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: [variant.verbThird],
        shouldInclude: ['who'],
        mustAvoid: ['who does', 'do you know'],
        hintShouldMention: ['одно слово', '-s'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      learningGoal: 'Перевести subject-Who вопросы: verb-s, works, Who is that.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'normalized',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      sourcePattern: 'Who + verb-s / works / is',
      semanticAnchors: ['who', variant.verbThird],
      semanticExpectations: {
        pedagogicalRole: 'controlled_pattern_drill',
        mustInclude: ['who'],
        shouldInclude: ['?'],
        mustAvoid: ['who does', 'whom'],
        hintShouldMention: ['who'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      learningGoal: 'Собрать subject-Who вопрос, ответ Name+verb-s и новый вопрос.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      sourcePattern: `word order puzzle for Who + ${variant.verbThird}`,
      semanticAnchors: ['who', variant.verbThird, variant.introObject],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['who', variant.verbThird],
        shouldInclude: [variant.introSubject.toLowerCase(), 'пазл'],
        mustAvoid: ['who does'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Финальная проверка: ответ Name+verb-s и минимум две пары вопрос+ответ.',
      exerciseType: 'translate',
      answerFormat: 'full_sentence',
      answerPolicy: 'equivalent_variants',
      sourceCorrectAnswer: `Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`,
      sourcePattern: `Who ${variant.verbThird} + noun? Subject ${variant.verbThird} + noun.`,
      semanticAnchors: ['who', variant.verbThird, variant.step5Object],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: ['who', variant.verbThird],
        shouldInclude: [variant.step5Subject.toLowerCase()],
        mustAvoid: ['who does'],
        hintShouldMention: ['вопрос', 'ответ'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: true,
        maxAcceptedAnswers: 3,
      },
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Contrast: verb-s vs base, Who vs What (один WH), works vs work.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.verbThird,
      sourcePattern: `${variant.verbThird} / Who / works`,
      semanticAnchors: ['who', variant.verbThird, 'works'],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['who does', 'whom'],
        hintShouldMention: [variant.verbThird],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
        choiceMode: 'contrast_gap',
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
    errorText: 'Начни с Who, потом глагол с -s, потом объект.',
    hintText: buildPuzzleVariantHintText(correctOrder),
    hintFirstWord: correctOrder[0],
    myEngComment: 'Отлично. Собираем следующий вариант.',
  }
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
      hint: 'После Who в таком вопросе нужна форма глагола с -s.',
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: 'На вечеринке спрашивают про человека, а не про вещь',
      frameEn: `___ ${variant.verbThird} ${variant.introObject}?`,
      correctWord: 'Who',
      distractors: ['What', 'Where'],
      hint: 'Про человека в начале вопроса ставим Who, не What.',
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: 'Нужно спросить, кто работает здесь',
      frameEn: 'Who ___ here?',
      correctWord: 'works',
      distractors: ['work', 'working'],
      hint: 'После Who снова форма с -s: works.',
    },
  ])
}

function buildWhoLikesStep6Variants(variant: WhoLikesVariant) {
  const answerSentence = `${variant.introSubject} ${variant.verbThird} ${variant.introObject}.`
  const answerRu = toWhoLikesAnswerRu(variant.introSubjectRu, variant.verbBase, variant.introObject)
  const dialogueSentence = `Who ${variant.verbThird} ${variant.step5Object}? ${variant.step5Subject} ${variant.verbThird} ${variant.step5Object}.`
  const creativeQuestion = `Who ${variant.verbThird} ${variant.step6CreativeObject}?`
  const creativeAnswer = `${variant.step6CreativeSubject} ${variant.verbThird} ${variant.step6CreativeObject}.`
  const creativeFull = `${creativeQuestion} ${creativeAnswer}`

  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: formatTranslateQuestion(answerRu),
      correctAnswer: answerSentence,
      acceptedAnswers: [answerSentence],
      hint: `Короткий ответ: ${variant.introSubject} + ${variant.verbThird} + объект.`,
      answerPolicy: 'normalized',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: formatTranslateQuestion(variant.step5QuestionRu),
      correctAnswer: dialogueSentence,
      acceptedAnswers: [dialogueSentence],
      hint: `Сначала вопрос с Who, потом ответ с ${variant.verbThird}.`,
      answerPolicy: 'equivalent_variants',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: formatTranslateQuestion(variant.step6CreativeRu),
      correctAnswer: creativeFull,
      acceptedAnswers: [creativeFull],
      hint: 'Две фразы: Who + глагол с -s + объект?, потом короткий ответ.',
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
        content:
          'Готово! Who-вопросы - ваши. Дальше - практика и кубок 🏆.',
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
      question: `Дополните одним словом: "___ ${variant.verbThird} ${variant.step3Object}?"`,
      correctAnswer: 'Who',
      hint: 'Вопрос про человека начинается с Who.',
      difficulty: 'medium' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
    {
      id: `${variant.id}_step3_hard`,
      question: 'Дополните одним словом: "Who ___ here?"',
      correctAnswer: 'works',
      hint: 'После Who снова форма с -s: works.',
      difficulty: 'hard' as const,
      answerFormat: 'single_word' as const,
      answerPolicy: 'strict' as const,
    },
  ]
  const step4Variants = [
    {
      id: `${variant.id}_step4_easy`,
      question: formatTranslateQuestion(variant.introQuestionRu),
      correctAnswer: `Who ${variant.verbThird} ${variant.introObject}?`,
      hint: '«Кто» - Who. Глагол с -s, потом объект и знак вопроса.',
      difficulty: 'easy' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_medium`,
      question: formatTranslateQuestion('Кто работает здесь?'),
      correctAnswer: 'Who works here?',
      hint: 'Who + works + here?',
      difficulty: 'medium' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
    {
      id: `${variant.id}_step4_hard`,
      question: formatTranslateQuestion('Кто это?'),
      correctAnswer: 'Who is that?',
      hint: 'Короткий вопрос про человека: Who is that?',
      difficulty: 'hard' as const,
      answerFormat: 'full_sentence' as const,
      answerPolicy: 'normalized' as const,
    },
  ]

  const step6Variants = buildWhoLikesStep6Variants(variant)
  const step6First = step6Variants[0]!

  return [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: 'Сегодня потренируем короткие вопросы с Who: кто это и кто что делает.',
        },
        {
          type: 'info',
          content: 'На вечеринке видите незнакомца у двери и хотите спросить, кто это.',
        },
        {
          type: 'task',
          content: 'Выберите правильный вопрос про человека.',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вопрос подходит?',
        options: ['Who is that?', 'What is that?', 'Where is that?'],
        correctAnswer: 'Who is that?',
        acceptedAnswers: ['Who is that?'],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Про человека спрашиваем Who, не What и не Where.',
      },
      footerDynamic: 'Hook: Who is that?',
      myEngComment: 'Начинаем с вопроса про человека.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь форма глагола после Who.',
        },
        {
          type: 'info',
          content: 'В соседнем примере: Who cooks dinner? - после Who часто стоит глагол с -s.',
        },
        {
          type: 'task',
          content: `Выберите слово для пропуска: "Who ___ ${variant.introObject}?"`,
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какой вариант грамматически верный?',
        options: [variant.verbThird, variant.verbBase, variant.verbIng],
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
          content: 'Закрепим Who, глагол с -s и works в коротких рамках.',
        },
        {
          type: 'info',
          content: 'Три коротких пропуска: одно слово на каждый ход.',
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
      footerDynamic: 'Практика: Who + глагол с -s',
      myEngComment: 'Хорошо, короткий ритм вопроса.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Соберём целые вопросы Who в новых ситуациях.',
        },
        {
          type: 'info',
          content: 'Будут три вопроса: про действие с -s, про work и Who is that.',
        },
        {
          type: 'task',
          content: 'Напишите вопрос на английском.',
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
      myEngComment: 'Собираем вопрос уверенно.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Соберите правильный порядок слов.',
        },
        {
          type: 'info',
          content: 'Три сборки: вопрос, ответ и пара вопрос–ответ.',
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
          content: 'Сначала короткий ответ, потом две пары вопрос–ответ с глаголом на -s.',
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
          content: 'Быстрый финиш: три слова в контрасте.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово - форма с -s, Who или works.',
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
    topic: 'Who ...?',
    kind: 'structure',
    complexity: 'simple',
    quick: {
      why: [
        'Who — вопрос про человека: кто это или кто делает.',
        'Спрашиваешь, кто делает — у глагола часто -s.',
        'В ответе то же: Anna likes… — тоже с -s.',
      ],
      how: [
        'Who is …? → Who is that?',
        'Who + глагол с -s …? → Who likes music?',
        'Имя + глагол с -s → Anna likes tea.',
      ],
      examples: [
        { en: 'Who is that?', ru: 'Кто это?', note: 'Спросить, кто этот человек' },
        { en: 'Who likes music?', ru: 'Кто любит музыку?', note: 'Спросить, кто это делает' },
        { en: 'Anna likes tea.', ru: 'Анна любит чай.', note: 'Так отвечают на Who…' },
      ],
      takeaway: 'Who — про человека; в вопросе и в ответе глагол часто с окончанием -s.',
    },
    details: {
      points: [
        'Who is that? — базовый вопрос «кто это».',
        'Who likes… не начинается с do/does.',
        'Частая ошибка: Who like… или What вместо Who про человека.',
      ],
      examples: [
        { en: 'Who works here?', ru: 'Кто работает здесь?', note: 'works, не work' },
        { en: 'Who drinks coffee?', ru: 'Кто пьёт кофе?', note: 'drinks' },
        { en: 'Tom likes football.', ru: 'Том любит футбол.', note: 'ответ с -s' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'Не Who like music? — а Who likes music?',
        'Не What likes music? (если про человека) — а Who likes music?',
        'Не Do/Does в начале у Who likes… — а сразу Who likes music?',
      ],
      contrastNotes: [
        'Who likes music? — вопрос.',
        'Anna likes music. — ответ.',
        'Who is that? — кто это.',
      ],
      selfCheckRule:
        'Спрашиваешь, кто это делает — после Who ставь глагол с -s: Who likes music? Не Who like.',
    },
    learningPlan: {
      grammarFocus: ['Who is that?', 'Who + verb-s', 'Name + verb-s', 'Who vs What'],
      firstPracticeGoal: 'Скажи 3 фразы: Who is that? / Who likes music? / Anna likes tea.',
    },
  },
  variantId: baseVariant.id,
  finale: buildWhoLikesFinale(),
  repeatConfig: {
    ruleSummary: 'Who is… / Who + глагол с -s; ответ Имя + глагол с -s.',
    grammarFocus: ['Who is that?', 'Who + verb-s', 'Name + verb-s', 'Who vs What'],
    sourceSituations: Array.from(new Set(whoLikesVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildWhoLikesBlueprints(baseVariant),
    variantProfiles: whoLikesVariants.map((variant) => buildWhoLikesVariantProfile(variant)),
    sessionScenarios: { ...WHO_LIKES_SESSION_SCENARIOS },
    sessionStepMaps: {
      relaxed: [...WHO_LIKES_SESSION_STEP_MAPS.relaxed],
      balanced: [...WHO_LIKES_SESSION_STEP_MAPS.balanced],
    },
    referenceScenariosByType: { ...WHO_LIKES_REFERENCE_SCENARIOS },
    challengeAtoms: [...WHO_LIKES_CHALLENGE_ATOMS],
    antiRepeatWindow: 3,
    bannedTerms: ['past simple', 'present continuous', 'future', 'conditionals', 'passive', 'who does she'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildWhoLikesSteps(baseVariant),
}
