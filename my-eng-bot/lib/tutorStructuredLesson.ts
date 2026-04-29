import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'
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

function buildPuzzleVariants(topic: string): [SentencePuzzleVariant, SentencePuzzleVariant, SentencePuzzleVariant] {
  const safeTopic = sanitizeTopic(topic)
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

export function buildTutorStructuredLesson(params: {
  id: string
  topic: string
  level: LevelId
  blueprint: LessonBlueprint
}): LessonData {
  const topic = sanitizeTopic(params.topic)
  const intro = params.blueprint.intro ?? buildFallbackLessonIntro(topic)
  const grammarFocus = params.blueprint.adaptiveTemplate?.grammarFocus ?? intro.learningPlan?.grammarFocus ?? [topic]
  const focusLabel = grammarFocus.join(' / ')
  const steps: LessonStep[] = [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        { type: 'positive', content: 'Начнем с узнавания темы в контексте.' },
        { type: 'info', content: `Сегодня фокус: ${focusLabel}.` },
        { type: 'task', content: 'Выберите, какая тема сейчас тренируется.' },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какая тема урока?',
        options: [topic, 'Past Simple only', 'Articles a/an/the only'],
        correctAnswer: topic,
        acceptedAnswers: [topic],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Выберите тему, которую вы указали Репетитору.',
      },
      footerDynamic: `Репетитор: ${topic}`,
      myEngComment: 'Сначала закрепим фокус урока.',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        { type: 'positive', content: 'Теперь отделим смысл от формы.' },
        { type: 'info', content: intro.quick.takeaway },
        { type: 'task', content: 'Что важнее всего сделать перед практикой?' },
      ],
      exercise: {
        type: 'micro_quiz',
        question: 'Выберите лучший первый шаг.',
        options: ['Понять ситуацию правила', 'Выучить все исключения сразу', 'Игнорировать примеры'],
        correctAnswer: 'Понять ситуацию правила',
        acceptedAnswers: ['Понять ситуацию правила'],
        answerFormat: 'choice',
        answerPolicy: 'strict',
        hint: 'Сначала смысл, потом детали.',
      },
      footerDynamic: 'Сначала смысл, потом форма',
      myEngComment: 'Это делает сложную тему управляемой.',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        { type: 'positive', content: 'Переходим к короткой фразе.' },
        { type: 'info', content: 'В учебной практике лучше начинать с простого действия.' },
        { type: 'task', content: 'Дополните одним словом.' },
      ],
      exercise: {
        type: 'fill_text',
        question: 'Дополните одним словом: "We ___ short examples."',
        correctAnswer: 'practice',
        acceptedAnswers: ['practice'],
        answerFormat: 'single_word',
        answerPolicy: 'strict',
        hint: 'Нужно слово "тренируем".',
        variants: [
          {
            id: 'tutor-step3-practice',
            question: 'Дополните одним словом: "We ___ short examples."',
            correctAnswer: 'practice',
            hint: 'Нужно слово "тренируем".',
            difficulty: 'easy',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
          {
            id: 'tutor-step3-use',
            question: 'Дополните одним словом: "I ___ the rule in context."',
            correctAnswer: 'use',
            hint: 'Нужно слово "использую".',
            difficulty: 'medium',
            answerFormat: 'single_word',
            answerPolicy: 'strict',
          },
        ],
      },
      footerDynamic: 'Тренируем короткую фразу',
      myEngComment: 'Короткий ответ помогает не перегрузиться.',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        { type: 'positive', content: 'Теперь переведем смысл целиком.' },
        { type: 'info', content: `Держите фокус на теме: ${topic}.` },
        { type: 'task', content: 'Переведите короткую фразу на английский.' },
      ],
      exercise: {
        type: 'translate',
        question: 'Переведите на английский: "Я понимаю это правило."',
        correctAnswer: 'I understand this rule.',
        acceptedAnswers: ['I understand this rule'],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: 'Начните с I understand.',
        variants: [
          {
            id: 'tutor-step4-understand',
            question: 'Переведите на английский: "Я понимаю это правило."',
            correctAnswer: 'I understand this rule.',
            acceptedAnswers: ['I understand this rule'],
            hint: 'Начните с I understand.',
            difficulty: 'easy',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
          {
            id: 'tutor-step4-context',
            question: 'Переведите на английский: "Я использую это в контексте."',
            correctAnswer: 'I use this in context.',
            acceptedAnswers: ['I use it in context.'],
            hint: 'Начните с I use.',
            difficulty: 'medium',
            answerFormat: 'full_sentence',
            answerPolicy: 'normalized',
          },
        ],
      },
      footerDynamic: 'Переводим коротко и точно',
      myEngComment: 'Перевод проверяет, держится ли смысл.',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        { type: 'positive', content: 'Соберем несколько фраз руками.' },
        { type: 'info', content: 'Порядок слов помогает почувствовать английский шаблон.' },
        { type: 'task', content: 'Соберите предложения в пазле.' },
      ],
      exercise: {
        type: 'sentence_puzzle',
        question: 'Соберите предложение.',
        correctAnswer: 'I understand the pattern.',
        answerFormat: 'full_sentence',
        answerPolicy: 'strict',
        puzzleVariants: buildPuzzleVariants(topic),
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
        { type: 'info', content: 'Можно написать простое предложение: главное — не усложнять.' },
        { type: 'task', content: 'Напишите фразу по образцу.' },
      ],
      exercise: {
        type: 'write_own',
        question: 'Напишите на английском: "Я могу использовать это правило."',
        correctAnswer: 'I can use this rule.',
        acceptedAnswers: ['I can use this rule'],
        answerFormat: 'full_sentence',
        answerPolicy: 'normalized',
        hint: 'Начните с I can use.',
      },
      footerDynamic: 'Применяем правило',
      myEngComment: 'Своя фраза — первый шаг к речи.',
    },
    {
      stepNumber: 7,
      stepType: 'feedback',
      bubbles: [
        { type: 'positive', content: 'Финальная проверка: что главное?' },
        { type: 'info', content: 'Хорошее правило всегда связано с понятной ситуацией.' },
        { type: 'task', content: 'Выберите лучший вывод.' },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Как лучше работать с новой темой?',
        options: ['Понять смысл и потренировать коротко', 'Сразу учить все исключения', 'Не смотреть на примеры'],
        correctAnswer: 'Понять смысл и потренировать коротко',
        acceptedAnswers: ['Понять смысл и потренировать коротко'],
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
    steps,
    finale: buildTutorFinale(topic),
  }
}
