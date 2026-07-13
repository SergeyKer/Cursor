import type { LessonPracticeScenario, LessonReferenceScenariosByType } from '@/types/lesson'
import { ITS_TIME_TO_CHALLENGE_ATOMS } from '@/lib/lessons/itsTimeToChallengeAtoms'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'

const GOLDEN_SCENARIOS: readonly LessonPracticeScenario[] = [
  {
    id: 'l1-cold-outside',
    situationRu: 'На улице прохладно, выбираете верную фразу.',
    targetAnswer: "It's cold outside.",
    options: ["It's cold outside.", 'Its cold outside.', 'It cold outside.'],
  },
  {
    id: 'l1-time-to-go',
    situationRu: 'Пора уходить — произнесите фразу вслух.',
    translateRu: 'Пора идти.',
    targetAnswer: "It's time to go.",
  },
  {
    id: 'l1-time-to-sleep',
    situationRu: 'Уже поздно вечером, все хотят спать.',
    targetAnswer: "It's time to sleep.",
    options: ["It's time to sleep.", "It's time for sleep.", "It's time to sleeps."],
  },
  {
    id: 'l1-five-oclock',
    situationRu: 'Соберите фразу про текущее время.',
    targetAnswer: "It's five o'clock.",
  },
  {
    id: 'l1-go-home',
    situationRu: 'Друзья устали и собираются домой.',
    translateRu: 'Пора идти домой.',
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It is time to go home."],
  },
  {
    id: 'l1-time-to-gap',
    situationRu: 'Нужно выбрать предлог перед глаголом.',
    targetAnswer: 'to',
    dropdownFrameEn: "It's time ___ leave.",
    options: ['to', 'for', 'at'],
  },
  {
    id: 'l1-cold-and-home',
    situationRu: 'Свяжите холод на улице и решение уйти.',
    targetAnswer: "It's cold and it's time to go home.",
    extraWords: ['goes', 'times'],
  },
  {
    id: 'l1-late-and-go',
    situationRu: 'Диктуете другу, что уже поздно уходить.',
    targetAnswer: "It's late and it's time to go.",
  },
  {
    id: 'l1-cold-today',
    situationRu: 'Послушайте, какая сейчас погода.',
    targetAnswer: "It's cold today.",
    options: ["It's cold today.", "It's hot today.", "It's dark today."],
  },
  {
    id: 'l1-roleplay-home',
    situationRu: 'Собеседник ждёт решения, что делать дальше.',
    roleIntroRu: 'Уже поздно, нужно решить.',
    interlocutorEn: "It's late. What should we do?",
    targetAnswer: "It's time to go home.",
    acceptedAnswers: ["It is time to go home."],
  },
  {
    id: 'l1-error-for-go',
    situationRu: 'В сообщении ошибка: перепутали действие.',
    targetAnswer: "It's time to go.",
    brokenPhrase: "It's time to sleep.",
  },
  {
    id: 'l1-boss-late-home',
    situationRu: 'Нужно закончить вечер: скажите, что поздно и пора домой.',
    targetAnswer: "It's late and it's time to go home.",
    keywords: ['time to'],
    minWords: 6,
  },
  {
    id: 'l1-hot-today',
    situationRu: 'В полдень на солнце очень жарко.',
    targetAnswer: "It's hot today.",
    options: ["It's hot today.", 'Its hot today.', 'It hot today.'],
  },
  {
    id: 'l1-dark-now',
    situationRu: 'Вечером в комнате почти не видно.',
    targetAnswer: "It's dark now.",
    options: ["It's dark now.", 'Its dark now.', 'It dark now.'],
  },
  {
    id: 'l1-time-to-eat',
    situationRu: 'Все голодны после прогулки.',
    translateRu: 'Пора есть.',
    targetAnswer: "It's time to eat.",
  },
  {
    id: 'l1-time-to-start',
    situationRu: 'Урок вот-вот начнётся.',
    translateRu: 'Пора начинать.',
    targetAnswer: "It's time to start.",
  },
  {
    id: 'l1-nine-oclock',
    situationRu: 'Смотрите на часы утром.',
    targetAnswer: "It's nine o'clock.",
  },
  {
    id: 'l1-late-night',
    situationRu: 'Уже глубокая ночь.',
    targetAnswer: "It's late.",
    options: ["It's late.", 'Its late.', 'It late.'],
  },
  {
    id: 'l1-error-its',
    situationRu: 'В чате перепутали погоду.',
    targetAnswer: "It's cold.",
    brokenPhrase: "It's hot.",
  },
  {
    id: 'l1-roleplay-go',
    situationRu: 'Друг спрашивает, не пора ли уходить.',
    roleIntroRu: 'Нужно решить, уходить ли.',
    interlocutorEn: 'Are we ready?',
    targetAnswer: "It's time to go.",
  },
  {
    id: 'l1-boss-cold-go',
    situationRu: 'На улице холодно — скажите, что пора уходить.',
    targetAnswer: "It's cold and it's time to go.",
    keywords: ['time to'],
    minWords: 5,
  },
  {
    id: 'l1-time-to-rest',
    situationRu: 'После работы все устали.',
    translateRu: 'Пора отдыхать.',
    targetAnswer: "It's time to rest.",
  },
] as const

export const ITS_TIME_TO_SESSION_SCENARIOS: Record<string, LessonPracticeScenario> =
  Object.fromEntries(GOLDEN_SCENARIOS.map((scenario) => [scenario.id, { ...scenario }]))

export const ITS_TIME_TO_SESSION_STEP_MAPS = {
  relaxed: [
    'l1-cold-outside',
    'l1-time-to-go',
    'l1-five-oclock',
    'l1-time-to-sleep',
    'l1-go-home',
    'l1-hot-today',
  ],
  balanced: [
    'l1-dark-now',
    'l1-time-to-eat',
    'l1-nine-oclock',
    'l1-go-home',
    'l1-time-to-sleep',
    'l1-time-to-gap',
    'l1-late-and-go',
    'l1-cold-today',
    'l1-error-for-go',
  ],
} as const

const REFERENCE_EXTRA_IDS: Record<(typeof CHALLENGE_STEP_SPECS)[number]['type'], readonly string[]> = {
  choice: ['l1-hot-today', 'l1-dark-now', 'l1-late-night', 'l1-time-to-go', 'l1-go-home', 'l1-cold-today'],
  'voice-shadow': ['l1-time-to-eat', 'l1-time-to-start', 'l1-go-home', 'l1-cold-outside', 'l1-late-night', 'l1-time-to-rest'],
  'context-clue': ['l1-cold-outside', 'l1-hot-today', 'l1-time-to-go', 'l1-go-home', 'l1-time-to-eat', 'l1-late-night'],
  'sentence-surgery': ['l1-cold-outside', 'l1-time-to-go', 'l1-go-home', 'l1-nine-oclock', 'l1-time-to-eat', 'l1-late-night'],
  'free-response': ['l1-time-to-go', 'l1-time-to-eat', 'l1-time-to-start', 'l1-time-to-rest', 'l1-cold-outside', 'l1-late-night'],
  'dropdown-fill': ['l1-time-to-go', 'l1-go-home', 'l1-time-to-eat', 'l1-time-to-start', 'l1-time-to-sleep', 'l1-time-to-rest'],
  'word-builder-pro': ['l1-cold-outside', 'l1-time-to-go', 'l1-go-home', 'l1-late-and-go', 'l1-cold-and-home', 'l1-time-to-eat'],
  dictation: ['l1-cold-outside', 'l1-time-to-go', 'l1-go-home', 'l1-late-and-go', 'l1-cold-and-home', 'l1-nine-oclock'],
  'listening-select': ['l1-hot-today', 'l1-dark-now', 'l1-late-night', 'l1-cold-outside', 'l1-time-to-go', 'l1-go-home'],
  'roleplay-mini': ['l1-roleplay-go', 'l1-go-home', 'l1-time-to-go', 'l1-time-to-eat', 'l1-late-night', 'l1-cold-outside'],
  'error-fix': ['l1-error-its', 'l1-time-to-go', 'l1-go-home', 'l1-cold-outside', 'l1-time-to-sleep', 'l1-late-night'],
  'boss-challenge': ['l1-boss-cold-go', 'l1-cold-and-home', 'l1-late-and-go', 'l1-go-home', 'l1-time-to-go', 'l1-cold-outside'],
}

function challengeAtomToScenario(atom: (typeof ITS_TIME_TO_CHALLENGE_ATOMS)[number]): LessonPracticeScenario {
  const { stepIndex: _stepIndex, ...fields } = atom
  return { id: `l1-challenge-${atom.stepIndex}`, ...fields }
}

function cloneScenario(scenario: LessonPracticeScenario): LessonPracticeScenario {
  return {
    ...scenario,
    options: scenario.options ? [...scenario.options] : undefined,
    acceptedAnswers: scenario.acceptedAnswers ? [...scenario.acceptedAnswers] : undefined,
    keywords: scenario.keywords ? [...scenario.keywords] : undefined,
    extraWords: scenario.extraWords ? [...scenario.extraWords] : undefined,
  }
}

function adaptScenarioForReferenceType(
  scenario: LessonPracticeScenario,
  type: (typeof CHALLENGE_STEP_SPECS)[number]['type']
): LessonPracticeScenario {
  const next = cloneScenario(scenario)
  next.hint = undefined

  if (type === 'dropdown-fill') {
    if (!next.dropdownFrameEn || next.targetAnswer.split(/\s+/).length > 1) {
      next.targetAnswer = 'to'
      next.dropdownFrameEn = "It's time ___ leave."
      next.options = ['to', 'for', 'at']
      if (/\bgo home\b/i.test(scenario.targetAnswer)) {
        next.dropdownFrameEn = "It's time ___ go home."
      } else if (/\beat\b/i.test(scenario.targetAnswer)) {
        next.dropdownFrameEn = "It's time ___ eat."
      } else if (/\bsleep\b/i.test(scenario.targetAnswer)) {
        next.dropdownFrameEn = "It's time ___ sleep."
      } else if (/\bstart\b/i.test(scenario.targetAnswer)) {
        next.dropdownFrameEn = "It's time ___ start."
      } else if (/\brest\b/i.test(scenario.targetAnswer)) {
        next.dropdownFrameEn = "It's time ___ rest."
      }
    }
    next.brokenPhrase = undefined
    next.interlocutorEn = undefined
    return next
  }

  if (type === 'error-fix') {
    next.options = undefined
    next.dropdownFrameEn = undefined
    if (!next.brokenPhrase) {
      if (/\btime to go\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bgo\b/i, 'sleep')
      } else if (/\btime to sleep\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bsleep\b/i, 'go')
      } else if (/\bcold\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bcold\b/i, 'hot')
      } else if (/\bhot\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bhot\b/i, 'cold')
      } else if (/\bdark\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bdark\b/i, 'late')
      } else if (/\blate\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\blate\b/i, 'dark')
      } else {
        next.brokenPhrase = "It's time to sleep."
        next.targetAnswer = "It's time to go."
      }
    }
    return next
  }

  if (type === 'dictation' || type === 'voice-shadow' || type === 'boss-challenge') {
    next.options = undefined
  }

  if (type === 'boss-challenge') {
    next.minWords = next.minWords ?? 5
    next.keywords = next.keywords ?? ['time to']
    if (!/\btime to\b/i.test(next.targetAnswer)) {
      next.targetAnswer = "It's late and it's time to go home."
      next.situationRu = 'Нужно закончить вечер: скажите, что поздно и пора домой.'
      next.keywords = ['time to']
      next.minWords = 6
    }
  }

  if (type === 'choice' || type === 'context-clue' || type === 'listening-select') {
    if (!next.options?.length) {
      const correct = next.targetAnswer
      next.options = [correct, correct.replace(/^It's\b/i, 'Its'), correct.replace(/^It's\b/i, 'It')]
    }
  }

  if (type === 'roleplay-mini') {
    if (!next.interlocutorEn) {
      next.interlocutorEn = "It's late. What should we do?"
      next.roleIntroRu = next.roleIntroRu ?? 'Уже поздно, нужно решить.'
    }
    if (!next.acceptedAnswers?.length && /\bIt's\b/.test(next.targetAnswer)) {
      next.acceptedAnswers = [next.targetAnswer.replace(/\bIt's\b/g, 'It is')]
    }
  }

  if (type === 'free-response' && !next.translateRu) {
    if (/\bgo home\b/i.test(next.targetAnswer)) next.translateRu = 'Пора идти домой.'
    else if (/\btime to go\b/i.test(next.targetAnswer)) next.translateRu = 'Пора идти.'
    else if (/\beat\b/i.test(next.targetAnswer)) next.translateRu = 'Пора есть.'
    else if (/\bstart\b/i.test(next.targetAnswer)) next.translateRu = 'Пора начинать.'
    else if (/\brest\b/i.test(next.targetAnswer)) next.translateRu = 'Пора отдыхать.'
    else if (/\bsleep\b/i.test(next.targetAnswer)) next.translateRu = 'Пора спать.'
    else if (/\bcold\b/i.test(next.targetAnswer)) next.translateRu = 'На улице холодно.'
    else if (/\bhot\b/i.test(next.targetAnswer)) next.translateRu = 'Сегодня жарко.'
    else if (/\bdark\b/i.test(next.targetAnswer)) next.translateRu = 'Уже темно.'
    else if (/\blate\b/i.test(next.targetAnswer)) next.translateRu = 'Уже поздно.'
    else if (/\bo'clock\b/i.test(next.targetAnswer)) next.translateRu = 'Сейчас пять часов.'
    else next.translateRu = 'Пора идти.'
  }

  if (type === 'word-builder-pro' && !next.extraWords?.length) {
    next.extraWords = ['goes', 'times']
  }

  return next
}

export function buildItsTimeToReferenceScenarios(): LessonReferenceScenariosByType {
  const result: LessonReferenceScenariosByType = {}
  for (const [index, spec] of CHALLENGE_STEP_SPECS.entries()) {
    const atom = ITS_TIME_TO_CHALLENGE_ATOMS[index]
    if (!atom) continue
    const anchor = adaptScenarioForReferenceType(challengeAtomToScenario(atom), spec.type)
    const extras = (REFERENCE_EXTRA_IDS[spec.type] ?? [])
      .map((id) => ITS_TIME_TO_SESSION_SCENARIOS[id])
      .filter((item): item is LessonPracticeScenario => item != null)
      .map((item) => adaptScenarioForReferenceType(item, spec.type))
    result[spec.type] = [anchor, ...extras].slice(0, 7)
  }
  return result
}

export const ITS_TIME_TO_REFERENCE_SCENARIOS = buildItsTimeToReferenceScenarios()
