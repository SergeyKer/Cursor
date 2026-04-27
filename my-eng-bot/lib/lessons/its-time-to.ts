import type { LessonData } from '@/types/lesson'

export const itsTimeToLesson: LessonData = {
  id: '1',
  topic: "Это / Пора",
  level: 'A2',
  repeatConfig: {
    ruleSummary: 'Различаем It is + прилагательное для состояния и It is time to + глагол для действия.',
    grammarFocus: ['It is + adjective', 'It is time to + verb'],
    sourceSituations: ['На улице темно', 'Пора спать', 'Холодно, пора пить чай', 'Пора идти домой'],
    stepBlueprints: [
      {
        stepNumber: 1,
        stepType: 'hook',
        learningGoal: 'Показать ситуацию, где нужно описать состояние через It is + adjective.',
        exerciseType: 'fill_choice',
        answerFormat: 'choice',
        sourceCorrectAnswer: "It's dark.",
        sourcePattern: "It's + adjective",
      },
      {
        stepNumber: 2,
        stepType: 'theory',
        learningGoal: 'Показать ситуацию, где нужно выбрать базовый глагол после It is time to.',
        exerciseType: 'fill_choice',
        answerFormat: 'choice',
        sourceCorrectAnswer: 'sleep',
        sourcePattern: 'It is time to + verb',
      },
      {
        stepNumber: 3,
        stepType: 'practice_fill',
        learningGoal: 'Сопоставить состояние и подходящее действие в короткой бытовой ситуации.',
        exerciseType: 'translate',
        answerFormat: 'single_word',
        sourceCorrectAnswer: 'drink',
        sourcePattern: 'It is + adjective. It is time to + verb + noun',
      },
      {
        stepNumber: 4,
        stepType: 'practice_fill',
        learningGoal: 'Закрепить описание состояния полным предложением.',
        exerciseType: 'translate',
        answerFormat: 'full_sentence',
        sourceCorrectAnswer: "It's dark.",
        sourcePattern: "It's + adjective",
      },
      {
        stepNumber: 5,
        stepType: 'practice_apply',
        learningGoal: 'Закрепить конструкцию It is time to + verb полным предложением.',
        exerciseType: 'translate',
        answerFormat: 'full_sentence',
        sourceCorrectAnswer: "It's time to go home.",
        sourcePattern: "It's time to + verb phrase",
      },
      {
        stepNumber: 6,
        stepType: 'feedback',
        learningGoal: 'Проверить, что пользователь различает состояние и действие в новой ситуации.',
        exerciseType: 'fill_choice',
        answerFormat: 'choice',
        sourceCorrectAnswer: "It's time to sleep.",
        sourcePattern: "It's time to + verb",
      },
    ],
  },
  steps: [
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
          content: 'Выберите правильное предложение для ситуации: "На улице темно".',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение подходит по смыслу?',
        options: ["It's dark.", "It's time to dark.", "It's dark to go."],
        correctAnswer: "It's dark.",
        hint: 'Для описания состояния используйте It is + прилагательное.',
      },
      footerDynamic: 'Правило 1: It is + прилагательное',
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Теперь посмотрим на вторую конструкцию: It is time to + глагол.',
        },
        {
          type: 'info',
          content: 'После time to используем начальную форму глагола: sleep, study, go, drink.',
        },
        {
          type: 'task',
          content: 'Выберите правильное завершение: "It is time to ___."',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Дополните предложение.',
        options: ['sleep', 'sleeps', 'sleeping'],
        correctAnswer: 'sleep',
        hint: 'После "to" нужен глагол в начальной форме.',
      },
      footerDynamic: 'Правило 2: It is time to + глагол',
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Сравним обе конструкции рядом.',
        },
        {
          type: 'info',
          content: 'Состояние: It is cold. Время действия: It is time to drink tea.',
        },
        {
          type: 'task',
          content: 'Дополните предложение: "It is cold. It is time to ____ tea."',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите пропущенное слово.',
        correctAnswer: 'drink',
        hint: 'Подумайте, что обычно делают, когда холодно.',
      },
      footerDynamic: 'Практика: выберите правильный глагол',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Теперь снова потренируем конструкцию с прилагательным.',
        },
        {
          type: 'info',
          content: 'Прилагательные описывают ситуацию: dark, cold, hot, late, early.',
        },
        {
          type: 'task',
          content: 'Переведите на английский: "Темно".',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите полное предложение на английском.',
        correctAnswer: "It's dark.",
        hint: 'Начните с "It is".',
      },
      footerDynamic: 'Практика: описание состояния',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Отлично. Теперь используем конструкцию действия в полном предложении.',
        },
        {
          type: 'info',
          content: 'Ее удобно использовать с повседневными действиями: go home, study, sleep, drink tea.',
        },
        {
          type: 'task',
          content: 'Переведите на английский: "Пора идти домой".',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Напишите полное предложение на английском.',
        correctAnswer: "It's time to go home.",
        hint: 'Используйте "It is time to" + глагол.',
      },
      footerDynamic: 'Практика: соберите полное предложение',
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Финальная проверка. Вы уже различаете описание состояния и время для действия.',
        },
        {
          type: 'info',
          content: 'Запомните: It is late = состояние. It is time to sleep = действие.',
        },
        {
          type: 'task',
          content: 'Выберите правильное предложение для фразы: "Пора спать".',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Какое предложение правильное?',
        options: ["It's sleep.", "It's time to sleep.", "It's sleeping time to."],
        correctAnswer: "It's time to sleep.",
        hint: 'Здесь речь о правильном моменте для действия.',
      },
      footerDynamic: 'Финальная проверка',
    },
    {
      stepNumber: 7,
      stepType: 'completion',
      bubbles: [
        {
          type: 'positive',
          content: 'Урок завершен. Теперь вы различаете It is + прилагательное и It is time to + глагол.',
        },
        {
          type: 'info',
          content: 'Используйте первую конструкцию для состояния, а вторую — когда пора что-то сделать.',
        },
        {
          type: 'task',
          content: 'Вы готовы к следующему уроку.',
        },
      ],
      footerDynamic: 'Урок завершен',
      postLesson: {
        dynamicFooterText: 'Выбор за вами! Любое действие закрепит материал',
        staticFooterText: '🏆 +50 XP | 🔥 COMBO x7! | 📈 [████████] 7/7',
        examples: [
          "It's sunny. It's time to go outside.",
          "It's late. It's time to go to bed.",
          "It's cold. It's time to make some tea.",
          "It's noisy. It's time to close the window.",
          "It's early. It's time to start work.",
        ],
        interestingFact:
          'В живой речи английского It is часто сокращают до It’s, а сама конструкция It’s time to звучит мягче и естественнее, чем прямой приказ.',
        options: [
          { action: 'repeat_variant', label: 'Повторить с новой ситуацией', icon: '🔁' },
          { action: 'view_examples', label: 'Посмотреть примеры', icon: '📚' },
          { action: 'learn_interesting', label: 'Узнать интересное', icon: '💡' },
          { action: 'independent_practice', label: 'Самостоятельный Практикум', icon: '🎮' },
          { action: 'myeng_training', label: 'Тренировка с MyEng', icon: '🤖' },
        ],
      },
    },
  ],
}
