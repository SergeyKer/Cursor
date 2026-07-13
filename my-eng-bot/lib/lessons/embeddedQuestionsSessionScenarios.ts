import type { LessonPracticeScenario, LessonReferenceScenariosByType } from '@/types/lesson'
import { EMBEDDED_QUESTIONS_CHALLENGE_ATOMS } from '@/lib/lessons/embeddedQuestionsChallengeAtoms'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'

const GOLDEN_SCENARIOS: readonly LessonPracticeScenario[] = [
  {
    id: 'l3-likes-she',
    situationRu: 'На вечеринке друг спрашивает, знакомы ли вы с её вкусами.',
    targetAnswer: 'I know what she likes.',
    options: [
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ],
  },
  {
    id: 'l3-dont-know-where-he',
    situationRu: 'Нужно сказать вслух, что его адрес вам неизвестен.',
    translateRu: 'Я не знаю, где он живёт.',
    targetAnswer: "I don't know where he lives.",
    options: [
      "I don't know where he lives.",
      "I don't know where does he live.",
      "I don't know where he live.",
    ],
  },
  {
    id: 'l3-he-likes',
    situationRu: 'В кафе обсуждаете, что ему обычно нравится.',
    translateRu: 'Я знаю, что ему нравится.',
    targetAnswer: 'I know what he likes.',
    options: [
      'I know what he likes.',
      'I know what does he like.',
      'I know what likes he.',
    ],
  },
  {
    id: 'l3-tell-she-likes',
    situationRu: 'Попросите подругу рассказать о её вкусах.',
    translateRu: 'Скажи мне, что ей нравится.',
    targetAnswer: 'Tell me what she likes.',
  },
  {
    id: 'l3-dont-know-who',
    situationRu: 'На встрече признаёте, что человека не знаете.',
    translateRu: 'Я не знаю, кто он.',
    targetAnswer: "I don't know who he is.",
  },
  {
    id: 'l3-know-she-likes-gap',
    situationRu: 'Дополните фразу о том, что ей нравится.',
    targetAnswer: 'likes',
    dropdownFrameEn: 'I know what she ___.',
    options: ['likes', 'like', 'does'],
  },
  {
    id: 'l3-anna-alex-likes-but',
    situationRu: 'Другу в чате: что знаете про Анну и чего не знаете про Алекса.',
    targetAnswer: "I know what Anna likes, but I don't know what Alex likes.",
  },
  {
    id: 'l3-station-lesson-but',
    situationRu: 'Диктуете пару мыслей про станцию и начало урока.',
    targetAnswer: "I know where the station is, but I don't know when the lesson starts.",
  },
  {
    id: 'l3-when-lesson',
    situationRu: 'На остановке нужно уточнить начало урока.',
    translateRu: 'Скажи, когда начинается урок.',
    targetAnswer: 'Tell me when the lesson starts.',
    options: [
      'Tell me when the lesson starts.',
      'Tell me when does the lesson start.',
      'Tell me when the lesson start.',
    ],
  },
  {
    id: 'l3-roleplay-who',
    situationRu: 'Собеседник спрашивает, знакомы ли вы с этим человеком.',
    roleIntroRu: 'Собеседник спрашивает о нём.',
    interlocutorEn: 'Do you know who he is?',
    targetAnswer: "I don't know who he is.",
  },
  {
    id: 'l3-wants-error',
    situationRu: 'Фраза о том, чего она хочет, звучит с ошибкой.',
    targetAnswer: 'I know what she wants.',
    brokenPhrase: 'I know what does she want.',
  },
  {
    id: 'l3-boss-anna-alex',
    situationRu: 'Напишите другу: что знаете про Анну и чего не знаете про Алекса.',
    targetAnswer: "I know what Anna likes, but I don't know where Alex lives.",
    keywords: ['know', 'what', 'where', 'but'],
    minWords: 8,
  },
  {
    id: 'l3-boss-she-he-likes',
    situationRu: 'Другу: сравните, что знаете о её и его вкусах.',
    targetAnswer: "I know what she likes, but I don't know what he likes.",
    keywords: ['know', 'what', 'but'],
    minWords: 8,
  },
  {
    id: 'l3-boss-station-lesson',
    situationRu: 'В сообщении свяжите станцию и начало урока.',
    targetAnswer: "I know where the station is, but I don't know when the lesson starts.",
    keywords: ['know', 'where', 'when', 'but'],
    minWords: 8,
  },
  {
    id: 'l3-boss-who-where',
    situationRu: 'Другу: человек знаком, но адрес неизвестен.',
    targetAnswer: "I know who he is, but I don't know where he lives.",
    keywords: ['know', 'who', 'where', 'but'],
    minWords: 8,
  },
  {
    id: 'l3-tell-where-station',
    situationRu: 'Нужно спросить дорогу к станции.',
    translateRu: 'Скажи мне, где находится станция.',
    targetAnswer: 'Tell me where the station is.',
  },
  {
    id: 'l3-know-where-anna',
    situationRu: 'Речь о месте работы Анны.',
    translateRu: 'Я знаю, где работает Анна.',
    targetAnswer: 'I know where Anna works.',
    options: [
      'I know where Anna works.',
      'I know where does Anna work.',
      'I know where Anna work.',
    ],
  },
  {
    id: 'l3-do-you-know-likes',
    situationRu: 'Нужно уточнить, известны ли её вкусы.',
    translateRu: 'Ты знаешь, что ей нравится?',
    targetAnswer: 'Do you know what she likes?',
    options: [
      'Do you know what she likes?',
      'Do you know what does she like?',
      'Do you know what she like?',
    ],
  },
  {
    id: 'l3-roleplay-where',
    situationRu: 'Спрашивают про его адрес.',
    roleIntroRu: 'Собеседник интересуется его адресом.',
    interlocutorEn: 'Do you know where he lives?',
    targetAnswer: "I don't know where he lives.",
  },
  {
    id: 'l3-roleplay-likes',
    situationRu: 'Спрашивают о её вкусах.',
    roleIntroRu: 'Собеседник хочет узнать о её вкусах.',
    interlocutorEn: 'Do you know what she likes?',
    targetAnswer: "I don't know what she likes.",
  },
  {
    id: 'l3-roleplay-anna-works',
    situationRu: 'Спрашивают о работе Анны.',
    roleIntroRu: 'Собеседник интересуется её работой.',
    interlocutorEn: 'Do you know where Anna works?',
    targetAnswer: "I don't know where Anna works.",
  },
  {
    id: 'l3-roleplay-when-lesson',
    situationRu: 'Спрашивают о начале урока.',
    roleIntroRu: 'Собеседник уточняет расписание.',
    interlocutorEn: 'Can you tell me when the lesson starts?',
    targetAnswer: "I don't know when the lesson starts.",
  },
  {
    id: 'l3-roleplay-station',
    situationRu: 'Спрашивают о станции.',
    roleIntroRu: 'Собеседник ищет станцию.',
    interlocutorEn: 'Do you know where the station is?',
    targetAnswer: "I don't know where the station is.",
  },
  {
    id: 'l3-roleplay-he-likes',
    situationRu: 'Спрашивают о его вкусах.',
    roleIntroRu: 'Собеседник хочет узнать о его вкусах.',
    interlocutorEn: 'Do you know what he likes?',
    targetAnswer: "I don't know what he likes.",
  },
] as const

export const EMBEDDED_QUESTIONS_SESSION_SCENARIOS: Record<string, LessonPracticeScenario> =
  Object.fromEntries(GOLDEN_SCENARIOS.map((scenario) => [scenario.id, { ...scenario }]))

export const EMBEDDED_QUESTIONS_SESSION_STEP_MAPS = {
  relaxed: [
    'l3-likes-she',
    'l3-tell-she-likes',
    'l3-know-she-likes-gap',
    'l3-he-likes',
    'l3-dont-know-who',
    'l3-do-you-know-likes',
  ],
  balanced: [
    'l3-dont-know-where-he',
    'l3-tell-where-station',
    'l3-when-lesson',
    'l3-know-where-anna',
    'l3-do-you-know-likes',
    'l3-know-she-likes-gap',
    'l3-tell-she-likes',
    'l3-anna-alex-likes-but',
    'l3-wants-error',
  ],
} as const

const REFERENCE_EXTRA_IDS: Record<
  (typeof CHALLENGE_STEP_SPECS)[number]['type'],
  readonly string[]
> = {
  choice: [
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-do-you-know-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'voice-shadow': [
    'l3-he-likes',
    'l3-tell-she-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-do-you-know-likes',
    'l3-tell-where-station',
  ],
  'context-clue': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-do-you-know-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'sentence-surgery': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'free-response': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-tell-she-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
  ],
  'dropdown-fill': [
    'l3-likes-she',
    'l3-he-likes',
    'l3-dont-know-who',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'word-builder-pro': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  dictation: [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-anna-alex-likes-but',
    'l3-station-lesson-but',
    'l3-when-lesson',
  ],
  'listening-select': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-do-you-know-likes',
  ],
  'roleplay-mini': [
    'l3-roleplay-where',
    'l3-roleplay-likes',
    'l3-roleplay-anna-works',
    'l3-roleplay-when-lesson',
    'l3-roleplay-station',
    'l3-roleplay-he-likes',
  ],
  'error-fix': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'boss-challenge': [
    'l3-anna-alex-likes-but',
    'l3-station-lesson-but',
    'l3-boss-anna-alex',
    'l3-boss-she-he-likes',
    'l3-boss-station-lesson',
    'l3-boss-who-where',
  ],
}

function challengeAtomToScenario(atom: (typeof EMBEDDED_QUESTIONS_CHALLENGE_ATOMS)[number]): LessonPracticeScenario {
  const { stepIndex: _stepIndex, ...fields } = atom
  return {
    id: `l3-challenge-${atom.stepIndex}`,
    ...fields,
  }
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
      if (/\bshe likes\b/i.test(next.targetAnswer) || /её вкус|что ей нравится/i.test(next.situationRu)) {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what she ___.'
        next.options = ['likes', 'like', 'does']
      } else if (/\bhe likes\b/i.test(next.targetAnswer) || /его вкус|что ему нравится/i.test(next.situationRu)) {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what he ___.'
        next.options = ['likes', 'like', 'does']
      } else if (/\bwho\b/i.test(next.targetAnswer) || /не знаком|кто он/i.test(next.situationRu)) {
        next.targetAnswer = 'is'
        next.dropdownFrameEn = "I don't know who he ___."
        next.options = ['is', 'are', 'does']
      } else if (/\bworks\b/i.test(next.targetAnswer) || /работ/i.test(next.situationRu)) {
        next.targetAnswer = 'works'
        next.dropdownFrameEn = 'I know where Anna ___.'
        next.options = ['works', 'work', 'does']
      } else if (/\bstarts\b/i.test(next.targetAnswer) || /урок/i.test(next.situationRu)) {
        next.targetAnswer = 'starts'
        next.dropdownFrameEn = 'Tell me when the lesson ___.'
        next.options = ['starts', 'start', 'does']
      } else if (/\bstation\b/i.test(next.targetAnswer) || /станц/i.test(next.situationRu)) {
        next.targetAnswer = 'is'
        next.dropdownFrameEn = 'Tell me where the station ___.'
        next.options = ['is', 'are', 'does']
      } else {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what she ___.'
        next.options = ['likes', 'like', 'does']
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
      const target = next.targetAnswer
      if (/\blikes\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\blikes\b/i, 'like')
      } else if (/\blives\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\blives\b/i, 'live')
      } else if (/\bworks\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\bworks\b/i, 'work')
      } else if (/\bstarts\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\bstarts\b/i, 'start')
      } else if (/\bwants\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\bwants\b/i, 'want')
      } else if (/\bstation is\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\bstation is\b/i, 'station sits')
      } else if (/\bwho he is\b/i.test(target)) {
        next.brokenPhrase = target.replace(/\bwho he is\b/i, 'who he lives')
      } else {
        next.brokenPhrase = target.replace(/\bknow\b/i, 'knows')
      }
    }
    return next
  }

  if (type === 'dictation' || type === 'listening-select' || type === 'voice-shadow' || type === 'boss-challenge') {
    next.options = type === 'listening-select' ? next.options : undefined
  }

  if (type === 'boss-challenge') {
    next.minWords = next.minWords ?? 8
    if (!/\bbut\b/i.test(next.targetAnswer)) {
      next.situationRu = 'Напишите другу: что знаете про Анну и чего не знаете про Алекса.'
      next.targetAnswer = "I know what Anna likes, but I don't know where Alex lives."
      next.keywords = ['know', 'what', 'where', 'but']
      next.minWords = 8
    }
  }

  if (type === 'choice' || type === 'context-clue' || type === 'listening-select') {
    if (!next.options?.length) {
      const correct = next.targetAnswer
      next.options = [
        correct,
        correct.replace(/\b(\w+)s\b/, '$1').replace(/\.$/, '') + '.',
        correct.replace(/\b(what|where|when|who) (\w+)/i, '$1 does $2').replace(/\.$/, '') + '.',
      ]
    }
  }

  if (type === 'free-response' && !next.translateRu) {
    if (/\blikes\b/i.test(next.targetAnswer) && /\bshe\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Я знаю, что ей нравится.'
    } else if (/\blikes\b/i.test(next.targetAnswer) && /\bhe\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Я знаю, что ему нравится.'
    } else if (/\blives\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Я не знаю, где он живёт.'
    } else if (/\bwho\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Я не знаю, кто он.'
    } else if (/\bworks\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Я знаю, где работает Анна.'
    } else if (/\bstarts\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Скажи, когда начинается урок.'
    } else if (/\bstation\b/i.test(next.targetAnswer)) {
      next.translateRu = 'Скажи мне, где находится станция.'
    }
  }

  return next
}

export function buildEmbeddedQuestionsReferenceScenarios(): LessonReferenceScenariosByType {
  const result: LessonReferenceScenariosByType = {}

  for (const [index, spec] of CHALLENGE_STEP_SPECS.entries()) {
    const atom = EMBEDDED_QUESTIONS_CHALLENGE_ATOMS[index]
    if (!atom) continue
    const anchor = adaptScenarioForReferenceType(challengeAtomToScenario(atom), spec.type)
    const extraIds = REFERENCE_EXTRA_IDS[spec.type] ?? []
    const extras = extraIds
      .map((id) => EMBEDDED_QUESTIONS_SESSION_SCENARIOS[id])
      .filter((item): item is LessonPracticeScenario => item != null)
      .map((item) => adaptScenarioForReferenceType(item, spec.type))
    result[spec.type] = [anchor, ...extras].slice(0, 7)
  }

  return result
}

export const EMBEDDED_QUESTIONS_REFERENCE_SCENARIOS = buildEmbeddedQuestionsReferenceScenarios()
