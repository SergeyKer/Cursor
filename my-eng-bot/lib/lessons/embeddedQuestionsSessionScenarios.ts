import type { LessonPracticeScenario, LessonReferenceScenariosByType } from '@/types/lesson'
import { EMBEDDED_QUESTIONS_CHALLENGE_ATOMS } from '@/lib/lessons/embeddedQuestionsChallengeAtoms'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'

const GOLDEN_SCENARIOS: readonly LessonPracticeScenario[] = [
  {
    id: 'l3-likes-she',
    situationRu: 'Я знаю, что ей нравится.',
    targetAnswer: 'I know what she likes.',
    options: [
      'I know what she likes.',
      'I know what does she like.',
      'I know what she like.',
    ],
    hint: 'Во вложенной части: what + she + likes, без does перед she.',
  },
  {
    id: 'l3-dont-know-where-he',
    situationRu: 'Я не знаю, где он живёт.',
    targetAnswer: "I don't know where he lives.",
    options: [
      "I don't know where he lives.",
      "I don't know where does he live.",
      "I don't know where he live.",
    ],
  },
  {
    id: 'l3-he-likes',
    situationRu: 'Я знаю, что ему нравится.',
    targetAnswer: 'I know what he likes.',
    options: [
      'I know what he likes.',
      'I know what does he like.',
      'I know what likes he.',
    ],
  },
  {
    id: 'l3-tell-she-likes',
    situationRu: 'Скажи мне, что ей нравится.',
    targetAnswer: 'Tell me what she likes.',
    hint: 'Tell me + what + she + likes.',
  },
  {
    id: 'l3-dont-know-who',
    situationRu: 'Я не знаю, кто он.',
    targetAnswer: "I don't know who he is.",
    hint: 'who + he + is, без инверсии who is he.',
  },
  {
    id: 'l3-know-tea-that',
    situationRu: 'Я знаю, что ей нравится чай.',
    targetAnswer: 'that',
    dropdownFrameEn: 'I know ___ she likes tea.',
    options: ['that', 'what', 'who', 'where'],
    hint: 'that вводит утверждение «она любит чай».',
  },
  {
    id: 'l3-anna-alex-likes-but',
    situationRu: 'Я знаю, что нравится Анне, но не знаю, что нравится Алексу.',
    targetAnswer: "I know what Anna likes, but I don't know what Alex likes.",
    hint: 'Свяжите две мысли через but.',
  },
  {
    id: 'l3-anna-alex-where-but',
    situationRu: 'Я знаю, где работает Анна, но не знаю, где живёт Алекс.',
    targetAnswer: "I know where Anna works, but I don't know where Alex lives.",
  },
  {
    id: 'l3-when-lesson',
    situationRu: 'Скажи, когда начинается урок.',
    targetAnswer: 'Tell me when the lesson starts.',
    options: [
      'Tell me when the lesson starts.',
      'Tell me when does the lesson start.',
      'Tell me when the lesson start.',
    ],
  },
  {
    id: 'l3-roleplay-who',
    situationRu: 'Разговор о человеке.',
    roleIntroRu: 'Собеседник спрашивает о нём.',
    interlocutorEn: 'Do you know who he is?',
    targetAnswer: "I don't know who he is.",
    hint: 'who + he + is — вложенный порядок слов.',
  },
  {
    id: 'l3-wants-error',
    situationRu: 'Я знаю, что ей нужно.',
    targetAnswer: 'I know what she wants.',
    brokenPhrase: 'I know what does she want.',
  },
  {
    id: 'l3-boss-anna-alex',
    situationRu: 'Скажи, что нравится Анне и где живёт Алекс; свяжи мысли через but.',
    targetAnswer: "I know what Anna likes, but I don't know where Alex lives.",
    keywords: ['know', 'what', 'where', 'but'],
    minWords: 8,
  },
  {
    id: 'l3-tell-where-station',
    situationRu: 'Скажи мне, где находится станция.',
    targetAnswer: 'Tell me where the station is.',
    hint: 'Tell me + where + the station + is.',
  },
  {
    id: 'l3-know-where-anna',
    situationRu: 'Я знаю, где работает Анна.',
    targetAnswer: 'I know where Anna works.',
    options: [
      'I know where Anna works.',
      'I know where does Anna work.',
      'I know where Anna work.',
    ],
  },
  {
    id: 'l3-do-you-know-likes',
    situationRu: 'Ты знаешь, что ей нравится?',
    targetAnswer: 'Do you know what she likes?',
    options: [
      'Do you know what she likes?',
      'Do you know what does she like?',
      'Do you know what she like?',
    ],
  },
  {
    id: 'l3-roleplay-where',
    situationRu: 'Спрашивают, где он живёт.',
    roleIntroRu: 'Собеседник интересуется его адресом.',
    interlocutorEn: 'Do you know where he lives?',
    targetAnswer: "I don't know where he lives.",
  },
  {
    id: 'l3-roleplay-likes',
    situationRu: 'Спрашивают о её вкусах.',
    roleIntroRu: 'Собеседник хочет узнать, что ей нравится.',
    interlocutorEn: 'Do you know what she likes?',
    targetAnswer: "I don't know what she likes.",
  },
  {
    id: 'l3-roleplay-anna-works',
    situationRu: 'Спрашивают, где работает Анна.',
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
    roleIntroRu: 'Собеседник хочет узнать, что ему нравится.',
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
    'l3-know-tea-that',
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
    'l3-know-tea-that',
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
    'l3-tell-where-station',
    'l3-when-lesson',
    'l3-know-where-anna',
    'l3-do-you-know-likes',
    'l3-dont-know-who',
  ],
  'free-response': [
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-do-you-know-likes',
    'l3-tell-where-station',
  ],
  'dropdown-fill': [
    'l3-likes-she',
    'l3-dont-know-who',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
  ],
  'word-builder-pro': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-do-you-know-likes',
    'l3-anna-alex-where-but',
  ],
  dictation: [
    'l3-dont-know-where-he',
    'l3-he-likes',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-do-you-know-likes',
    'l3-tell-where-station',
  ],
  'listening-select': [
    'l3-likes-she',
    'l3-dont-know-where-he',
    'l3-know-where-anna',
    'l3-do-you-know-likes',
    'l3-tell-where-station',
    'l3-anna-alex-likes-but',
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
    'l3-anna-alex-where-but',
    'l3-likes-she',
    'l3-know-where-anna',
    'l3-when-lesson',
    'l3-tell-where-station',
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

  if (type === 'dropdown-fill') {
    if (!next.dropdownFrameEn || next.targetAnswer.split(/\s+/).length > 1) {
      if (/tea/i.test(next.situationRu) || next.targetAnswer === 'that') {
        next.targetAnswer = 'that'
        next.dropdownFrameEn = 'I know ___ she likes tea.'
        next.options = ['that', 'what', 'who', 'where']
      } else if (/нрав/i.test(next.situationRu) && /she|ей|ей/i.test(next.situationRu + next.targetAnswer)) {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what she ___.'
        next.options = ['likes', 'like', 'does']
      } else if (/нрав/i.test(next.situationRu)) {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what he ___.'
        next.options = ['likes', 'like', 'does']
      } else if (/кто|who/i.test(next.situationRu + next.targetAnswer)) {
        next.targetAnswer = 'is'
        next.dropdownFrameEn = "I don't know who he ___."
        next.options = ['is', 'are', 'does']
      } else if (/работ|works/i.test(next.situationRu + next.targetAnswer)) {
        next.targetAnswer = 'works'
        next.dropdownFrameEn = 'I know where Anna ___.'
        next.options = ['works', 'work', 'does']
      } else if (/начин|starts|урок/i.test(next.situationRu + next.targetAnswer)) {
        next.targetAnswer = 'starts'
        next.dropdownFrameEn = 'Tell me when the lesson ___.'
        next.options = ['starts', 'start', 'does']
      } else if (/станц|station/i.test(next.situationRu + next.targetAnswer)) {
        next.targetAnswer = 'is'
        next.dropdownFrameEn = 'Tell me where the station ___.'
        next.options = ['is', 'are', 'does']
      } else {
        next.targetAnswer = 'likes'
        next.dropdownFrameEn = 'I know what she ___.'
        next.options = ['likes', 'like', 'does']
      }
    }
    next.hint = undefined
    next.brokenPhrase = undefined
    next.interlocutorEn = undefined
    return next
  }

  if (type === 'error-fix') {
    next.options = undefined
    next.hint = undefined
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
    next.hint = undefined
    next.options = type === 'listening-select' ? next.options : undefined
  }

  if (type === 'boss-challenge') {
    next.minWords = next.minWords ?? 8
    if (!/\bbut\b/i.test(next.targetAnswer)) {
      next.situationRu = 'Я знаю, что нравится Анне, но не знаю, где живёт Алекс.'
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
