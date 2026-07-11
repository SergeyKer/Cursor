import { CHALLENGE_STEP_SPECS, getPracticeStepSpec } from '@/lib/practice/engine/stepSpec'
import { buildWordBuilderProExtraWords } from '@/lib/practice/buildWordBuilderProTraps'
import { ROLEPLAY_INTERLOCUTOR_PREFIX } from '@/lib/practice/prompt/roleplayPromptEngine'
import { buildDictationTaskPrompt } from '@/lib/practice/prompt/dictationPromptFormat'
import { formatErrorFixPrompt } from '@/lib/practice/prompt/buildErrorFixPrompt'
import { buildBrokenPhraseFromTarget } from '@/lib/practice/prompt/errorFixBrokenPhrase'
import { tokensFromTargetAnswer } from '@/lib/practice/rebuildPracticeWordTokensFromAnswer'
import type {
  LessonChallengeAtom,
  LessonData,
  LessonPracticeScenario,
  LessonPracticeScenarioFields,
} from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

const LESSON3_CHOICE_FRAME = 'Какая фраза звучит правильно во вложенном вопросе?'

export function formatLessonPracticeSituationLine(situationRu: string): string {
  const trimmed = situationRu.trim().replace(/[.!?…]+$/u, '')
  return `Ситуация: ${trimmed}.`
}

function mergeParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shuffleWordTokens(tokens: string[]): string[] {
  const copy = [...tokens]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

export function buildLessonPracticeScenarioPrompt(
  question: PracticeQuestion,
  scenario: LessonPracticeScenarioFields,
  _lesson: LessonData
): string {
  const situation = formatLessonPracticeSituationLine(scenario.situationRu)

  switch (question.type) {
    case 'choice':
      return mergeParts([situation, LESSON3_CHOICE_FRAME])
    case 'voice-shadow':
      return situation
    case 'context-clue':
      return mergeParts([situation, LESSON3_CHOICE_FRAME])
    case 'sentence-surgery':
      return mergeParts([situation, 'Расставьте слова в правильном порядке.'])
    case 'free-response': {
      const translateSource = (scenario.translateRu ?? scenario.situationRu).replace(/[.!?…]+$/u, '')
      return `Переведите на английский: "${translateSource}."`
    }
    case 'dropdown-fill': {
      const frame = scenario.dropdownFrameEn?.trim()
      if (!frame) return situation
      return `Выберите слово для пропуска: «${scenario.situationRu.replace(/[.!?…]+$/u, '')}» — «${frame}»`
    }
    case 'word-builder-pro':
      return mergeParts([situation, 'Расставьте слова в правильном порядке.'])
    case 'dictation':
      return buildDictationTaskPrompt(scenario.situationRu)
    case 'listening-select':
      return situation
    case 'roleplay-mini': {
      const intro = scenario.roleIntroRu?.trim() || situation
      const interlocutor = scenario.interlocutorEn?.trim()
      if (!interlocutor) return intro
      return `${intro}\n${ROLEPLAY_INTERLOCUTOR_PREFIX}${interlocutor}»`
    }
    case 'error-fix': {
      const broken =
        scenario.brokenPhrase?.trim() ||
        buildBrokenPhraseFromTarget(scenario.targetAnswer, _lesson) ||
        scenario.targetAnswer
      return formatErrorFixPrompt(situation, broken)
    }
    case 'boss-challenge':
      return mergeParts([situation, 'Напишите по-английски две связанные мысли через but.'])
    default:
      return situation
  }
}

export type ApplyLessonPracticeScenarioOptions = {
  requireExactTarget?: boolean
}

export function applyLessonPracticeScenario(
  question: PracticeQuestion,
  scenario: LessonPracticeScenarioFields,
  lesson: LessonData,
  options?: ApplyLessonPracticeScenarioOptions
): PracticeQuestion {
  const targetAnswer = scenario.targetAnswer.trim()
  const acceptedAnswers = Array.from(
    new Set([targetAnswer, ...(scenario.acceptedAnswers ?? [])].map((item) => item.trim()).filter(Boolean))
  )
  const prompt = buildLessonPracticeScenarioPrompt(question, scenario, lesson)
  const isPuzzle = question.type === 'sentence-surgery' || question.type === 'word-builder-pro'
  const shuffledWords = isPuzzle
    ? shuffleWordTokens(tokensFromTargetAnswer(targetAnswer))
    : question.shuffledWords
  const extraWords =
    question.type === 'word-builder-pro'
      ? scenario.extraWords ?? buildWordBuilderProExtraWords(targetAnswer, lesson)
      : question.extraWords
  const audioTypes = new Set(['dictation', 'listening-select', 'voice-shadow'])
  const audioText = audioTypes.has(question.type) ? targetAnswer : question.audioText

  const clearHintTypes = new Set([
    'dictation',
    'voice-shadow',
    'listening-select',
    'error-fix',
    'boss-challenge',
    'choice',
    'context-clue',
    'sentence-surgery',
    'free-response',
    'dropdown-fill',
    'word-builder-pro',
    'roleplay-mini',
  ])
  const clearOptionsTypes = new Set([
    'dictation',
    'voice-shadow',
    'error-fix',
    'boss-challenge',
    'free-response',
    'sentence-surgery',
    'word-builder-pro',
    'roleplay-mini',
  ])
  const nextOptions = clearOptionsTypes.has(question.type)
    ? undefined
    : scenario.options?.length
      ? [...scenario.options]
      : question.options
  // Never surface recipe hints on the question for lesson-3-style scenarios.
  const nextHint = clearHintTypes.has(question.type)
    ? undefined
    : scenario.hint ?? question.hint

  return {
    ...question,
    prompt,
    targetAnswer,
    acceptedAnswers,
    options: nextOptions,
    hint: nextHint,
    shuffledWords,
    extraWords,
    audioText,
    keywords: scenario.keywords ?? question.keywords,
    minWords: scenario.minWords ?? question.minWords,
    requireExactTarget: options?.requireExactTarget ?? question.requireExactTarget,
  }
}

function lookupSessionScenario(
  lesson: LessonData,
  scenarioId: string
): LessonPracticeScenario | null {
  return lesson.repeatConfig?.sessionScenarios?.[scenarioId] ?? null
}

export function getLessonPracticeScenario(params: {
  lesson: LessonData
  mode: PracticeMode
  stepIndex: number
  exerciseType: PracticeExerciseType
  referenceExerciseType?: PracticeExerciseType
}): LessonPracticeScenarioFields | null {
  const repeatConfig = params.lesson.repeatConfig
  if (!repeatConfig) return null

  if (params.mode === 'challenge') {
    const atom = repeatConfig.challengeAtoms?.find((item) => item.stepIndex === params.stepIndex)
    return atom ?? null
  }

  if (params.mode === 'reference') {
    const refType = params.referenceExerciseType ?? params.exerciseType
    const pool = repeatConfig.referenceScenariosByType?.[refType]
    if (!pool?.length) return null
    return pool[params.stepIndex % pool.length] ?? null
  }

  if (params.mode === 'relaxed' || params.mode === 'balanced') {
    const map = repeatConfig.sessionStepMaps?.[params.mode]
    const scenarioId = map?.[params.stepIndex]
    if (!scenarioId) return null
    return lookupSessionScenario(params.lesson, scenarioId)
  }

  return null
}

export function applyLessonPracticeScenarioIfConfigured(params: {
  question: PracticeQuestion
  lesson: LessonData
  mode: PracticeMode
  stepIndex: number
  exerciseType: PracticeExerciseType
  referenceExerciseType?: PracticeExerciseType
}): PracticeQuestion {
  const scenario = getLessonPracticeScenario(params)
  if (!scenario) return params.question

  if (params.mode === 'challenge') {
    const atom = scenario as LessonChallengeAtom
    const expectedType = CHALLENGE_STEP_SPECS[atom.stepIndex]?.type
    if (expectedType && params.question.type !== expectedType) return params.question
    return applyLessonPracticeScenario(params.question, scenario, params.lesson, {
      requireExactTarget:
        params.question.type === 'roleplay-mini' && atom.stepIndex === 9 ? true : params.question.requireExactTarget,
    })
  }

  return applyLessonPracticeScenario(params.question, scenario, params.lesson)
}

export function collectPracticeScenarioBank(params: {
  lesson: LessonData
  mode: PracticeMode
  fromIndex: number
  count: number
  referenceExerciseType?: PracticeExerciseType
}): Array<{
  id?: string
  situationRu: string
  targetAnswer: string
  options?: string[]
  brokenPhrase?: string
  interlocutorEn?: string
  dropdownFrameEn?: string
}> {
  const bank: Array<{
    id?: string
    situationRu: string
    targetAnswer: string
    options?: string[]
    brokenPhrase?: string
    interlocutorEn?: string
    dropdownFrameEn?: string
  }> = []

  for (let offset = 0; offset < params.count; offset += 1) {
    const stepIndex = params.fromIndex + offset
    const stepSpec = getPracticeStepSpec(params.mode, stepIndex)
    const exerciseType =
      params.mode === 'reference'
        ? (params.referenceExerciseType ?? 'choice')
        : (stepSpec?.type ?? CHALLENGE_STEP_SPECS[stepIndex]?.type ?? 'choice')
    const scenario = getLessonPracticeScenario({
      lesson: params.lesson,
      mode: params.mode,
      stepIndex,
      exerciseType,
      referenceExerciseType: params.referenceExerciseType,
    })
    if (!scenario) continue
    const withId = scenario as LessonPracticeScenario
    bank.push({
      id: withId.id,
      situationRu: scenario.situationRu,
      targetAnswer: scenario.targetAnswer,
      options: scenario.options,
      brokenPhrase: scenario.brokenPhrase,
      interlocutorEn: scenario.interlocutorEn,
      dropdownFrameEn: scenario.dropdownFrameEn,
    })
  }

  return bank
}
