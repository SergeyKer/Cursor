import { buildStep6ExamVariants } from '@/lib/lessons/step6Exam'
import { buildStep7ContrastVariants } from '@/lib/lessons/step7Contrast'
import { buildPuzzleVariantHintText } from '@/lib/puzzlePanelLayout'
import { toSentencePuzzleCards } from '@/lib/sentencePuzzleWords'
import type {
  ExerciseDifficulty,
  ExerciseVariant,
  LessonData,
  LessonFinale,
  LessonRepeatStepBlueprint,
  LessonRepeatVariantProfile,
  LessonStep,
  SentencePuzzleVariant,
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
  /** Сравнение прямого вопроса и встроенной части для шага 2 */
  theoryContrastRu: string
  step3Variants: ExerciseVariant[]
  step4Variants: ExerciseVariant[]
  step5TaskRu: string
  step5CorrectAnswer: string
  step5AcceptedAnswers: string[]
  step6TaskRu: string
  step6Options: [string, string, string]
  step6CorrectAnswer: string
  step6LightQuestion: string
  step6LightAnswer: string
  step6LightAcceptedAnswers?: string[]
  step6MediumQuestion: string
  step6MediumAnswer: string
  step6MediumAcceptedAnswers?: string[]
  step6CreativeQuestion: string
  step6CreativeAnswer: string
  step6CreativeAcceptedAnswers?: string[]
  sourceSituations: string[]
}

function formatQuotedSituationForTask(situation: string): string {
  const trimmedSituation = situation.trim()
  const sentencePunctuation = /[.!?…]$/.test(trimmedSituation) ? '' : '.'
  return `"${trimmedSituation}${sentencePunctuation}"`
}

const embeddedQuestionVariants: EmbeddedQuestionVariant[] = [
  {
    id: 'home-lives',
    label: 'Я знаю, что ей нравится',
    introSituationRu: 'Я знаю, что ей нравится',
    introCorrectSentence: 'I know what she likes.',
    introWrongSentence: 'I know what does she like.',
    introExtraSentence: 'I know what she like.',
    theoryLeadEn: 'Do you know',
    theoryCorrectClause: 'what she likes',
    theoryWrongClause: 'what does she like',
    theoryExtraClause: 'what she like',
    theoryRuleRu:
      'После do you know, tell me, can you say внутри второй части сохраняем обычный порядок слов: вопросительное слово + подлежащее + глагол.',
    theoryContrastRu:
      'Сравните: прямой вопрос — "What does she like?", а во встроенной части — "what she likes".',
    step3Variants: [
      {
        id: 'home-lives_step3_easy',
        question: 'Дополните одним словом: "I know what she ___."',
        correctAnswer: 'likes',
        hint: 'После what she нужен обычный глагол без does.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'home-lives_step3_medium',
        question: "Дополните одним словом: \"I don't know where he ___.\"",
        correctAnswer: 'lives',
        hint: 'После where he не нужен does: оставляем подлежащее и глагол.',
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
        question: 'Переведите на английский: "Я знаю, что ей нравится."',
        correctAnswer: 'I know what she likes.',
        hint: 'Начните с I know, потом what + подлежащее + глагол без does.',
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
        hint: 'После tell me используйте where + подлежащее + глагол.',
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
    step6LightQuestion: 'Переведите на английский: "Скажи мне, где работает Анна."',
    step6LightAnswer: 'Tell me where Anna works.',
    step6MediumQuestion: 'Переведите на английский: "Ты знаешь, где живет Алекс? Он живет рядом с парком."',
    step6MediumAnswer: 'Do you know where Alex lives? He lives near the park.',
    step6MediumAcceptedAnswers: ['Do you know where Alex lives? Alex lives near the park.'],
    step6CreativeQuestion: 'Переведите на английский: "Я не знаю, когда приходит автобус."',
    step6CreativeAnswer: "I don't know when the bus arrives.",
    step6CreativeAcceptedAnswers: ['I do not know when the bus arrives.'],
    sourceSituations: [
      'Я знаю, что ей нравится.',
      'Ты знаешь, что ей нравится?',
      'Скажи мне, где находится станция.',
      'Ты знаешь, где живет Алекс?',
      'Скажи мне, где работает Анна.',
    ],
  },
  {
    id: 'music-likes',
    label: 'Что ей нравится',
    introSituationRu: 'Ты знаешь, что ей нравится?',
    introCorrectSentence: 'Do you know what she likes?',
    introWrongSentence: 'Do you know what does she like?',
    introExtraSentence: 'Do you know what she like?',
    theoryLeadEn: 'Can you say',
    theoryCorrectClause: 'when the film starts',
    theoryWrongClause: 'when does the film start',
    theoryExtraClause: 'when the film start',
    theoryRuleRu:
      'Во вложенном вопросе после can you say или do you know не ставим does перед подлежащим.',
    theoryContrastRu:
      'Сравните: прямой вопрос — "When does the film start?", а во встроенной части — "when the film starts".',
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
        hint: 'Сначала do you know, потом what + подлежащее + глагол.',
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
    step6LightQuestion: 'Переведите на английский: "Я не знаю, где он работает."',
    step6LightAnswer: "I don't know where he works.",
    step6LightAcceptedAnswers: ['I do not know where he works.'],
    step6MediumQuestion: 'Переведите на английский: "Ты знаешь, что любит Оля? Она любит джаз."',
    step6MediumAnswer: 'Do you know what Olya likes? She likes jazz.',
    step6MediumAcceptedAnswers: ['Do you know what Olya likes? Olya likes jazz.'],
    step6CreativeQuestion: 'Переведите на английский: "Скажи, когда приходит автобус."',
    step6CreativeAnswer: 'Can you say when the bus arrives?',
    step6CreativeAcceptedAnswers: ['Can you tell me when the bus arrives?'],
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
    theoryContrastRu:
      'Сравните: прямой вопрос — "Where is the cafe?", а во встроенной части — "where the cafe is".',
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
        hint: 'Сначала can you say, потом when + подлежащее + глагол.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'lesson-starts_step4_medium',
        question: 'Переведите на английский: "Скажи мне, где находится кафе."',
        correctAnswer: 'Tell me where the cafe is.',
        hint: 'После tell me используйте where + подлежащее + глагол.',
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
    step6LightQuestion: 'Переведите на английский: "Я не знаю, чего она хочет."',
    step6LightAnswer: "I don't know what she wants.",
    step6LightAcceptedAnswers: ['I do not know what she wants.'],
    step6MediumQuestion: 'Переведите на английский: "Ты знаешь, когда начинается фильм? Он начинается в семь."',
    step6MediumAnswer: 'Do you know when the film starts? It starts at seven.',
    step6MediumAcceptedAnswers: ['Do you know when the film starts? The film starts at seven.'],
    step6CreativeQuestion: 'Переведите на английский: "Ты знаешь, чего хочет учитель?"',
    step6CreativeAnswer: 'Do you know what the teacher wants?',
    step6CreativeAcceptedAnswers: ['Do you know what the teacher needs?'],
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
    theoryContrastRu:
      'Сравните: прямой вопрос — "When do they start?", а во встроенной части — "when they start".',
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
        hint: 'После tell me используйте where + подлежащее + глагол.',
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
        hint: 'Сначала do you know, потом what + подлежащее + глагол.',
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
    step6LightQuestion: 'Переведите на английский: "Скажи мне, где находится парк."',
    step6LightAnswer: 'Tell me where the park is.',
    step6MediumQuestion: 'Переведите на английский: "Скажи мне, где находится музей. Он рядом со школой."',
    step6MediumAnswer: 'Tell me where the museum is. It is near the school.',
    step6MediumAcceptedAnswers: ['Tell me where the museum is. The museum is near the school.'],
    step6CreativeQuestion: 'Переведите на английский: "Ты знаешь, что нужно медсестре?"',
    step6CreativeAnswer: 'Do you know what the nurse needs?',
    step6CreativeAcceptedAnswers: ['Do you know what the nurse wants?'],
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
  interestingFact:
    'Во встроенных вопросах английский обычно возвращается к обычному порядку слов: what she likes, where he lives, where the station is.',
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
      learningGoal: 'Собрать три встроенных вопроса в правильном порядке слов.',
      exerciseType: 'sentence_puzzle',
      answerFormat: 'full_sentence',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step6CorrectAnswer,
      sourcePattern: 'word order puzzle for embedded questions',
      semanticAnchors: [variant.step6CorrectAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: [extractWhWord(variant.step6CorrectAnswer)],
        shouldInclude: ['пазл', 'порядок слов'],
        mustAvoid: ['if', 'whether', 'present continuous'],
        hintShouldMention: ['первое слово', 'порядок'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      learningGoal: 'Финальная проверка: одна фраза, мини-диалог и перенос на новую лексику.',
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
      stepNumber: 7,
      stepType: 'feedback',
      learningGoal: 'Три contrast-gap: глагол во встроенной части без инверсии.',
      exerciseType: 'fill_choice',
      answerFormat: 'choice',
      answerPolicy: 'strict',
      sourceCorrectAnswer: variant.step3Variants[0]!.correctAnswer,
      sourcePattern: 'embedded clause: wh-word + subject + verb',
      semanticAnchors: [variant.step3Variants[0]!.correctAnswer],
      semanticExpectations: {
        pedagogicalRole: 'contrast_check',
        mustAvoid: ['if', 'whether', 'present continuous'],
        hintShouldMention: ['порядок слов', 'глагол'],
        requireCyrillicHint: true,
        maxAcceptedAnswers: 1,
      },
    },
  ]
}

function buildEmbeddedPuzzleVariant(id: string, title: string, answer: string): SentencePuzzleVariant {
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

function extractFrameFromStep3Question(question: string): string {
  const match = question.match(/"([^"]+)"/)
  return match?.[1] ?? question
}

function buildEmbeddedVerbDistractors(correct: string): [string, string] {
  if (correct === 'is') return ['are', 'am']
  if (correct === 'are') return ['is', 'am']
  if (correct === 'am') return ['is', 'are']
  if (correct.endsWith('s')) {
    const stem = correct.slice(0, -1)
    return [stem, `${stem}ing`]
  }
  return [`${correct}s`, `${correct}ing`]
}

const EMBEDDED_STEP7_HARD: Record<
  string,
  { situationRu: string; frameEn: string; correctWord: string; distractors: [string, string]; hint: string }
> = {
  'home-lives': {
    situationRu: 'Новая ситуация: когда приходит автобус',
    frameEn: "I don't know when the bus ___.",
    correctWord: 'arrives',
    distractors: ['arrive', 'arriving'],
    hint: 'После when the bus — обычный глагол для the bus.',
  },
  'music-likes': {
    situationRu: 'Новая ситуация: где он работает',
    frameEn: "I don't know where he ___.",
    correctWord: 'works',
    distractors: ['work', 'working'],
    hint: 'После where he не нужен does.',
  },
  'lesson-starts': {
    situationRu: 'Новая ситуация: чего она хочет',
    frameEn: "I don't know what she ___.",
    correctWord: 'wants',
    distractors: ['want', 'wanting'],
    hint: 'После what she — обычный порядок слов.',
  },
  'station-is': {
    situationRu: 'Новая ситуация: чего нужно учителю',
    frameEn: 'Do you know what he ___?',
    correctWord: 'needs',
    distractors: ['need', 'needing'],
    hint: 'Во второй части — subject + глагол без do.',
  },
}

function buildEmbeddedStep7Variants(variant: EmbeddedQuestionVariant) {
  const easySrc = variant.step3Variants[0]!
  const mediumSrc = variant.step3Variants[1]!
  const hardGap = EMBEDDED_STEP7_HARD[variant.id]
  if (!hardGap) {
    throw new Error(`Missing step7 hard gap for embedded variant ${variant.id}`)
  }

  return buildStep7ContrastVariants([
    {
      id: `${variant.id}_step7_easy`,
      difficulty: 'easy',
      situationRu: variant.introSituationRu,
      frameEn: extractFrameFromStep3Question(easySrc.question),
      correctWord: easySrc.correctAnswer,
      distractors: buildEmbeddedVerbDistractors(easySrc.correctAnswer),
      hint: easySrc.hint,
    },
    {
      id: `${variant.id}_step7_medium`,
      difficulty: 'medium',
      situationRu: variant.sourceSituations[1] ?? variant.introSituationRu,
      frameEn: extractFrameFromStep3Question(mediumSrc.question),
      correctWord: mediumSrc.correctAnswer,
      distractors: buildEmbeddedVerbDistractors(mediumSrc.correctAnswer),
      hint: mediumSrc.hint,
    },
    {
      id: `${variant.id}_step7_hard`,
      difficulty: 'hard',
      situationRu: hardGap.situationRu,
      frameEn: hardGap.frameEn,
      correctWord: hardGap.correctWord,
      distractors: hardGap.distractors,
      hint: hardGap.hint,
    },
  ])
}

function buildEmbeddedStep6Variants(variant: EmbeddedQuestionVariant) {
  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: variant.step6LightQuestion,
      correctAnswer: variant.step6LightAnswer,
      acceptedAnswers: variant.step6LightAcceptedAnswers ?? [variant.step6LightAnswer],
      hint: 'Одна фраза со встроенным вопросом: обычный порядок слов после where, what, when.',
      answerPolicy: 'normalized',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: variant.step6MediumQuestion,
      correctAnswer: variant.step6MediumAnswer,
      acceptedAnswers: variant.step6MediumAcceptedAnswers ?? [variant.step6MediumAnswer],
      hint: 'Сначала фраза со встроенным вопросом, потом короткий ответ.',
      answerPolicy: 'equivalent_variants',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: variant.step6CreativeQuestion,
      correctAnswer: variant.step6CreativeAnswer,
      acceptedAnswers: variant.step6CreativeAcceptedAnswers ?? [variant.step6CreativeAnswer],
      hint: 'Новая ситуация: тот же шаблон, другие слова во второй части.',
      answerPolicy: 'normalized',
    },
  ])
}

function buildEmbeddedSentencePuzzleVariants(variant: EmbeddedQuestionVariant): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  return [
    buildEmbeddedPuzzleVariant(
      `${variant.id}_puzzle_intro`,
      'Пазл 1/3: встроенный вопрос',
      variant.introCorrectSentence
    ),
    buildEmbeddedPuzzleVariant(
      `${variant.id}_puzzle_practice`,
      'Пазл 2/3: новая фраза',
      variant.step4Variants[0]?.correctAnswer ?? variant.introCorrectSentence
    ),
    buildEmbeddedPuzzleVariant(
      `${variant.id}_puzzle_check`,
      'Пазл 3/3: финальная сборка',
      variant.step6CorrectAnswer
    ),
  ]
}

function buildEmbeddedQuestionsFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content: 'Урок завершен. Теперь вы лучше чувствуете порядок слов во встроенных вопросах.',
      },
      {
        type: 'info',
        content: 'После do you know, tell me, can you say используйте вопросительное слово + подлежащее + глагол.',
      },
      {
        type: 'task',
        content: 'Нажмите «Далее» ниже — и выберите, как закрепить тему.',
      },
    ],
    footerDynamic: 'Урок завершен',
    myEngComment: 'Готово. Теперь what she likes уже звучит естественно.',
    postLesson: {
      ...embeddedQuestionsPostLesson,
      options: embeddedQuestionsPostLesson.options.map((option) => ({ ...option })),
    },
  }
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
          content: 'Во второй части порядок слов обычно такой же, как в обычном предложении: what she likes, where he lives.',
        },
        {
          type: 'task',
          content: `Выберите правильную фразу для ситуации: ${formatQuotedSituationForTask(variant.introSituationRu)}`,
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
      footerDynamic: 'Правило: вопросительное слово + подлежащее + глагол',
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
          content: `${variant.theoryRuleRu} ${variant.theoryContrastRu}`,
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
        hint: 'После вводной фразы внутри второй части оставляем подлежащее + глагол.',
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
          content: 'Пример: "I do not know where Tom works."',
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
          content: 'Пример: "Can you say where the bank is?"',
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
          content: 'Теперь соберите порядок слов руками: без лишней инверсии внутри второй части.',
        },
        {
          type: 'info',
          content: 'Будет три коротких пазла со встроенными вопросами.',
        },
        {
          type: 'task',
          content: 'Расставьте слова в правильном порядке.',
        },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите три фразы из слов.',
        correctAnswer: variant.step6CorrectAnswer,
        acceptedAnswers: [variant.step6CorrectAnswer],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка про первое слово: во второй части используйте обычный порядок слов: вопросительное слово + подлежащее + глагол.',
        bonusXp: 30,
        puzzleVariants: buildEmbeddedSentencePuzzleVariants(variant),
      },
      footerDynamic: 'Пазл: порядок слов во встроенном вопросе',
      myEngComment: 'Соберите фразу — и правило станет заметнее.',
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
          content: 'Одна фраза, затем мини-диалог, в конце — новая лексика в том же шаблоне.',
        },
        {
          type: 'task',
          content: variant.step6LightQuestion.replace(/^Переведите на английский:\s*/u, ''),
        },
      ],
      exercise: (() => {
        const step6Variants = buildEmbeddedStep6Variants(variant)
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
          content: 'Быстрый финиш: три глагола во встроенных частях.',
        },
        {
          type: 'info',
          content: 'В каждой рамке одно слово — обычный порядок слов во встроенной части.',
        },
        {
          type: 'task',
          content: 'Выберите одно слово для пропуска в английской рамке.',
        },
      ],
      exercise: (() => {
        const step7Variants = buildEmbeddedStep7Variants(variant)
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

const baseVariant = embeddedQuestionVariants[0]

export const embeddedQuestionsLesson: LessonData = {
  id: '3',
  topic: 'I know what she likes',
  level: 'A2',
  intro: {
    topic: 'Встроенные вопросы',
    kind: 'structure',
    complexity: 'medium',
    quick: {
      why: [
        'Встроенные вопросы нужны, когда вопрос встроен внутрь другой фразы.',
        'Мы говорим мягче: не просто What does she like?, а I know what she likes.',
        'Главный смысл: внутри второй части порядок слов становится обычным.',
      ],
      how: [
        'Шаблон: вводная фраза + вопросительное слово + подлежащее + глагол.',
        'Правильно: I know what she likes.',
        'Ошибка: I know what does she like.',
      ],
      examples: [
        { en: 'I know what she likes.', ru: 'Я знаю, что ей нравится.', note: 'what + she + likes' },
        { en: 'Do you know what she likes?', ru: 'Ты знаешь, что ей нравится?', note: 'без does внутри второй части' },
        { en: 'Tell me where the station is.', ru: 'Скажи мне, где станция.', note: 'обычный порядок слов' },
      ],
      takeaway: 'Думай так: первая часть задает вопрос, а внутри второй части порядок как в утверждении.',
    },
    details: {
      points: [
        'В прямом вопросе есть перестановка: What does she like?',
        'Во встроенном вопросе перестановка исчезает: what she likes.',
        'Does нужен только в первой части, если она сама вопрос: Do you know...?',
      ],
      examples: [
        { en: 'Can you say when the lesson starts?', ru: 'Можешь сказать, когда начинается урок?', note: 'when + lesson + starts' },
        { en: 'I know what Anna likes.', ru: 'Я знаю, что нравится Анне.', note: 'what + Anna + likes' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'I know what does she like.',
        'Do you know what does she like?',
        'Tell me where is the station.',
      ],
      contrastNotes: ['What does she like? = прямой вопрос.', 'I know what she likes. = встроенный вопрос.'],
      selfCheckRule: 'Если перед вопросительным словом уже есть вводная фраза, после него ставь подлежащее + глагол.',
    },
    learningPlan: {
      grammarFocus: ['встроенные вопросы', 'вопросительное слово + подлежащее + глагол'],
      firstPracticeGoal: 'Убрать лишнюю инверсию внутри встроенного вопроса.',
    },
  },
  variantId: baseVariant.id,
  finale: buildEmbeddedQuestionsFinale(),
  repeatConfig: {
    ruleSummary:
      'После do you know, tell me, can you say и I do not know во второй части используем обычный порядок слов: вопросительное слово + подлежащее + глагол.',
    grammarFocus: [
      'Do you know what she likes',
      'Tell me where the station is',
      'question word subject verb',
    ],
    sourceSituations: Array.from(new Set(embeddedQuestionVariants.flatMap((variant) => variant.sourceSituations))),
    stepBlueprints: buildEmbeddedQuestionBlueprints(baseVariant),
    variantProfiles: embeddedQuestionVariants.map((variant) => buildEmbeddedQuestionVariantProfile(variant)),
    antiRepeatWindow: 3,
    bannedTerms: ['if', 'whether', 'past simple', 'present continuous', 'future perfect', 'conditionals', 'passive'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildEmbeddedQuestionSteps(baseVariant),
}
