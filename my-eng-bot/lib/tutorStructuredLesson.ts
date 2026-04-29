import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'
import { buildFallbackTutorLearningIntent, type TutorLearningIntent, type TutorLearningIntentExample } from '@/lib/tutorLearningIntent'
import type { LevelId } from '@/lib/types'
import type { LessonData, LessonFinale, LessonStep, SentencePuzzleVariant } from '@/types/lesson'

function createLessonRunKey(): string {
  return `tutor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeLessonLevel(level: LevelId): LessonData['level'] {
  if (level === 'a1' || level === 'starter') return 'A1'
  if (level === 'b1') return 'B1'
  if (level === 'b2') return 'B2'
  if (level === 'c1' || level === 'c2') return 'C1'
  return 'A2'
}

function sanitizeTopic(topic: string): string {
  return topic.replace(/\s+/g, ' ').trim() || 'English grammar'
}

function normalizeSentenceWords(sentence: string): string[] {
  return sentence
    .replace(/([?.!])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function getIntentExamples(intent: TutorLearningIntent): [TutorLearningIntentExample, TutorLearningIntentExample, TutorLearningIntentExample] {
  const fallback = buildFallbackTutorLearningIntent(intent.title).examples
  const examples = [...intent.examples, ...fallback]
  return [examples[0], examples[1], examples[2]]
}

function buildCloze(example: TutorLearningIntentExample): { question: string; correctAnswer: string; hint: string } {
  const words = example.en.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const blankIndex = words.length >= 3 ? 1 : 0
  const rawAnswer = words[blankIndex] ?? example.en
  const correctAnswer = rawAnswer.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '') || rawAnswer
  const questionWords = words.map((word, index) => (index === blankIndex ? word.replace(/[A-Za-z']+/, '___') : word))
  return {
    question: `Дополните одним словом: "${questionWords.join(' ')}"`,
    correctAnswer,
    hint: example.noteRu,
  }
}

function buildPuzzleVariants(topic: string, intent?: TutorLearningIntent): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  const safeTopic = sanitizeTopic(topic)
  if (intent) {
    const examples = getIntentExamples(intent)
    return examples.map((example, index) => {
      const words = normalizeSentenceWords(example.en)
      return {
        id: `tutor-puzzle-intent-${index + 1}`,
        title: index === 0 ? 'Соберите главный шаблон' : 'Соберите пример',
        instruction: 'Поставьте слова в правильном порядке.',
        words,
        correctOrder: words,
        correctAnswer: example.en,
        successText: 'Верно, смысл темы сохранился.',
        errorText: 'Проверьте порядок слов в английском шаблоне.',
        hintText: example.noteRu,
        hintFirstWord: words[0],
        myEngComment: example.noteRu,
      }
    }) as [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant]
  }
  return [
    {
      id: 'tutor-puzzle-pattern',
      title: 'Соберите мысль',
      instruction: 'Поставьте слова в правильном порядке.',
      words: ['I', 'understand', 'the', 'pattern'],
      correctOrder: ['I', 'understand', 'the', 'pattern'],
      correctAnswer: 'I understand the pattern.',
      successText: 'Отлично, шаблон собран.',
      errorText: 'Проверьте порядок: сначала I, потом действие.',
      hintText: 'Первое слово: I.',
      hintFirstWord: 'I',
      myEngComment: `Шаблон помогает не потеряться в теме ${safeTopic}.`,
    },
    {
      id: 'tutor-puzzle-practice',
      title: 'Соберите практику',
      instruction: 'Соберите короткую фразу для тренировки.',
      words: ['We', 'practice', 'short', 'examples'],
      correctOrder: ['We', 'practice', 'short', 'examples'],
      correctAnswer: 'We practice short examples.',
      successText: 'Да, короткие примеры держат фокус.',
      errorText: 'Начните с We practice.',
      hintText: 'Первое слово: We.',
      hintFirstWord: 'We',
      myEngComment: 'Практика идет от короткого к более свободному.',
    },
    {
      id: 'tutor-puzzle-rule',
      title: 'Соберите проверку',
      instruction: 'Соберите фразу для самопроверки.',
      words: ['This', 'rule', 'has', 'a', 'clear', 'use'],
      correctOrder: ['This', 'rule', 'has', 'a', 'clear', 'use'],
      correctAnswer: 'This rule has a clear use.',
      successText: 'Верно: у правила должна быть понятная задача.',
      errorText: 'Начните с This rule.',
      hintText: 'Первое слово: This.',
      hintFirstWord: 'This',
      myEngComment: 'Если понятна задача правила, дальше легче.',
    },
  ]
}

function buildTutorFinale(topic: string): LessonFinale {
  const safeTopic = sanitizeTopic(topic)
  return {
    bubbles: [
      {
        type: 'positive',
        content: 'Готово. Вы прошли короткий урок от Репетитора.',
      },
      {
        type: 'info',
        content: `Тема: ${safeTopic}. Главное — понимать, зачем правило нужно, и узнавать его в коротких фразах.`,
      },
      {
        type: 'task',
        content: 'Выберите, что сделать дальше.',
      },
    ],
    footerDynamic: 'Урок Репетитора завершен',
    myEngComment: 'Хорошая база. Можно повторить или перейти в практику.',
    postLesson: {
      dynamicFooterText: 'Выбор за вами! Любое действие закрепит материал',
      staticFooterText: '🏆 +50 XP | 🔥 COMBO x7! | 📈 [████████] 7/7',
      interestingFact: `Раздел с фишками по теме ${safeTopic} появится следующим этапом.`,
      options: [
        { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
        { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
        { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
        { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
      ],
    },
  }
}

function buildOpeningStep(params: {
  topic: string
  tutorIntent: TutorLearningIntent
  focusLabel: string
  firstExample: TutorLearningIntentExample
}): LessonStep {
  const { topic, tutorIntent, focusLabel, firstExample } = params
  const correctAnswer = tutorIntent.firstPracticeGoalRu
  const distractorsByType: Record<TutorLearningIntent['intentType'], [string, string]> = {
    single_rule: ['Выучить название правила без примеров', 'Перевести русскую фразу дословно'],
    contrast: ['Считать обе формы полностью одинаковыми', 'Выбирать форму только по русскому переводу'],
    phrase_pattern: ['Менять порядок слов как в русском', 'Учить отдельные слова без шаблона'],
    form_practice: ['Оставить глагол в любой форме', 'Игнорировать маркер времени или подлежащее'],
    mistake_clinic: ['Запомнить ошибку как вариант нормы', 'Исправлять фразу без понимания причины'],
    short_examples: ['Начать с длинной таблицы исключений', 'Учить только название темы'],
    free_explanation: ['Сразу делать упражнение без смысла', 'Игнорировать вопрос ученика'],
  }
  const [firstDistractor, secondDistractor] = distractorsByType[tutorIntent.intentType]

  return {
    stepNumber: 1,
    stepType: 'hook',
    bubbles: [
      { type: 'positive', content: 'Начнём с главного смысла.' },
      { type: 'info', content: `Сегодня фокус: ${focusLabel}. ${tutorIntent.goalRu}` },
      { type: 'task', content: `${tutorIntent.coreQuestion} Пример: ${firstExample.en} — ${firstExample.ru}.` },
    ],
    exercise: {
      type: 'micro_quiz',
      question: 'Что сейчас важнее всего понять?',
      options: [correctAnswer, firstDistractor, secondDistractor],
      correctAnswer,
      acceptedAnswers: [correctAnswer],
      answerFormat: 'choice',
      answerPolicy: 'strict',
      hint: firstExample.noteRu || `Держим фокус: ${topic}.`,
    },
    footerDynamic: `Репетитор: ${topic}`,
    myEngComment: 'Сначала фиксируем смысл, потом тренируем форму.',
  }
}

export function buildTutorStructuredLesson(params: {
  id: string
  topic: string
  level: LevelId
  blueprint: LessonBlueprint
}): LessonData {
  const topic = sanitizeTopic(params.topic)
  const tutorIntent = params.blueprint.tutorIntent ?? buildFallbackTutorLearningIntent(topic)
  const intro = params.blueprint.intro ?? buildFallbackLessonIntro(topic)
  const grammarFocus = params.blueprint.adaptiveTemplate?.grammarFocus ?? intro.learningPlan?.grammarFocus ?? tutorIntent.mustTrain ?? [topic]
  const focusLabel = grammarFocus.join(' / ')
  const [firstExample, secondExample, thirdExample] = getIntentExamples(tutorIntent)
  const cloze = buildCloze(firstExample)
  const steps: LessonStep[] = [
    buildOpeningStep({ topic, tutorIntent, focusLabel, firstExample }),
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        { type: 'positive', content: 'Теперь отделим смысл от формы.' },
        { type: 'info', content: tutorIntent.goalRu || intro.quick.takeaway },
        { type: 'task', content: 'Что важнее всего сделать перед практикой?' },
      ],
      exercise: {
        type: 'micro_quiz',
        question: 'Выберите лучший первый шаг.',
        options: [tutorIntent.firstPracticeGoalRu, 'Выучить все исключения сразу', 'Игнорировать примеры'],
        correctAnswer: tutorIntent.firstPracticeGoalRu,
        acceptedAnswers: [tutorIntent.firstPracticeGoalRu],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Сначала смысл, потом детали.',
      },
      footerDynamic: 'Сначала смысл выбранной темы',
      myEngComment: 'Это делает сложную тему управляемой.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        { type: 'positive', content: 'Переходим к короткой фразе.' },
        { type: 'info', content: firstExample.noteRu },
        { type: 'task', content: 'Дополните одним словом.' },
      ],
      exercise: {
        type: 'fill_text',
        question: cloze.question,
        correctAnswer: cloze.correctAnswer,
        acceptedAnswers: [cloze.correctAnswer],
        answerFormat: 'single_word',
        answerPolicy: 'strict',
        hint: cloze.hint,
        variants: [
          {
            id: 'tutor-step3-practice',
            question: cloze.question,
            correctAnswer: cloze.correctAnswer,
            hint: cloze.hint,
            difficulty: 'easy',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: 'tutor-step3-use',
            question: buildCloze(secondExample).question,
            correctAnswer: buildCloze(secondExample).correctAnswer,
            hint: secondExample.noteRu,
            difficulty: 'medium',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
        ],
      },
      footerDynamic: `Тренируем: ${tutorIntent.targetPatterns[0] ?? topic}`,
      myEngComment: 'Короткий ответ помогает не перегрузиться.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        { type: 'positive', content: 'Теперь переведем смысл целиком.' },
        { type: 'info', content: secondExample.noteRu },
        { type: 'task', content: 'Переведите короткую фразу на английский.' },
      ],
      exercise: {
        type: 'translate',
        question: `Переведите на английский: "${secondExample.ru}"`,
        correctAnswer: secondExample.en,
        acceptedAnswers: [secondExample.en],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: secondExample.noteRu,
        variants: [
          {
            id: 'tutor-step4-understand',
            question: `Переведите на английский: "${secondExample.ru}"`,
            correctAnswer: secondExample.en,
            acceptedAnswers: [secondExample.en],
            hint: secondExample.noteRu,
            difficulty: 'easy',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
          {
            id: 'tutor-step4-context',
            question: `Переведите на английский: "${thirdExample.ru}"`,
            correctAnswer: thirdExample.en,
            acceptedAnswers: [thirdExample.en],
            hint: thirdExample.noteRu,
            difficulty: 'medium',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
        ],
      },
      footerDynamic: 'Переводим выбранный смысл',
      myEngComment: 'Перевод проверяет, держится ли смысл.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        { type: 'positive', content: 'Соберем несколько фраз руками.' },
        { type: 'info', content: `Шаблон: ${tutorIntent.targetPatterns[0] ?? topic}.` },
        { type: 'task', content: 'Соберите предложения в пазле.' },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите предложение.',
        correctAnswer: firstExample.en,
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        puzzleVariants: buildPuzzleVariants(topic, tutorIntent),
        bonusXp: 30,
        hint: 'Начните с подлежащего.',
      },
      footerDynamic: 'Пазл: порядок слов',
      myEngComment: 'Сборка фразы закрепляет шаблон.',
    },
    {
      stepNumber: 6,
      stepType: 'practice_apply',
      bubbles: [
        { type: 'positive', content: 'Теперь применим тему в своей фразе.' },
        { type: 'info', content: tutorIntent.firstPracticeGoalRu },
        { type: 'task', content: 'Напишите фразу по образцу.' },
      ],
      exercise: {
        type: 'write_own',
        question: `Напишите на английском: "${thirdExample.ru}"`,
        correctAnswer: thirdExample.en,
        acceptedAnswers: [thirdExample.en],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: `Используйте шаблон: ${tutorIntent.targetPatterns[0] ?? topic}.`,
      },
      footerDynamic: 'Применяем правило',
      myEngComment: 'Своя фраза — первый шаг к речи.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        { type: 'positive', content: 'Финальная проверка: что главное?' },
        { type: 'info', content: tutorIntent.firstPracticeGoalRu },
        { type: 'task', content: 'Выберите лучший вывод.' },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Как лучше работать с новой темой?',
        options: [tutorIntent.firstPracticeGoalRu, 'Сразу учить все исключения', 'Не смотреть на примеры'],
        correctAnswer: tutorIntent.firstPracticeGoalRu,
        acceptedAnswers: [tutorIntent.firstPracticeGoalRu],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Нужен путь от смысла к короткой практике.',
      },
      footerDynamic: 'Финальная проверка',
      myEngComment: 'Осталось закрепить главный подход.',
    },
  ]

  return {
    id: params.id,
    runKey: createLessonRunKey(),
    topic,
    level: normalizeLessonLevel(params.level),
    intro,
    tutorIntent,
    steps,
    finale: buildTutorFinale(topic),
  }
}
