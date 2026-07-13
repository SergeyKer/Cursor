import type { LessonPracticeScenario, LessonReferenceScenariosByType } from '@/types/lesson'
import { INTRODUCING_YOURSELF_CHALLENGE_ATOMS } from '@/lib/lessons/introducingYourselfChallengeAtoms'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'

const GOLDEN_SCENARIOS: readonly LessonPracticeScenario[] = [
  {
    id: 'l4-from-russia',
    situationRu: 'На знакомстве выбираете фразу о стране.',
    targetAnswer: 'I am from Russia.',
    options: ['I am from Russia.', 'I from Russia.', 'I am from in Russia.'],
  },
  {
    id: 'l4-im-from-russia',
    situationRu: 'Произнесите коротко, откуда вы.',
    targetAnswer: "I'm from Russia.",
  },
  {
    id: 'l4-i-am-anna',
    situationRu: 'Нужно назвать себя на встрече.',
    targetAnswer: 'I am Anna.',
    options: ['I am Anna.', 'I Anna.', 'Am I Anna.'],
  },
  {
    id: 'l4-from-moscow',
    situationRu: 'Соберите фразу о городе.',
    targetAnswer: 'I am from Moscow.',
  },
  {
    id: 'l4-translate-moscow',
    situationRu: 'Скажите, откуда вы.',
    translateRu: 'Я из Москвы.',
    targetAnswer: 'I am from Moscow.',
    acceptedAnswers: ["I'm from Moscow."],
  },
  {
    id: 'l4-a-student',
    situationRu: 'Выберите артикль перед ролью.',
    targetAnswer: 'a',
    dropdownFrameEn: "I'm ___ student.",
    options: ['a', 'an', 'the'],
  },
  {
    id: 'l4-an-engineer',
    situationRu: 'Выберите артикль перед ролью с гласной.',
    targetAnswer: 'an',
    dropdownFrameEn: "I'm ___ engineer.",
    options: ['a', 'an', 'the'],
  },
  {
    id: 'l4-russia-student',
    situationRu: 'Свяжите страну и роль в одной фразе.',
    targetAnswer: 'I am from Russia and I am a student.',
    extraWords: ['an', 'froms'],
  },
  {
    id: 'l4-moscow-teacher',
    situationRu: 'Диктуете представление: город и работа.',
    targetAnswer: 'I am from Moscow and I am a teacher.',
  },
  {
    id: 'l4-from-brazil',
    situationRu: 'Из какой страны человек? Послушайте.',
    targetAnswer: "I'm from Brazil.",
    options: ["I'm from Brazil.", "I'm from Spain.", "I'm from Japan."],
    translateRu: 'Я из Бразилии.',
  },
  {
    id: 'l4-roleplay-moscow',
    situationRu: 'Sarah спрашивает, откуда вы.',
    roleIntroRu: 'Ответьте Sarah коротко.',
    interlocutorEn: 'Where are you from?',
    targetAnswer: 'I am from Moscow.',
    acceptedAnswers: ["I'm from Moscow."],
  },
  {
    id: 'l4-error-i-from',
    situationRu: 'В анкете перепутали страну.',
    targetAnswer: 'I am from Russia.',
    brokenPhrase: 'I am from Spain.',
  },
  {
    id: 'l4-boss-intro',
    situationRu: 'Коротко представьтесь: имя, город и роль.',
    targetAnswer: "I'm Anna, I'm from Moscow, and I'm a student.",
    keywords: ['i am'],
    minWords: 6,
    acceptedAnswers: ['I am Anna, I am from Moscow, and I am a student.'],
  },
  {
    id: 'l4-i-am-happy',
    situationRu: 'На встрече говорите о настроении.',
    targetAnswer: 'I am happy.',
    options: ['I am happy.', 'I happy.', 'Am I happy.'],
  },
  {
    id: 'l4-from-spain',
    situationRu: 'Новый знакомый из Испании.',
    targetAnswer: 'I am from Spain.',
    options: ['I am from Spain.', 'I from Spain.', 'I am from in Spain.'],
  },
  {
    id: 'l4-im-from-japan',
    situationRu: 'Представление на конференции.',
    targetAnswer: "I'm from Japan.",
  },
  {
    id: 'l4-a-teacher',
    situationRu: 'Выберите артикль перед профессией.',
    targetAnswer: 'a',
    dropdownFrameEn: "I'm ___ teacher.",
    options: ['a', 'an', 'the'],
  },
  {
    id: 'l4-error-from-in',
    situationRu: 'В анкете перепутали город и страну.',
    targetAnswer: 'I am from Moscow.',
    brokenPhrase: 'I am from Russia.',
  },
  {
    id: 'l4-roleplay-name',
    situationRu: 'Sarah спрашивает ваше имя.',
    roleIntroRu: 'Ответьте Sarah.',
    interlocutorEn: 'What is your name?',
    targetAnswer: 'I am Anna.',
    acceptedAnswers: ["I'm Anna."],
  },
  {
    id: 'l4-boss-from-student',
    situationRu: 'Коротко: откуда вы и кем учитесь.',
    targetAnswer: "I'm from Moscow and I'm a student.",
    keywords: ['i am'],
    minWords: 5,
  },
  {
    id: 'l4-translate-russia',
    situationRu: 'Скажите о стране.',
    translateRu: 'Я из России.',
    targetAnswer: 'I am from Russia.',
    acceptedAnswers: ["I'm from Russia."],
  },
  {
    id: 'l4-from-brazil-listen',
    situationRu: 'Из какой страны человек? Послушайте ещё раз.',
    targetAnswer: "I'm from Spain.",
    options: ["I'm from Spain.", "I'm from Brazil.", "I'm from Japan."],
  },
] as const

export const INTRODUCING_YOURSELF_SESSION_SCENARIOS: Record<string, LessonPracticeScenario> =
  Object.fromEntries(GOLDEN_SCENARIOS.map((scenario) => [scenario.id, { ...scenario }]))

export const INTRODUCING_YOURSELF_SESSION_STEP_MAPS = {
  relaxed: [
    'l4-from-russia',
    'l4-im-from-russia',
    'l4-i-am-anna',
    'l4-a-student',
    'l4-translate-moscow',
    'l4-from-spain',
  ],
  balanced: [
    'l4-i-am-happy',
    'l4-from-moscow',
    'l4-im-from-japan',
    'l4-translate-russia',
    'l4-an-engineer',
    'l4-moscow-teacher',
    'l4-from-brazil',
    'l4-error-i-from',
    'l4-translate-moscow',
  ],
} as const

const REFERENCE_EXTRA_IDS: Record<(typeof CHALLENGE_STEP_SPECS)[number]['type'], readonly string[]> = {
  choice: ['l4-from-spain', 'l4-i-am-happy', 'l4-i-am-anna', 'l4-from-moscow', 'l4-im-from-russia', 'l4-im-from-japan'],
  'voice-shadow': ['l4-im-from-japan', 'l4-from-moscow', 'l4-i-am-anna', 'l4-from-spain', 'l4-i-am-happy', 'l4-translate-russia'],
  'context-clue': ['l4-from-russia', 'l4-from-spain', 'l4-i-am-happy', 'l4-i-am-anna', 'l4-from-moscow', 'l4-im-from-russia'],
  'sentence-surgery': ['l4-from-russia', 'l4-from-moscow', 'l4-i-am-anna', 'l4-from-spain', 'l4-i-am-happy', 'l4-im-from-russia'],
  'free-response': ['l4-translate-russia', 'l4-from-spain', 'l4-i-am-anna', 'l4-i-am-happy', 'l4-im-from-japan', 'l4-from-brazil'],
  'dropdown-fill': ['l4-an-engineer', 'l4-a-teacher', 'l4-from-russia', 'l4-i-am-anna', 'l4-from-moscow', 'l4-i-am-happy'],
  'word-builder-pro': ['l4-from-russia', 'l4-from-moscow', 'l4-russia-student', 'l4-moscow-teacher', 'l4-from-spain', 'l4-i-am-anna'],
  dictation: ['l4-from-russia', 'l4-from-moscow', 'l4-russia-student', 'l4-moscow-teacher', 'l4-from-spain', 'l4-i-am-anna'],
  'listening-select': ['l4-from-brazil-listen', 'l4-from-spain', 'l4-im-from-japan', 'l4-from-russia', 'l4-from-moscow', 'l4-i-am-anna'],
  'roleplay-mini': ['l4-roleplay-name', 'l4-translate-moscow', 'l4-from-russia', 'l4-from-spain', 'l4-i-am-anna', 'l4-im-from-russia'],
  'error-fix': ['l4-error-from-in', 'l4-from-russia', 'l4-from-moscow', 'l4-i-am-anna', 'l4-from-spain', 'l4-i-am-happy'],
  'boss-challenge': ['l4-boss-from-student', 'l4-russia-student', 'l4-moscow-teacher', 'l4-from-moscow', 'l4-from-russia', 'l4-i-am-anna'],
}

function challengeAtomToScenario(
  atom: (typeof INTRODUCING_YOURSELF_CHALLENGE_ATOMS)[number]
): LessonPracticeScenario {
  const { stepIndex: _stepIndex, ...fields } = atom
  return { id: `l4-challenge-${atom.stepIndex}`, ...fields }
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
      if (/engineer/i.test(scenario.targetAnswer) || /инженер|гласн/i.test(scenario.situationRu)) {
        next.targetAnswer = 'an'
        next.dropdownFrameEn = "I'm ___ engineer."
      } else if (/teacher/i.test(scenario.targetAnswer)) {
        next.targetAnswer = 'a'
        next.dropdownFrameEn = "I'm ___ teacher."
      } else {
        next.targetAnswer = 'a'
        next.dropdownFrameEn = "I'm ___ student."
      }
      next.options = ['a', 'an', 'the']
    }
    next.brokenPhrase = undefined
    next.interlocutorEn = undefined
    return next
  }

  if (type === 'error-fix') {
    next.options = undefined
    next.dropdownFrameEn = undefined
    if (!next.brokenPhrase) {
      if (/\bRussia\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bRussia\b/i, 'Spain')
      } else if (/\bMoscow\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bMoscow\b/i, 'London')
      } else if (/\bSpain\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bSpain\b/i, 'Russia')
      } else if (/\bAnna\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bAnna\b/i, 'Maria')
      } else if (/\bhappy\b/i.test(next.targetAnswer)) {
        next.brokenPhrase = next.targetAnswer.replace(/\bhappy\b/i, 'tired')
      } else {
        next.brokenPhrase = 'I am from Spain.'
        next.targetAnswer = 'I am from Russia.'
      }
    }
    return next
  }

  if (type === 'dictation' || type === 'voice-shadow' || type === 'boss-challenge') {
    next.options = undefined
  }

  if (type === 'boss-challenge') {
    next.minWords = next.minWords ?? 5
    next.keywords = next.keywords ?? ['i am']
    if (!/\b(i'?m|i am)\b/i.test(next.targetAnswer)) {
      next.targetAnswer = "I'm Anna, I'm from Moscow, and I'm a student."
      next.situationRu = 'Коротко представьтесь: имя, город и роль.'
      next.keywords = ['i am']
      next.minWords = 6
    }
  }

  if (type === 'choice' || type === 'context-clue' || type === 'listening-select') {
    if (!next.options?.length) {
      const correct = next.targetAnswer
      next.options = [
        correct,
        correct.replace(/\bI am\b/i, 'I').replace(/\bI'm\b/i, 'I'),
        correct.replace(/\bfrom\b/i, 'from in'),
      ]
    }
  }

  if (type === 'roleplay-mini') {
    if (!next.interlocutorEn?.endsWith('?')) {
      next.interlocutorEn = 'Where are you from?'
      next.roleIntroRu = next.roleIntroRu ?? 'Ответьте коротко.'
    }
    if (!next.acceptedAnswers?.length) {
      if (/\bI am from Moscow\b/i.test(next.targetAnswer)) {
        next.acceptedAnswers = ["I'm from Moscow."]
      } else if (/\bI am Anna\b/i.test(next.targetAnswer)) {
        next.acceptedAnswers = ["I'm Anna."]
      }
    }
  }

  if (type === 'free-response' && !next.translateRu) {
    if (/\bMoscow\b/i.test(next.targetAnswer)) next.translateRu = 'Я из Москвы.'
    else if (/\bRussia\b/i.test(next.targetAnswer)) next.translateRu = 'Я из России.'
    else if (/\bSpain\b/i.test(next.targetAnswer)) next.translateRu = 'Я из Испании.'
    else if (/\bJapan\b/i.test(next.targetAnswer)) next.translateRu = 'Я из Японии.'
    else if (/\bAnna\b/i.test(next.targetAnswer)) next.translateRu = 'Я Анна.'
    else if (/\bhappy\b/i.test(next.targetAnswer)) next.translateRu = 'Я счастлив.'
    else next.translateRu = 'Я из Москвы.'
  }

  if (type === 'word-builder-pro' && !next.extraWords?.length) {
    next.extraWords = ['an', 'froms']
  }

  return next
}

export function buildIntroducingYourselfReferenceScenarios(): LessonReferenceScenariosByType {
  const result: LessonReferenceScenariosByType = {}
  for (const [index, spec] of CHALLENGE_STEP_SPECS.entries()) {
    const atom = INTRODUCING_YOURSELF_CHALLENGE_ATOMS[index]
    if (!atom) continue
    const anchor = adaptScenarioForReferenceType(challengeAtomToScenario(atom), spec.type)
    const extras = (REFERENCE_EXTRA_IDS[spec.type] ?? [])
      .map((id) => INTRODUCING_YOURSELF_SESSION_SCENARIOS[id])
      .filter((item): item is LessonPracticeScenario => item != null)
      .map((item) => adaptScenarioForReferenceType(item, spec.type))
    result[spec.type] = [anchor, ...extras].slice(0, 7)
  }
  return result
}

export const INTRODUCING_YOURSELF_REFERENCE_SCENARIOS = buildIntroducingYourselfReferenceScenarios()
