import { NextRequest, NextResponse } from 'next/server'
import { callProviderChat } from '@/lib/callProviderChat'
import { buildEtalonChoicePromptForLesson, findLessonChoiceStepForPractice } from '@/lib/practice/buildChoicePrompt'
import { buildPracticeDiversityPayload, lessonForPracticeStep } from '@/lib/practice/buildPracticeDiversity'
import { buildLocalPracticeSession } from '@/lib/practice/builders/localPracticeBuilder'
import { collectPracticeScenarioBank } from '@/lib/practice/lessonPracticeScenario'
import { enforceStepSpecs } from '@/lib/practice/enforceStepSpecs'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { getPracticeStepsForRange } from '@/lib/practice/engine/stepSpec'
import { buildProviderUserMessage, PRACTICE_REFERENCE_FALLBACK_NOTICE } from '@/lib/buildProviderUserMessage'
import { inferGapWordSlot } from '@/lib/practice/gapWordSlot'
import { DROPDOWN_FILL_SYSTEM_RULES } from '@/lib/practice/prompt/buildDropdownFillPrompt'
import { DICTATION_SYSTEM_RULES } from '@/lib/practice/prompt/buildDictationPrompt'
import { ROLEPLAY_MINI_SYSTEM_RULES } from '@/lib/practice/prompt/buildRoleplayPrompt'
import { BOSS_CHALLENGE_SYSTEM_RULES } from '@/lib/practice/prompt/buildBossChallengePrompt'
import { ERROR_FIX_SYSTEM_RULES } from '@/lib/practice/prompt/buildErrorFixPrompt'
import { sanitizeCanonicalOptions } from '@/lib/practice/sanitizeCanonicalOptions'
import {
  buildEtalonPromptForReferenceType,
  collectReferencePromptBuilderSystemRules,
  isReferenceStepMapType,
} from '@/lib/practice/prompt/practicePromptBuilders'
import { pickFreshReferencePracticeQuestion } from '@/lib/practice/pickFreshReferencePracticeQuestion'
import { buildReferenceFallbackQuestion } from '@/lib/practice/referenceFallbackQuestion'
import { getReferenceExerciseChallengeStep } from '@/lib/practice/referenceExerciseOptions'
import { resolvePracticeLessonStep } from '@/lib/practice/resolvePracticeLessonStep'
import { resolveReferenceLessonStep } from '@/lib/practice/resolveReferenceLessonStep'
import { buildPracticeQuestionFingerprintFromQuestion, normalizePracticeFingerprintPart } from '@/lib/practice/questionFingerprint'
import { normalizeAiPracticeQuestion } from '@/lib/practice/normalizeAiPracticeQuestion'
import type { PriorSessionPhrase } from '@/lib/practice/roleplaySessionContinuity'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import type { AiProvider, Audience, OpenAiChatPreset } from '@/lib/types'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType, PracticeMode, PracticeQuestion } from '@/types/practice'

type Body = {
  provider?: AiProvider
  openAiChatPreset?: OpenAiChatPreset
  audience?: Audience
  lessonId?: string
  lesson?: LessonData
  mode?: PracticeMode
  referenceExerciseType?: PracticeExerciseType
  referenceStepIndex?: number
  referenceTotal?: number
  recentPrompts?: string[]
  count?: number
  fromIndex?: number
  seenKeys?: string[]
  choiceLikeWrongCountBefore?: number
  priorSessionPhrases?: PriorSessionPhrase[]
  recentTargetAnswers?: string[]
  recentInterlocutorLines?: string[]
}

type PracticeGenerateFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_lesson'
const MAX_GENERATE_ATTEMPTS = 2
const MAX_REFERENCE_GENERATE_ATTEMPTS = 4

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return ''
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === 'relaxed' || value === 'balanced' || value === 'challenge' || value === 'reference'
}

function isPracticeExerciseType(value: unknown): value is PracticeExerciseType {
  return (
    value === 'choice' ||
    value === 'voice-shadow' ||
    value === 'dropdown-fill' ||
    value === 'listening-select' ||
    value === 'sentence-surgery' ||
    value === 'free-response' ||
    value === 'word-builder-pro' ||
    value === 'dictation' ||
    value === 'roleplay-mini' ||
    value === 'boss-challenge' ||
    value === 'error-fix' ||
    value === 'context-clue'
  )
}

function resolveBodyPracticeType(value: unknown): PracticeExerciseType | undefined {
  if (value === 'speed-round') return 'error-fix'
  return isPracticeExerciseType(value) ? value : undefined
}

function fallbackQuestions(lesson: LessonData, mode: PracticeMode): PracticeQuestion[] {
  return buildLocalPracticeSession({
    lesson,
    mode,
    source: { kind: 'static_lesson', lessonId: lesson.id },
    entrySource: 'menu',
    generationSource: 'local',
  }).questions
}

function normalizeQuestions(
  rawQuestions: unknown,
  lesson: LessonData,
  mode: PracticeMode,
  requestedCount: number,
  fromIndex: number,
  referenceExerciseType?: PracticeExerciseType,
  recentPrompts: string[] = [],
  seenKeys: string[] = [],
  choiceLikeWrongCountBefore?: number,
  priorSessionPhrases: PriorSessionPhrase[] = [],
  recentTargetAnswers: string[] = [],
  recentInterlocutorLines: string[] = []
): PracticeQuestion[] {
  if (!Array.isArray(rawQuestions)) return []
  const plan = getPracticeModePlan(mode)
  const clampedCount = Math.max(1, Math.min(requestedCount, plan.length))
  const allowedTypes = new Set(plan.types)
  const rawSlice = rawQuestions.slice(0, plan.length)
  const normalized: PracticeQuestion[] = []
  for (let index = 0; index < rawSlice.length; index += 1) {
    const question = normalizeAiPracticeQuestion(rawSlice[index], lesson, fromIndex + index, {
      mode,
      referenceExerciseType: mode === 'reference' ? referenceExerciseType : undefined,
      priorSessionPhrases,
      priorQuestionsInBatch: normalized,
    })
    if (question) normalized.push(question)
  }
  let questions =
    mode === 'reference'
      ? normalized
      : normalized.filter((question) => allowedTypes.has(question.type) || (plan.boss && question.type === 'boss-challenge'))

  if (mode !== 'reference' && questions.length > 0) {
    questions = enforceStepSpecs(
      questions,
      lesson,
      mode,
      fromIndex,
      rawSlice.slice(0, questions.length),
      choiceLikeWrongCountBefore,
      priorSessionPhrases
    )
  }

  if (mode === 'reference') {
    const filteredByType = referenceExerciseType ? questions.filter((question) => question.type === referenceExerciseType) : []
    const fresh = pickFreshReferencePracticeQuestion(
      filteredByType,
      recentPrompts,
      seenKeys,
      recentTargetAnswers,
      recentInterlocutorLines
    )
    if (!fresh) return []
    return [{ ...fresh, id: `${fresh.id}-r${Date.now()}` }].slice(0, clampedCount)
  }

  if (questions.length === 0) return []
  if (plan.boss && clampedCount === plan.length && questions.at(-1)?.type !== 'boss-challenge') {
    const boss = questions.find((question) => question.type === 'boss-challenge')
    if (boss) {
      return [...questions.filter((question) => question.id !== boss.id), boss].slice(0, plan.length)
    }
  }
  return questions.slice(0, clampedCount)
}

const EMBEDDED_LESSON_3_SYSTEM_RULES = [
  'Lesson 3 embedded questions: embedded clauses use question word + subject + verb (what she likes), never auxiliary inversion (what does she like).',
  'Roleplay interlocutor for lesson 3: Do you know / Can you tell me + embedded clause; never direct WH with does.',
  'Boss answers for lesson 3 may require two clauses joined with but when suggestedScenario mentions Anna and Alex.',
] as const

const LESSON_1_SYSTEM_RULES = [
  'Lesson 1: use It\'s + adjective for state/weather/time, It\'s time to + base verb for action, and It\'s time for + noun for events (lunch/dinner/bed/a break).',
  'Broken/distractor only: time for + verb (It\'s time for go) and time to + noun (It\'s time to dinner). Do not treat ambiguous for sleep as a correct for+noun target.',
  'Reject Its / It cold / time to goes as correct answers.',
] as const

const LESSON_2_SYSTEM_RULES = [
  'Lesson 2: subject Who + verb-s/is/are only (Who likes / Who works / Who is).',
  'Do not generate object-Who (Who do you know / Who does she like) as correct targets.',
  'Roleplay: interlocutor asks Who…?, learner answers with Name + verb-s (My brother likes tea.).',
  'listening-select: audioText must equal targetAnswer; use declarative answers, not Who-questions as audio.',
] as const

const LESSON_4_SYSTEM_RULES = [
  'Lesson 4: I am/I\'m + adjective, I am/I\'m from + place, a/an + role.',
  'Use a before consonant (a student) and an before vowel sound (an engineer).',
  'Reject I from / I am from in as correct answers.',
] as const

function lessonSystemRules(lessonId?: string): readonly string[] {
  if (lessonId === '1') return LESSON_1_SYSTEM_RULES
  if (lessonId === '2') return LESSON_2_SYSTEM_RULES
  if (lessonId === '3') return EMBEDDED_LESSON_3_SYSTEM_RULES
  if (lessonId === '4') return LESSON_4_SYSTEM_RULES
  return []
}

function lessonHasPracticeScenarioBank(lesson: LessonData): boolean {
  const repeat = lesson.repeatConfig
  return Boolean(
    repeat?.challengeAtoms?.length ||
      (repeat?.referenceScenariosByType && Object.keys(repeat.referenceScenariosByType).length > 0) ||
      (repeat?.sessionScenarios && Object.keys(repeat.sessionScenarios).length > 0)
  )
}

function buildSystemPrompt(params?: {
  lessonId?: string
  referenceExerciseType?: PracticeExerciseType
}): string {
  const referenceExerciseType = params?.referenceExerciseType
  const typeRules =
    referenceExerciseType && isReferenceStepMapType(referenceExerciseType)
      ? collectReferencePromptBuilderSystemRules(referenceExerciseType)
      : []
  const lessonRules = lessonSystemRules(params?.lessonId)

  return [
    'You generate short English practice exercises for a learner app.',
    'Return ONLY valid JSON object: {"questions":[...]}',
    'Each question must have: type, prompt, targetAnswer, acceptedAnswers, shuffledWords, audioText, keywords, minWords, hint, explanation.',
    'If type is choice, listening-select, or context-clue, you must provide at least 3 English options and include targetAnswer in the options.',
    'For type dropdown-fill: options count is 3 for closed-class slots (articles, pronouns) or 4 for open lexical slots (countries, names); include targetAnswer.',
    ...DROPDOWN_FILL_SYSTEM_RULES,
    ...DICTATION_SYSTEM_RULES,
    ...ROLEPLAY_MINI_SYSTEM_RULES,
    ...ERROR_FIX_SYSTEM_RULES,
    ...BOSS_CHALLENGE_SYSTEM_RULES,
    'Never mix single-word options and full-sentence options in one question.',
    'When canonicalSourceExercise is provided, mirror its answerFormat, prompt structure, and exactly 3 options when the lesson step has 3.',
    'context-clue with ___ in prompt: options must be single words only. context-clue with translation/situation: options must be full sentences only.',
    'For type choice: prompt MUST include a Russian situational context (Ситуация / Тема + clear task). Never use vague prompts like "Choose the best option" without context.',
    'For type choice: provide exactly 3 natural English options when possible; distractors depend on distractorTier in steps payload.',
    'distractorTier obvious: different scenario/pattern, clearly wrong but grammatical.',
    'distractorTier semantic-near: same semantic field, wrong fit for context.',
    'distractorTier minimal-pair: spelling/phonetic confusables, 1-2 character differences.',
    'For type voice-shadow: prompt MUST be Russian situational context only (Ситуация / Тема) or a neutral listen-and-repeat instruction. Never include targetAnswer or phrases like "Повторите фразу: ..." in prompt.',
    'For type voice-shadow: put the full English phrase only in audioText and targetAnswer. Leave hint empty.',
    'For type sentence-surgery: one phrase only — never "three sentences" lesson copy. shuffledWords must be exact word tokens of targetAnswer (no period token). prompt: Russian situation + arrange words in order. Do not include extraWords.',
    'For type word-builder-pro: same as sentence-surgery plus extraWords with exactly 2 grammar-precision traps (a/an/the preferred; morph +s/+es on content words only, never lesson verb alternates like sleep/drink). Prompt: Russian situation aligned with targetAnswer; no ___ gap-fill.',
    'Do not omit options for choice-like question types.',
    'All English answers and options must be natural, grammatical English. Wrong options may be incorrect for the task, but never nonsense or broken phrases like "It\'s dark to go.".',
    'Prompts can be in Russian with English targets. Keep the tone warm and concise.',
    'If referenceExerciseType is provided, every generated question.type must exactly match it.',
    'If etalonChoicePrompt is provided, follow the same pedagogical logic but use a new scenario and wording.',
    'If etalonReferencePrompt is provided, mirror its pedagogical frame but use fresh scenario wording.',
    'If sourceSituations is provided, vary Russian situations across that pool; do not copy etalonChoiceSource taskBubble verbatim.',
    'If suggestedScenario is provided, use it as the situational anchor unless recentPrompts forbid it.',
    'When referenceCanonicalStep options are provided, mirror option structure and grammar pattern but adapt sentences to the new scenario.',
    'If steps array is provided, each question at steps[N].stepIndex must use exactly steps[N].type and steps[N].distractorTier when set.',
    ...lessonRules,
    ...typeRules,
    'Do not include markdown.',
  ].join('\n')
}

function buildUserPayload(
  lesson: LessonData,
  mode: PracticeMode,
  audience: Audience,
  count: number,
  fromIndex: number,
  seenKeys: string[],
  referenceExerciseType?: PracticeExerciseType,
  referenceStepIndex?: number,
  referenceTotal?: number,
  recentPrompts: string[] = [],
  priorSessionPhrases: PriorSessionPhrase[] = [],
  recentTargetAnswers: string[] = [],
  recentInterlocutorLines: string[] = []
): string {
  const practiceStepIndex =
    mode === 'reference' ? (referenceStepIndex ?? 0) : fromIndex
  const diversity = buildPracticeDiversityPayload({
    lesson,
    mode,
    stepIndex: practiceStepIndex,
    total: referenceTotal,
    recentPrompts: mode === 'reference' ? recentPrompts : undefined,
    referenceExerciseType: mode === 'reference' ? referenceExerciseType : undefined,
  })
  const scopedLesson = lessonForPracticeStep(lesson, practiceStepIndex)
  const etalonChoice = findLessonChoiceStepForPractice(lesson, practiceStepIndex)
  const plan = getPracticeModePlan(mode)
  const steps =
    mode === 'reference'
      ? undefined
      : getPracticeStepsForRange(mode, fromIndex, count).map((step) => {
          const resolved = resolvePracticeLessonStep({
            lesson,
            practiceIndex: step.stepIndex,
            practiceType: step.type,
            mode,
          })
          return {
            ...step,
            canonicalSourceExercise: resolved
              ? {
                  stepNumber: resolved.sourceStepNumber,
                  exercise: resolved.exercise,
                  options: resolved.canonicalOptions,
                }
              : undefined,
          }
        })
  const referenceCanonicalStep =
    mode === 'reference' && referenceExerciseType
      ? (() => {
          const stepIndex = referenceStepIndex ?? 0
          const resolved = isReferenceStepMapType(referenceExerciseType)
            ? resolveReferenceLessonStep({
                lesson,
                referenceExerciseType,
                stepIndex,
              })
            : resolvePracticeLessonStep({
                lesson: scopedLesson,
                practiceIndex: stepIndex,
                practiceType: referenceExerciseType,
                mode,
                referenceExerciseType,
              })
          if (!resolved) return undefined
          const gapSlot =
            referenceExerciseType === 'dropdown-fill'
              ? inferGapWordSlot({
                  targetAnswer: resolved.exercise.correctAnswer,
                  prompt: resolved.exercise.question,
                })
              : undefined
          const sanitizedOptions =
            referenceExerciseType === 'dropdown-fill'
              ? sanitizeCanonicalOptions({
                  options: resolved.canonicalOptions ?? [],
                  targetAnswer: resolved.exercise.correctAnswer,
                  prompt: resolved.exercise.question,
                })
              : resolved.canonicalOptions
          return {
            challengeStep: getReferenceExerciseChallengeStep(referenceExerciseType),
            stepNumber: resolved.sourceStepNumber,
            exercise: resolved.exercise,
            options: sanitizedOptions ?? resolved.canonicalOptions,
            axis: resolved.axis,
            gapWordSlot: gapSlot,
          }
        })()
      : undefined
  const etalonReferencePrompt =
    mode === 'reference' && referenceExerciseType
      ? buildEtalonPromptForReferenceType(lesson, referenceExerciseType, practiceStepIndex) ?? undefined
      : undefined
  const practiceScenarioBank = lessonHasPracticeScenarioBank(lesson)
    ? collectPracticeScenarioBank({
        lesson,
        mode,
        fromIndex: practiceStepIndex,
        count: mode === 'reference' ? 7 : count,
        referenceExerciseType,
      })
    : undefined
  return JSON.stringify(
    {
      topic: lesson.topic,
      level: lesson.level,
      audience,
      mode,
      length: mode === 'reference' ? 1 : count,
      fromIndex,
      allowedTypes: plan.types,
      steps,
      referenceCanonicalStep,
      practiceScenarioBank,
      seenKeys: seenKeys.slice(-40),
      referenceExerciseType: mode === 'reference' ? referenceExerciseType : undefined,
      referenceStepIndex: mode === 'reference' ? referenceStepIndex : undefined,
      referenceTotal: mode === 'reference' ? referenceTotal : undefined,
      recentPrompts: mode === 'reference' ? recentPrompts : undefined,
      priorSessionPhrases: mode === 'challenge' ? priorSessionPhrases : undefined,
      recentTargetAnswers: mode === 'reference' ? recentTargetAnswers : undefined,
      recentInterlocutorLines: mode === 'reference' ? recentInterlocutorLines : undefined,
      ...diversity,
      diversityRule: diversity.diversityRule,
      mustEndWithBossChallenge: plan.boss,
      etalonChoicePrompt: buildEtalonChoicePromptForLesson(lesson, practiceStepIndex) ?? undefined,
      etalonReferencePrompt,
      etalonChoiceSource: etalonChoice
        ? {
            stepNumber: etalonChoice.step.stepNumber,
            variantProfileId: etalonChoice.variantProfileId,
            taskBubble: etalonChoice.step.bubbles.find((bubble) => bubble.type === 'task')?.content,
            question: etalonChoice.exercise.question,
            options: etalonChoice.exercise.options,
            correctAnswer: etalonChoice.exercise.correctAnswer,
          }
        : undefined,
      sourceExercises: lesson.steps
        .filter((step) => step.exercise)
        .map((step) => ({
          stepNumber: step.stepNumber,
          taskBubble: step.bubbles.find((bubble) => bubble.type === 'task')?.content,
          exercise: step.exercise,
        })),
    },
    null,
    2
  )
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Неверный JSON.' }, { status: 400 })
  }

  const mode = isPracticeMode(body.mode) ? body.mode : 'relaxed'
  const plan = getPracticeModePlan(mode)
  const referenceExerciseType = resolveBodyPracticeType(body.referenceExerciseType)
  const referenceStepIndex = Number.isFinite(body.referenceStepIndex) ? Math.max(0, Number(body.referenceStepIndex)) : 0
  const referenceTotal = Number.isFinite(body.referenceTotal) ? Math.max(1, Number(body.referenceTotal)) : 7
  const fromIndex = Number.isFinite(body.fromIndex) ? Math.max(0, Number(body.fromIndex)) : 0
  const requestedCount = Number.isFinite(body.count)
    ? Math.max(1, Math.min(plan.length, Number(body.count)))
    : mode === 'reference'
      ? 1
      : plan.length
  const recentPrompts = Array.isArray(body.recentPrompts)
    ? body.recentPrompts.filter((item): item is string => typeof item === 'string')
    : []
  const seenKeys = Array.isArray(body.seenKeys)
    ? body.seenKeys
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizePracticeFingerprintPart(item))
        .filter(Boolean)
        .slice(-80)
    : []
  const choiceLikeWrongCountBefore =
    Number.isFinite(body.choiceLikeWrongCountBefore) && body.choiceLikeWrongCountBefore! >= 0
      ? Math.floor(Number(body.choiceLikeWrongCountBefore))
      : undefined
  const priorSessionPhrases = Array.isArray(body.priorSessionPhrases)
    ? body.priorSessionPhrases
        .filter((item): item is PriorSessionPhrase => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          stepIndex: Number.isFinite(item.stepIndex) ? Number(item.stepIndex) : 0,
          type: resolveBodyPracticeType(item.type) ?? 'choice',
          targetAnswer: typeof item.targetAnswer === 'string' ? item.targetAnswer : '',
          prompt: typeof item.prompt === 'string' ? item.prompt : undefined,
        }))
        .filter((item) => item.targetAnswer.trim().length > 0)
    : []
  const recentTargetAnswers = Array.isArray(body.recentTargetAnswers)
    ? body.recentTargetAnswers.filter((item): item is string => typeof item === 'string')
    : []
  const recentInterlocutorLines = Array.isArray(body.recentInterlocutorLines)
    ? body.recentInterlocutorLines.filter((item): item is string => typeof item === 'string')
    : []
  const lesson = body.lesson ?? (body.lessonId ? getStructuredLessonById(body.lessonId) : null)
  if (!lesson) {
    return NextResponse.json({ error: 'Нет данных урока для практики.' }, { status: 400 })
  }
  if (mode === 'reference' && !referenceExerciseType) {
    return NextResponse.json({ error: 'Для эталона нужно выбрать тип упражнения.' }, { status: 422 })
  }

  const createReferenceError = (fallbackReason: PracticeGenerateFallbackReason) =>
    NextResponse.json(
      {
        error: 'Эталонный режим временно недоступен: генерация ИИ не вернула валидный набор упражнений.',
        fallback: false,
        fallbackReason,
      },
      { status: 502 }
    )

  const createFallback = (fallbackReason: PracticeGenerateFallbackReason) => ({
    questions: fallbackQuestions(lesson, mode).slice(fromIndex, fromIndex + requestedCount),
    generated: false,
    fallback: true,
    fallbackReason,
  })

  const buildReferenceFallbackApiPayload = (
    fallbackReason: PracticeGenerateFallbackReason,
    questions: PracticeQuestion[],
    lastProviderFailure: { status: number; errText: string } | null
  ) => {
    let providerError: string | undefined
    let fallbackNotice: string | undefined
    if (fallbackReason === 'provider' && lastProviderFailure) {
      providerError = buildProviderUserMessage({
        provider,
        status: lastProviderFailure.status,
        errText: lastProviderFailure.errText,
      }).userMessage
    } else {
      fallbackNotice = PRACTICE_REFERENCE_FALLBACK_NOTICE
    }
    return {
      questions,
      generated: false,
      fallback: true,
      fallbackReason,
      providerError,
      fallbackNotice,
    }
  }

  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai'
  const openAiChatPreset =
    body.openAiChatPreset === 'gpt-5.4-mini-none'
      ? 'gpt-5.4-mini-none'
      : body.openAiChatPreset === 'gpt-5.4-mini-low'
        ? 'gpt-5.4-mini-low'
        : 'gpt-4o-mini'
  const audience = body.audience ?? 'adult'

  try {
    const accumulated: PracticeQuestion[] = []
    const usedFingerprints = new Set(seenKeys)
    let fallbackReason: PracticeGenerateFallbackReason = 'validation'
    let lastProviderFailure: { status: number; errText: string } | null = null

    const maxGenerateAttempts = mode === 'reference' ? MAX_REFERENCE_GENERATE_ATTEMPTS : MAX_GENERATE_ATTEMPTS
    for (let attempt = 0; attempt < maxGenerateAttempts && accumulated.length < requestedCount; attempt += 1) {
      const model = await callProviderChat({
        provider,
        req,
        apiMessages: [
          { role: 'system', content: buildSystemPrompt({ lessonId: lesson.id, referenceExerciseType }) },
          {
            role: 'user',
            content: buildUserPayload(
              lesson,
              mode,
              audience,
              requestedCount,
              fromIndex + accumulated.length,
              Array.from(usedFingerprints),
              referenceExerciseType,
              referenceStepIndex,
              referenceTotal,
              recentPrompts,
              priorSessionPhrases,
              recentTargetAnswers,
              recentInterlocutorLines
            ),
          },
        ],
        maxTokens: mode === 'reference' ? 700 : Math.min(2200, Math.max(550, requestedCount * 420)),
        openAiChatPreset,
        traceLabel: 'practice-generate',
      })

      if (!model.ok) {
        fallbackReason = 'provider'
        lastProviderFailure = { status: model.status, errText: model.errText }
        continue
      }

      const json = extractJsonObject(model.content)
      if (!json) {
        fallbackReason = 'parse'
        continue
      }

      let parsed: { questions?: unknown }
      try {
        parsed = JSON.parse(json) as { questions?: unknown }
      } catch {
        fallbackReason = 'parse'
        continue
      }

      const candidates = normalizeQuestions(
        parsed.questions,
        lesson,
        mode,
        requestedCount,
        fromIndex + accumulated.length,
        referenceExerciseType,
        recentPrompts,
        seenKeys,
        choiceLikeWrongCountBefore,
        priorSessionPhrases,
        recentTargetAnswers,
        recentInterlocutorLines
      )
      if (candidates.length === 0) {
        fallbackReason = 'validation'
        continue
      }

      for (const candidate of candidates) {
        const fingerprint = buildPracticeQuestionFingerprintFromQuestion(candidate)
        if (!fingerprint || usedFingerprints.has(fingerprint)) continue
        usedFingerprints.add(fingerprint)
        accumulated.push({
          ...candidate,
          id: `${candidate.id}-g${Date.now()}-${attempt}-${accumulated.length}`,
        })
        if (accumulated.length >= requestedCount) break
      }
      if (accumulated.length > 0 && mode === 'reference') break
    }

    if (accumulated.length === 0) {
      if (mode === 'reference' && referenceExerciseType) {
        const referenceFallback = buildReferenceFallbackQuestion({
          lesson,
          mode,
          referenceExerciseType,
          referenceStepIndex,
          referenceTotal,
          recentPrompts,
          seenKeys,
          recentTargetAnswers,
          recentInterlocutorLines,
        })
        if (referenceFallback) {
          return NextResponse.json(
            buildReferenceFallbackApiPayload(fallbackReason, [referenceFallback], lastProviderFailure)
          )
        }
        return NextResponse.json(
          {
            error: `ИИ не вернул упражнение типа "${referenceExerciseType}". Перегенерируйте вариант.`,
            fallback: false,
            fallbackReason,
          },
          { status: 422 }
        )
      }
      return mode === 'reference' ? createReferenceError(fallbackReason) : NextResponse.json(createFallback(fallbackReason))
    }

    return NextResponse.json({
      questions: accumulated,
      generated: true,
      fallback: false,
    })
  } catch {
    return mode === 'reference' ? createReferenceError('exception') : NextResponse.json(createFallback('exception'))
  }
}

