import { DEFAULT_POST_LESSON_OPTIONS } from '@/lib/postLessonDefaults'
import { EMBEDDED_QUESTIONS_CHALLENGE_ATOMS } from '@/lib/lessons/embeddedQuestionsChallengeAtoms'
import {
  EMBEDDED_QUESTIONS_REFERENCE_SCENARIOS,
  EMBEDDED_QUESTIONS_SESSION_SCENARIOS,
  EMBEDDED_QUESTIONS_SESSION_STEP_MAPS,
} from '@/lib/lessons/embeddedQuestionsSessionScenarios'
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
      'Сравните: прямой вопрос - "What does she like?", а во встроенной части - "what she likes".',
    step3Variants: [
      {
        id: 'home-lives_step3_easy',
        question: 'Дополните одним словом: "I know what she ___."',
        correctAnswer: 'likes',
        hint: 'После she - глагол с -s, без does перед she.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'home-lives_step3_medium',
        question: "Дополните одним словом: \"I don't know where he ___.\"",
        correctAnswer: 'lives',
        hint: '«Где» - where. После he - глагол с -s, без does перед he.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'home-lives_step3_hard',
        question: 'Дополните одним словом: "Tell me where the station ___."',
        correctAnswer: 'is',
        hint: '«Где» - where. После the station - be-форма, не переставляй слова.',
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
        hint: '«Что» - what. Начни с I know, потом she + глагол с -s, без does.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'home-lives_step4_medium',
        question: 'Переведите на английский: "Ты знаешь, что ей нравится?"',
        correctAnswer: 'Do you know what she likes?',
        hint: '«Что» - what. Do you know, потом she + глагол с -s, без does.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'home-lives_step4_hard',
        question: 'Переведите на английский: "Скажи мне, где находится станция."',
        correctAnswer: 'Tell me where the station is.',
        hint: '«Где» - where. Tell me, потом the station + be-форма.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, где живет Алекс? Он живет рядом с парком."',
    step5CorrectAnswer: 'Do you know where Alex lives? He lives near the park.',
    step5AcceptedAnswers: ['Do you know where Alex lives? Alex lives near the park.'],
    step6LightQuestion: 'Переведите на английский: "Я знаю, кто он."',
    step6LightAnswer: 'I know who he is.',
    step6LightAcceptedAnswers: ['I know who he is'],
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
      'Я знаю, кто он.',
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
      'Сравните: прямой вопрос - "When does the film start?", а во встроенной части - "when the film starts".',
    step3Variants: [
      {
        id: 'music-likes_step3_easy',
        question: 'Дополните одним словом: "Do you know what she ___?"',
        correctAnswer: 'likes',
        hint: 'После she - глагол с -s, без does.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'music-likes_step3_medium',
        question: 'Дополните одним словом: "Can you say when the film ___?"',
        correctAnswer: 'starts',
        hint: '«Когда» - when. После the film - глагол с -s.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'music-likes_step3_hard',
        question: 'Дополните одним словом: "I do not know where he ___."',
        correctAnswer: 'works',
        hint: '«Где» - where. После he - глагол с -s, без does.',
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
        hint: '«Что» - what. Do you know, потом she + глагол с -s, без does.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'music-likes_step4_medium',
        question: 'Переведите на английский: "Я не знаю, где он работает."',
        correctAnswer: "I don't know where he works.",
        acceptedAnswers: ['I do not know where he works.'],
        hint: '«Где» - where. I don\'t know, потом he + глагол с -s, без does.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'music-likes_step4_hard',
        question: 'Переведите на английский: "Скажи, когда начинается фильм."',
        correctAnswer: 'Can you say when the film starts?',
        hint: '«Когда» - when. Can you say, потом the film + глагол с -s.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, что любит Оля? Она любит джаз."',
    step5CorrectAnswer: 'Do you know what Olya likes? She likes jazz.',
    step5AcceptedAnswers: ['Do you know what Olya likes? Olya likes jazz.'],
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
      'Сравните: прямой вопрос - "Where is the cafe?", а во встроенной части - "where the cafe is".',
    step3Variants: [
      {
        id: 'lesson-starts_step3_easy',
        question: 'Дополните одним словом: "Can you say when the lesson ___?"',
        correctAnswer: 'starts',
        hint: '«Когда» - when. После the lesson - глагол с -s.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'lesson-starts_step3_medium',
        question: 'Дополните одним словом: "Tell me where the cafe ___."',
        correctAnswer: 'is',
        hint: '«Где» - where. После the cafe - be-форма, не переставляй слова.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'lesson-starts_step3_hard',
        question: "Дополните одним словом: \"I don't know what she ___.\"",
        correctAnswer: 'wants',
        hint: '«Чего» - what. После she - глагол с -s, без does.',
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
        hint: '«Когда» - when. Can you say, потом the lesson + глагол с -s.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'lesson-starts_step4_medium',
        question: 'Переведите на английский: "Скажи мне, где находится кафе."',
        correctAnswer: 'Tell me where the cafe is.',
        hint: '«Где» - where. Tell me, потом the station + be-форма.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'lesson-starts_step4_hard',
        question: 'Переведите на английский: "Я не знаю, чего она хочет."',
        correctAnswer: "I don't know what she wants.",
        acceptedAnswers: ['I do not know what she wants.'],
        hint: '«Чего» - what. I don\'t know, потом she + глагол с -s, без does.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Ты знаешь, когда начинается фильм? Он начинается в семь."',
    step5CorrectAnswer: 'Do you know when the film starts? It starts at seven.',
    step5AcceptedAnswers: ['Do you know when the film starts? The film starts at seven.'],
    step6LightQuestion: 'Переведите на английский: "Я не знаю, чего она хочет."',
    step6LightAnswer: "I don't know what she wants.",
    step6LightAcceptedAnswers: ['I do not know what she wants.'],
    step6MediumQuestion: 'Переведите на английский: "Ты знаешь, когда начинается фильм? Он начинается в семь."',
    step6MediumAnswer: 'Do you know when the film starts? It starts at seven.',
    step6MediumAcceptedAnswers: ['Do you know when the film starts? The film starts at seven.'],
    step6CreativeQuestion: 'Переведите на английский: "Ты знаешь, чего хочет учитель?"',
    step6CreativeAnswer: 'Do you know what the teacher wants?',
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
      'Сравните: прямой вопрос - "When do they start?", а во встроенной части - "when they start".',
    step3Variants: [
      {
        id: 'station-is_step3_easy',
        question: 'Дополните одним словом: "Tell me where the station ___."',
        correctAnswer: 'is',
        hint: '«Где» - where. После the station - be-форма.',
        difficulty: 'easy',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'station-is_step3_medium',
        question: "Дополните одним словом: \"I don't know when they ___.\"",
        correctAnswer: 'start',
        hint: '«Когда» - when. После they - глагол без -s и без do.',
        difficulty: 'medium',
        answerFormat: 'single_word',
        answerPolicy: 'strict',
      },
      {
        id: 'station-is_step3_hard',
        question: 'Дополните одним словом: "Do you know what he ___?"',
        correctAnswer: 'needs',
        hint: '«Что» - what. После he - глагол с -s, без does.',
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
        hint: '«Где» - where. Tell me, потом the station + be-форма.',
        difficulty: 'easy',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'station-is_step4_medium',
        question: 'Переведите на английский: "Я не знаю, когда они начинают."',
        correctAnswer: "I don't know when they start.",
        acceptedAnswers: ['I do not know when they start.'],
        hint: 'В задании «когда» - это when, не where. После they - глагол без -s и без do.',
        difficulty: 'medium',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
      {
        id: 'station-is_step4_hard',
        question: 'Переведите на английский: "Ты знаешь, что ему нужно?"',
        correctAnswer: 'Do you know what he needs?',
        hint: '«Что» - what. Do you know, потом he + глагол с -s, без does.',
        difficulty: 'hard',
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
      },
    ],
    step5TaskRu: 'Переведите на английский: "Скажи мне, где находится музей. Он рядом со школой."',
    step5CorrectAnswer: 'Tell me where the museum is. It is near the school.',
    step5AcceptedAnswers: ['Tell me where the museum is. The museum is near the school.'],
    step6LightQuestion: 'Переведите на английский: "Скажи мне, где находится парк."',
    step6LightAnswer: 'Tell me where the park is.',
    step6MediumQuestion: 'Переведите на английский: "Скажи мне, где находится музей. Он рядом со школой."',
    step6MediumAnswer: 'Tell me where the museum is. It is near the school.',
    step6MediumAcceptedAnswers: ['Tell me where the museum is. The museum is near the school.'],
    step6CreativeQuestion: 'Переведите на английский: "Ты знаешь, что нужно медсестре?"',
    step6CreativeAnswer: 'Do you know what the nurse needs?',
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
  interestingFact:
    'Во встроенном вопросе обычный порядок: what she likes, where he lives, where the station is.',
  options: DEFAULT_POST_LESSON_OPTIONS,
} as const

function extractWhWord(text: string): string {
  const match = text.match(/\b(where|what|when|who)\b/i)
  return match?.[1]?.toLowerCase() ?? 'where'
}

function buildEmbeddedQuestionBlueprints(variant: EmbeddedQuestionVariant): LessonRepeatStepBlueprint[] {
  const step6LightHasQuestionMark = variant.step6LightAnswer.includes('?')
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
        mustAvoid: ['if', 'whether', 'past simple', 'how to', 'how-to'],
        hintShouldMention: ['when', 'where', 'what', 'who', 'does'],
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
        mustAvoid: ['if', 'whether', 'future perfect', 'how to', 'how-to'],
        hintShouldMention: ['when', 'where', 'what', 'who', 'does'],
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
        mustAvoid: ['if', 'whether', 'present continuous', 'how to', 'how-to'],
        hintShouldMention: ['when', 'where', 'what', 'who', '-s'],
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
        mustAvoid: ['if', 'whether', 'where does', 'how to', 'how-to'],
        hintShouldMention: ['когда', 'где', 'что', 'кто', 'when', 'where', 'what', 'who'],
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
      sourceCorrectAnswer: variant.step5CorrectAnswer,
      sourcePattern: 'word order puzzle for embedded questions',
      semanticAnchors: [variant.step5CorrectAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: [extractWhWord(variant.step5CorrectAnswer)],
        shouldInclude: ['пазл', 'порядок слов'],
        mustAvoid: ['if', 'whether', 'present continuous', 'how to', 'how-to'],
        hintShouldMention: ['when', 'where', 'what', 'who', 'порядок'],
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
      sourceCorrectAnswer: variant.step6LightAnswer,
      sourcePattern: 'lead phrase + wh-clause; optional mini-dialogue',
      semanticAnchors: [variant.step6LightAnswer.toLowerCase()],
      semanticExpectations: {
        pedagogicalRole: 'apply_in_new_situation',
        mustInclude: [
          extractWhWord(variant.step6LightAnswer),
          ...(step6LightHasQuestionMark ? ['?'] : []),
        ],
        shouldInclude: ['вопрос', 'ответ'],
        mustAvoid: ['if', 'whether', 'past simple', 'how to', 'how-to'],
        hintShouldMention: ['когда', 'где', 'что', 'кто', 'when', 'where', 'what', 'who'],
        requireCyrillicHint: true,
        requireQuestionMarkInAnswer: step6LightHasQuestionMark,
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
        mustAvoid: ['if', 'whether', 'present continuous', 'how to', 'how-to', 'how'],
        hintShouldMention: ['when', 'where', 'what', 'who', '-s'],
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
    errorText: 'Сначала вводная фраза, потом when/where/what/who + слова по порядку.',
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
    hint: '«Когда» - when. После the bus - глагол с -s.',
  },
  'music-likes': {
    situationRu: 'Новая ситуация: где он работает',
    frameEn: "I don't know where he ___.",
    correctWord: 'works',
    distractors: ['work', 'working'],
    hint: '«Где» - where. После he - глагол с -s, без does.',
  },
  'lesson-starts': {
    situationRu: 'Новая ситуация: чего она хочет',
    frameEn: "I don't know what she ___.",
    correctWord: 'wants',
    distractors: ['want', 'wanting'],
    hint: '«Чего» - what. После she - глагол с -s, без does.',
  },
  'station-is': {
    situationRu: 'Новая ситуация: чего нужно учителю',
    frameEn: 'Do you know what he ___?',
    correctWord: 'needs',
    distractors: ['need', 'needing'],
    hint: '«Что» - what. После he - глагол с -s, без does.',
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

function buildEmbeddedStep6Hint(question: string, multiSentence: boolean): string {
  const normalizedQuestion = question.toLowerCase()
  if (normalizedQuestion.includes('кто')) {
    return '«Кто» - who. После who - подлежащее и глагол (is), без does.'
  }
  if (normalizedQuestion.includes('когда')) {
    return multiSentence
      ? '«Когда» - when. Две фразы: вопрос и короткий ответ.'
      : '«Когда» - when. Сохрани порядок: when + слова без do перед they/he/she.'
  }
  if (normalizedQuestion.includes('где')) {
    return multiSentence
      ? '«Где» - where. Две фразы: вопрос и короткий ответ.'
      : '«Где» - where. После where - подлежащее и глагол, без перестановки.'
  }
  if (normalizedQuestion.includes('что') || normalizedQuestion.includes('чего')) {
    return '«Что/чего» - what. После what - подлежащее и глагол, без does.'
  }
  return 'Сохрани шаблон: вводная фраза + when/where/what/who + слова по порядку.'
}

function buildEmbeddedStep6Variants(variant: EmbeddedQuestionVariant) {
  return buildStep6ExamVariants([
    {
      id: `${variant.id}_step6_easy`,
      difficulty: 'easy',
      question: variant.step6LightQuestion,
      correctAnswer: variant.step6LightAnswer,
      acceptedAnswers: variant.step6LightAcceptedAnswers ?? [variant.step6LightAnswer],
      hint: buildEmbeddedStep6Hint(variant.step6LightQuestion, false),
      answerPolicy: 'normalized',
    },
    {
      id: `${variant.id}_step6_medium`,
      difficulty: 'medium',
      question: variant.step6MediumQuestion,
      correctAnswer: variant.step6MediumAnswer,
      acceptedAnswers: variant.step6MediumAcceptedAnswers ?? [variant.step6MediumAnswer],
      hint: buildEmbeddedStep6Hint(variant.step6MediumQuestion, true),
      answerPolicy: 'equivalent_variants',
    },
    {
      id: `${variant.id}_step6_hard`,
      difficulty: 'hard',
      question: variant.step6CreativeQuestion,
      correctAnswer: variant.step6CreativeAnswer,
      acceptedAnswers: variant.step6CreativeAcceptedAnswers ?? [variant.step6CreativeAnswer],
      hint: buildEmbeddedStep6Hint(variant.step6CreativeQuestion, false),
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
      variant.step5CorrectAnswer
    ),
  ]
}

function buildEmbeddedQuestionsFinale(): LessonFinale {
  return {
    bubbles: [
      {
        type: 'positive',
        content:
          'Готово! Встроенные вопросы - ваши. Дальше - практика и кубок 🏆.',
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
        hint: 'Во встроенной части: what/where/when + слова по порядку, без does/is перед he/she.',
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
        hint: 'После do you know / tell me: what/where/when + he/she + глагол, без does.',
      },
      footerDynamic: 'Теория: обычный порядок внутри второй части',
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
          content: 'Теперь соберите порядок слов руками: обычный порядок слов во второй части.',
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
        correctAnswer: variant.step5CorrectAnswer,
        acceptedAnswers: [variant.step5CorrectAnswer, ...variant.step5AcceptedAnswers],
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        hint: 'Подсказка: начни с вводной фразы, потом when/where/what/who + слова по порядку.',
        bonusXp: 30,
        puzzleVariants: buildEmbeddedSentencePuzzleVariants(variant),
      },
      footerDynamic: 'Пазл: порядок слов во встроенном вопросе',
      myEngComment: 'Соберите фразу - и правило станет заметнее.',
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
          content: 'Одна фраза, затем мини-диалог, в конце - новая лексика в том же шаблоне.',
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
      myEngComment: 'Три фразы подряд - вы почти у финиша.',
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
          content: 'В каждой рамке одно слово - обычный порядок слов во встроенной части.',
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
    topic: 'I know what she likes',
    kind: 'structure',
    complexity: 'medium',
    quick: {
      why: [
        'Вопрос можно спрятать внутрь другой фразы: I know what she likes.',
        'Внутри после what/where/when порядок обычный — как в утверждении.',
        'Прямой вопрос (What does she like?) внутрь не тащим.',
      ],
      how: [
        'I know / Tell me + обычный порядок → I know what she likes.',
        'Do you know + обычный порядок → Do you know what she likes?',
        'Прямой вопрос отдельно → What does she like?',
      ],
      examples: [
        {
          en: 'I know what she likes.',
          ru: 'Я знаю, что ей нравится.',
          note: 'Вопрос спрятан внутри обычной фразы',
        },
        {
          en: 'Do you know what she likes?',
          ru: 'Ты знаешь, что ей нравится?',
          note: 'Снаружи вопрос, внутри без перестановки',
        },
        {
          en: 'Tell me where the station is.',
          ru: 'Скажи, где станция.',
          note: 'То же с where — слова в обычном порядке',
        },
      ],
      takeaway:
        'Снаружи своя фраза; внутри после what/where — обычный порядок слов, не прямой вопрос.',
    },
    details: {
      points: [
        'Прямой вопрос: What does she like?',
        'Встроенный: what she likes — без does внутри.',
        'Do/Does только снаружи, если вводная сама вопрос: Do you know…?',
      ],
      examples: [
        {
          en: 'Can you say when the lesson starts?',
          ru: 'Можешь сказать, когда начинается урок?',
          note: 'when + lesson + starts',
        },
        { en: 'I know what Anna likes.', ru: 'Я знаю, что нравится Анне.', note: 'what + Anna + likes' },
        { en: 'Do you know where he lives?', ru: 'Ты знаешь, где он живёт?', note: 'where + he + lives' },
      ],
    },
    deepDive: {
      commonMistakes: [
        'Не I know what does she like — а I know what she likes.',
        'Не Do you know what does she like? — а Do you know what she likes?',
        'Не Tell me where is the station — а Tell me where the station is.',
      ],
      contrastNotes: [
        'What does she like? — прямой вопрос.',
        'I know what she likes. — встроенный.',
        'Do you know what she likes? — вопрос снаружи, внутри обычный порядок.',
      ],
      selfCheckRule:
        'Хочешь сказать «я знаю / скажи мне / ты знаешь…» и дальше смысл вопроса — внутри ставь обычный порядок: I know what she likes. Не переспрашивай внутри через does.',
    },
    learningPlan: {
      grammarFocus: ['встроенные вопросы', 'вопросительное слово + подлежащее + глагол', 'I know who he is'],
      firstPracticeGoal:
        'Скажи 3 фразы: I know what she likes. / Do you know what she likes? / Tell me where the station is.',
    },
  },
  variantId: baseVariant.id,
  finale: buildEmbeddedQuestionsFinale(),
  repeatConfig: {
    ruleSummary:
      'После I know / Tell me / Do you know внутри: what/where/when + кто/что + глагол.',
    grammarFocus: [
      'Do you know what she likes',
      'Tell me where the station is',
      'I know who he is',
      'question word subject verb',
    ],
    sourceSituations: Array.from(new Set(embeddedQuestionVariants.flatMap((variant) => variant.sourceSituations))),
    sessionScenarios: { ...EMBEDDED_QUESTIONS_SESSION_SCENARIOS },
    sessionStepMaps: {
      relaxed: [...EMBEDDED_QUESTIONS_SESSION_STEP_MAPS.relaxed],
      balanced: [...EMBEDDED_QUESTIONS_SESSION_STEP_MAPS.balanced],
    },
    referenceScenariosByType: { ...EMBEDDED_QUESTIONS_REFERENCE_SCENARIOS },
    challengeAtoms: [...EMBEDDED_QUESTIONS_CHALLENGE_ATOMS],
    stepBlueprints: buildEmbeddedQuestionBlueprints(baseVariant),
    variantProfiles: embeddedQuestionVariants.map((variant) => buildEmbeddedQuestionVariantProfile(variant)),
    antiRepeatWindow: 3,
    bannedTerms: ['if', 'whether', 'past simple', 'present continuous', 'future perfect', 'conditionals', 'passive', 'how to', 'how-to'],
    qualityGate: {
      minScore: 0.6,
      maxSoftIssues: 4,
      rejectOnHardFailures: true,
      maxAllowedHardIssues: 2,
    },
  },
  steps: buildEmbeddedQuestionSteps(baseVariant),
}
