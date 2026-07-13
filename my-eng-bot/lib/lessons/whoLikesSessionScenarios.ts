import type { LessonPracticeScenario, LessonReferenceScenariosByType } from '@/types/lesson'
import { WHO_LIKES_CHALLENGE_ATOMS } from '@/lib/lessons/whoLikesChallengeAtoms'
import { CHALLENGE_STEP_SPECS } from '@/lib/practice/engine/stepSpec'

const GOLDEN_SCENARIOS: readonly LessonPracticeScenario[] = [
  {
    id: 'l2-who-likes-pizza',
    situationRu: 'На вечеринке ищут, кто заказал пиццу.',
    targetAnswer: 'Who likes pizza?',
    options: ['Who likes pizza?', 'Who like pizza?', 'What likes pizza?'],
  },
  {
    id: 'l2-who-likes-coffee',
    situationRu: 'Хотите спросить вслух, кому нравится кофе.',
    targetAnswer: 'Who likes coffee?',
  },
  {
    id: 'l2-who-is-that',
    situationRu: 'На вечеринке у двери стоит незнакомец.',
    targetAnswer: 'Who is that?',
    options: ['Who is that?', 'Who that?', 'Who that is?'],
  },
  {
    id: 'l2-who-works-here',
    situationRu: 'На ресепшене спрашиваете, кто здесь работает.',
    targetAnswer: 'Who works here?',
  },
  {
    id: 'l2-brother-likes-tea',
    situationRu: 'Расскажите о вкусах брата.',
    translateRu: 'Мой брат любит чай.',
    targetAnswer: 'My brother likes tea.',
  },
  {
    id: 'l2-who-gap',
    situationRu: 'Выберите вопросительное слово про человека.',
    targetAnswer: 'Who',
    dropdownFrameEn: '___ likes chocolate?',
    options: ['Who', 'What', 'Where'],
  },
  {
    id: 'l2-who-reads-books',
    situationRu: 'Соберите вопрос о чтении в классе.',
    targetAnswer: 'Who reads books?',
    extraWords: ['read', 'does'],
  },
  {
    id: 'l2-who-reads-class',
    situationRu: 'Диктуете вопрос учителю про чтение.',
    targetAnswer: 'Who reads books in this class?',
  },
  {
    id: 'l2-anna-likes-tea',
    situationRu: 'Кто из них любит чай? Послушайте фразу.',
    targetAnswer: 'Anna likes tea.',
    options: ['Anna likes tea.', 'Max likes tea.', 'Anna likes coffee.'],
  },
  {
    id: 'l2-roleplay-brother-tea',
    situationRu: 'Собеседник спрашивает про чай.',
    roleIntroRu: 'Ответьте коротко про брата.',
    interlocutorEn: 'Who likes tea?',
    targetAnswer: 'My brother likes tea.',
  },
  {
    id: 'l2-error-does-works',
    situationRu: 'В вопросе про работу забыли окончание.',
    targetAnswer: 'Who works here?',
    brokenPhrase: 'Who work here?',
  },
  {
    id: 'l2-boss-coffee-works',
    situationRu: 'На встрече новых людей спросите одним Who-вопросом.',
    targetAnswer: 'Who likes coffee and works here?',
    keywords: ['who'],
    minWords: 4,
  },
  {
    id: 'l2-who-likes-music',
    situationRu: 'В компании выбирают плейлист.',
    targetAnswer: 'Who likes music?',
    options: ['Who likes music?', 'Who like music?', 'What likes music?'],
  },
  {
    id: 'l2-who-drinks-tea',
    situationRu: 'За столом ищут, кто пьёт чай.',
    targetAnswer: 'Who drinks tea?',
  },
  {
    id: 'l2-who-plays-football',
    situationRu: 'На спортплощадке спрашивают про футбол.',
    targetAnswer: 'Who plays football?',
  },
  {
    id: 'l2-maria-likes-pizza',
    situationRu: 'Кто любит пиццу? Послушайте ответ.',
    targetAnswer: 'Maria likes pizza.',
    options: ['Maria likes pizza.', 'Tom likes pizza.', 'Maria likes salad.'],
  },
  {
    id: 'l2-max-reads-books',
    situationRu: 'Кто читает книги? Послушайте.',
    targetAnswer: 'Max reads books.',
    options: ['Max reads books.', 'Anna reads books.', 'Max reads comics.'],
  },
  {
    id: 'l2-error-like',
    situationRu: 'В вопросе забыли окончание -s.',
    targetAnswer: 'Who likes pizza?',
    brokenPhrase: 'Who like pizza?',
  },
  {
    id: 'l2-error-read',
    situationRu: 'В вопросе о книгах нет -s.',
    targetAnswer: 'Who reads books?',
    brokenPhrase: 'Who read books?',
  },
  {
    id: 'l2-roleplay-anna-tea',
    situationRu: 'Спрашивают, кто любит чай.',
    roleIntroRu: 'Ответьте про Анну.',
    interlocutorEn: 'Who likes tea?',
    targetAnswer: 'Anna likes tea.',
  },
  {
    id: 'l2-sister-likes-music',
    situationRu: 'Расскажите о сестре и музыке.',
    translateRu: 'Моя сестра любит музыку.',
    targetAnswer: 'My sister likes music.',
  },
  {
    id: 'l2-boss-who-reads',
    situationRu: 'Спросите, кто читает книги в этом классе.',
    targetAnswer: 'Who reads books in this class?',
    keywords: ['who'],
    minWords: 4,
  },
  {
    id: 'l2-who-gap-works',
    situationRu: 'Выберите слово в вопросе о работе.',
    targetAnswer: 'Who',
    dropdownFrameEn: '___ works here?',
    options: ['Who', 'What', 'Where'],
  },
] as const

export const WHO_LIKES_SESSION_SCENARIOS: Record<string, LessonPracticeScenario> =
  Object.fromEntries(GOLDEN_SCENARIOS.map((scenario) => [scenario.id, { ...scenario }]))

export const WHO_LIKES_SESSION_STEP_MAPS = {
  relaxed: [
    'l2-who-likes-pizza',
    'l2-who-likes-coffee',
    'l2-who-is-that',
    'l2-who-gap',
    'l2-brother-likes-tea',
    'l2-who-likes-music',
  ],
  balanced: [
    'l2-who-drinks-tea',
    'l2-who-plays-football',
    'l2-who-works-here',
    'l2-sister-likes-music',
    'l2-who-gap-works',
    'l2-who-reads-class',
    'l2-anna-likes-tea',
    'l2-error-like',
    'l2-brother-likes-tea',
  ],
} as const

const REFERENCE_EXTRA_IDS: Record<(typeof CHALLENGE_STEP_SPECS)[number]['type'], readonly string[]> = {
  choice: ['l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football', 'l2-who-works-here', 'l2-who-is-that', 'l2-who-reads-books'],
  'voice-shadow': ['l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football', 'l2-who-works-here', 'l2-who-reads-books', 'l2-who-likes-coffee'],
  'context-clue': ['l2-who-likes-pizza', 'l2-who-likes-music', 'l2-who-works-here', 'l2-who-is-that', 'l2-who-reads-books', 'l2-who-drinks-tea'],
  'sentence-surgery': ['l2-who-likes-pizza', 'l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football', 'l2-who-reads-books', 'l2-who-likes-coffee'],
  'free-response': ['l2-sister-likes-music', 'l2-anna-likes-tea', 'l2-who-likes-pizza', 'l2-who-works-here', 'l2-who-reads-books', 'l2-who-likes-music'],
  'dropdown-fill': ['l2-who-gap-works', 'l2-who-likes-pizza', 'l2-who-likes-music', 'l2-who-works-here', 'l2-who-reads-books', 'l2-who-drinks-tea'],
  'word-builder-pro': ['l2-who-likes-pizza', 'l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football', 'l2-who-works-here', 'l2-who-likes-coffee'],
  dictation: ['l2-who-likes-pizza', 'l2-who-works-here', 'l2-who-reads-class', 'l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football'],
  'listening-select': ['l2-maria-likes-pizza', 'l2-max-reads-books', 'l2-who-likes-music', 'l2-brother-likes-tea', 'l2-who-works-here', 'l2-who-likes-coffee'],
  'roleplay-mini': ['l2-roleplay-anna-tea', 'l2-sister-likes-music', 'l2-anna-likes-tea', 'l2-brother-likes-tea', 'l2-who-likes-music', 'l2-who-works-here'],
  'error-fix': ['l2-error-like', 'l2-error-read', 'l2-who-likes-pizza', 'l2-who-works-here', 'l2-who-reads-books', 'l2-who-likes-music'],
  'boss-challenge': ['l2-boss-who-reads', 'l2-who-reads-class', 'l2-who-works-here', 'l2-who-likes-music', 'l2-who-drinks-tea', 'l2-who-plays-football'],
}

function challengeAtomToScenario(atom: (typeof WHO_LIKES_CHALLENGE_ATOMS)[number]): LessonPracticeScenario {
  const { stepIndex: _stepIndex, ...fields } = atom
  return { id: `l2-challenge-${atom.stepIndex}`, ...fields }
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
      next.targetAnswer = 'Who'
      next.options = ['Who', 'What', 'Where']
      if (/\bworks\b/i.test(scenario.targetAnswer)) next.dropdownFrameEn = '___ works here?'
      else if (/\breads\b/i.test(scenario.targetAnswer)) next.dropdownFrameEn = '___ reads books?'
      else if (/\bdrinks\b/i.test(scenario.targetAnswer)) next.dropdownFrameEn = '___ drinks tea?'
      else if (/\bplays\b/i.test(scenario.targetAnswer)) next.dropdownFrameEn = '___ plays football?'
      else next.dropdownFrameEn = '___ likes chocolate?'
    }
    next.brokenPhrase = undefined
    next.interlocutorEn = undefined
    return next
  }

  if (type === 'error-fix') {
    next.options = undefined
    next.dropdownFrameEn = undefined
    if (!next.brokenPhrase) {
      if (/\blikes\b/i.test(next.targetAnswer)) next.brokenPhrase = next.targetAnswer.replace(/\blikes\b/i, 'like')
      else if (/\bworks\b/i.test(next.targetAnswer)) next.brokenPhrase = next.targetAnswer.replace(/\bworks\b/i, 'work')
      else if (/\breads\b/i.test(next.targetAnswer)) next.brokenPhrase = next.targetAnswer.replace(/\breads\b/i, 'read')
      else if (/\bdrinks\b/i.test(next.targetAnswer)) next.brokenPhrase = next.targetAnswer.replace(/\bdrinks\b/i, 'drink')
      else if (/\bplays\b/i.test(next.targetAnswer)) next.brokenPhrase = next.targetAnswer.replace(/\bplays\b/i, 'play')
      else {
        next.brokenPhrase = 'Who like pizza?'
        next.targetAnswer = 'Who likes pizza?'
      }
    }
    return next
  }

  if (type === 'dictation' || type === 'voice-shadow' || type === 'boss-challenge') {
    next.options = undefined
  }

  if (type === 'boss-challenge') {
    next.minWords = next.minWords ?? 4
    next.keywords = next.keywords ?? ['who']
    if (!/\bWho\b/i.test(next.targetAnswer) || !next.targetAnswer.includes('?')) {
      next.targetAnswer = 'Who likes coffee and works here?'
      next.situationRu = 'На встрече новых людей спросите одним Who-вопросом.'
      next.keywords = ['who']
      next.minWords = 4
    }
  }

  if (type === 'choice' || type === 'context-clue') {
    if (!next.options?.length) {
      const correct = next.targetAnswer
      next.options = [
        correct,
        correct.replace(/\blikes\b/i, 'like').replace(/\bworks\b/i, 'work').replace(/\breads\b/i, 'read'),
        correct.replace(/^Who\b/i, 'What'),
      ]
    }
  }

  if (type === 'listening-select') {
    if (!next.options?.length || /^Who\b/i.test(next.targetAnswer)) {
      // Keep listening on declarative answers.
      if (/^Who\b/i.test(next.targetAnswer)) {
        next.targetAnswer = 'Anna likes tea.'
        next.situationRu = 'Кто из них любит чай? Послушайте фразу.'
      }
      next.options = [next.targetAnswer, 'Max likes tea.', 'Anna likes coffee.']
    }
  }

  if (type === 'roleplay-mini') {
    if (!next.interlocutorEn?.endsWith('?')) {
      next.interlocutorEn = 'Who likes tea?'
      next.roleIntroRu = next.roleIntroRu ?? 'Ответьте коротко.'
    }
    if (/^Who\b/i.test(next.targetAnswer) && next.targetAnswer.includes('?')) {
      next.targetAnswer = 'My brother likes tea.'
    }
  }

  if (type === 'free-response' && !next.translateRu) {
    if (/\bbrother\b/i.test(next.targetAnswer)) next.translateRu = 'Мой брат любит чай.'
    else if (/\bsister\b/i.test(next.targetAnswer)) next.translateRu = 'Моя сестра любит музыку.'
    else if (/\bAnna likes tea\b/i.test(next.targetAnswer)) next.translateRu = 'Анна любит чай.'
    else if (/\bMaria likes pizza\b/i.test(next.targetAnswer)) next.translateRu = 'Мария любит пиццу.'
    else if (/^Who likes pizza/i.test(next.targetAnswer)) next.translateRu = 'Кто любит пиццу?'
    else if (/^Who likes music/i.test(next.targetAnswer)) next.translateRu = 'Кто любит музыку?'
    else if (/^Who works/i.test(next.targetAnswer)) next.translateRu = 'Кто здесь работает?'
    else if (/^Who reads/i.test(next.targetAnswer)) next.translateRu = 'Кто читает книги?'
    else if (/^Who drinks/i.test(next.targetAnswer)) next.translateRu = 'Кто пьёт чай?'
    else if (/^Who plays/i.test(next.targetAnswer)) next.translateRu = 'Кто играет в футбол?'
    else if (/likes/i.test(next.targetAnswer)) next.translateRu = 'Кто это любит?'
    else next.translateRu = 'Мой брат любит чай.'
  }

  if (type === 'word-builder-pro' && !next.extraWords?.length) {
    next.extraWords = ['read', 'does']
  }

  return next
}

export function buildWhoLikesReferenceScenarios(): LessonReferenceScenariosByType {
  const result: LessonReferenceScenariosByType = {}
  for (const [index, spec] of CHALLENGE_STEP_SPECS.entries()) {
    const atom = WHO_LIKES_CHALLENGE_ATOMS[index]
    if (!atom) continue
    const anchor = adaptScenarioForReferenceType(challengeAtomToScenario(atom), spec.type)
    const extras = (REFERENCE_EXTRA_IDS[spec.type] ?? [])
      .map((id) => WHO_LIKES_SESSION_SCENARIOS[id])
      .filter((item): item is LessonPracticeScenario => item != null)
      .map((item) => adaptScenarioForReferenceType(item, spec.type))
    result[spec.type] = [anchor, ...extras].slice(0, 7)
  }
  return result
}

export const WHO_LIKES_REFERENCE_SCENARIOS = buildWhoLikesReferenceScenarios()
