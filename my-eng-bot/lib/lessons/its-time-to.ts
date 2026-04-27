import type { LessonData } from '@/types/lesson'

export const itsTimeToLesson: LessonData = {
  id: '1',
  topic: "It's / It's time to",
  level: 'A2',
  steps: [
    {
      stepNumber: 1,
      stepType: 'hook',
      bubbles: [
        {
          type: 'positive',
          content: "Today we will learn two useful patterns: It's + adjective and It's time to + verb.",
        },
        {
          type: 'info',
          content: "The first pattern describes a state. The second pattern shows that it is the right moment to do something.",
        },
        {
          type: 'task',
          content: "Choose the correct sentence for the situation: \"На улице темно.\"",
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Which sentence fits the situation?',
        options: ["It's dark.", "It's time to dark.", "It's dark to go."],
        correctAnswer: "It's dark.",
        hint: 'Use It\'s + adjective to describe a state.',
      },
      footerDynamic: "Rule 1: It's + adjective",
    },
    {
      stepNumber: 2,
      stepType: 'theory',
      bubbles: [
        {
          type: 'positive',
          content: "Good. Now look at the second pattern: It's time to + verb.",
        },
        {
          type: 'info',
          content: 'After time to we use the base form of the verb: sleep, study, go, drink.',
        },
        {
          type: 'task',
          content: 'Choose the best ending: "It\'s time to ___."',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Complete the sentence.',
        options: ['sleep', 'sleeps', 'sleeping'],
        correctAnswer: 'sleep',
        hint: 'After "to" use the base verb.',
      },
      footerDynamic: "Rule 2: It's time to + verb",
    },
    {
      stepNumber: 3,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Let us compare the two patterns side by side.',
        },
        {
          type: 'info',
          content: "State: It's cold. Action time: It's time to drink tea.",
        },
        {
          type: 'task',
          content: 'Complete the sentence: "It\'s cold. It\'s time to ____ tea."',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Write the missing word.',
        correctAnswer: 'drink',
        hint: 'Think about a common action when you are cold.',
      },
      footerDynamic: 'Practice: choose the correct verb',
    },
    {
      stepNumber: 4,
      stepType: 'practice_fill',
      bubbles: [
        {
          type: 'positive',
          content: 'Now practice the adjective pattern again.',
        },
        {
          type: 'info',
          content: 'Adjectives describe the situation: dark, cold, hot, late, early.',
        },
        {
          type: 'task',
          content: 'Translate to English: "Темно."',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Write the full sentence in English.',
        correctAnswer: "It's dark.",
        hint: 'Start with "It\'s".',
      },
      footerDynamic: 'Practice: describe a situation',
    },
    {
      stepNumber: 5,
      stepType: 'practice_apply',
      bubbles: [
        {
          type: 'positive',
          content: 'Great. Time to use the action pattern in a full sentence.',
        },
        {
          type: 'info',
          content: 'You can use it with everyday actions: go home, study, sleep, drink tea.',
        },
        {
          type: 'task',
          content: 'Translate to English: "Пора идти домой."',
        },
      ],
      exercise: {
        type: 'translate',
        question: 'Write the full sentence in English.',
        correctAnswer: "It's time to go home.",
        hint: 'Use "It\'s time to" + verb.',
      },
      footerDynamic: 'Practice: build a full action sentence',
    },
    {
      stepNumber: 6,
      stepType: 'feedback',
      bubbles: [
        {
          type: 'positive',
          content: 'Last check. You already know when to describe a state and when to suggest an action.',
        },
        {
          type: 'info',
          content: "Remember: It's late = state. It's time to sleep = action.",
        },
        {
          type: 'task',
          content: 'Choose the correct sentence for "Пора спать."',
        },
      ],
      exercise: {
        type: 'fill_choice',
        question: 'Which sentence is correct?',
        options: ["It's sleep.", "It's time to sleep.", "It's sleeping time to."],
        correctAnswer: "It's time to sleep.",
        hint: 'This is about the right moment to do an action.',
      },
      footerDynamic: 'Final check before completion',
    },
    {
      stepNumber: 7,
      stepType: 'completion',
      bubbles: [
        {
          type: 'positive',
          content: "Lesson complete. You can now distinguish It's + adjective from It's time to + verb.",
        },
        {
          type: 'info',
          content: "Use the first pattern for a state and the second one for an action that should happen now.",
        },
        {
          type: 'task',
          content: 'You are ready for the next lesson.',
        },
      ],
      footerDynamic: 'Lesson completed',
    },
  ],
}
