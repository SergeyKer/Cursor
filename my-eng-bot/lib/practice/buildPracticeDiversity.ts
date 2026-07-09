import type { LessonData, LessonRepeatVariantProfile } from '@/types/lesson'
import type { PracticeMode, PracticeExerciseType } from '@/types/practice'
import { getPracticeStepSpec } from '@/lib/practice/engine/stepSpec'
import { applyStructuredLessonVariant } from '@/lib/structuredLessonVariants'

export type PracticeScenarioCategory = 'weather' | 'time' | 'distance' | 'general'

const LESSON_1_SCENARIO_CATEGORY_HINTS: Record<PracticeScenarioCategory, string[]> = {
  weather: ['холодно', 'жарко', 'тепло', 'прохладно', 'солнечно', 'ветер', 'темно', 'дождь', 'снег', 'rainy'],
  time: ['поздно', 'рано', 'пора', 'часов', 'час'],
  distance: ['далеко', 'недалеко', 'близко'],
  general: [],
}

export function pickVariantProfileForStep(
  lesson: LessonData,
  stepIndex: number
): LessonRepeatVariantProfile | null {
  const profiles = lesson.repeatConfig?.variantProfiles ?? []
  if (profiles.length === 0) return null
  const normalized = ((stepIndex % profiles.length) + profiles.length) % profiles.length
  return profiles[normalized] ?? profiles[0] ?? null
}

export function lessonForPracticeStep(lesson: LessonData, stepIndex: number): LessonData {
  const profile = pickVariantProfileForStep(lesson, stepIndex)
  if (!profile) return lesson
  return applyStructuredLessonVariant(lesson, profile)
}

function rotateItems<T>(items: T[], startIndex: number): T[] {
  if (items.length === 0) return []
  const offset = ((startIndex % items.length) + items.length) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function normalizePromptKey(prompt: string): string {
  return prompt.trim().toLowerCase()
}

export function pickSuggestedScenario(
  situations: string[],
  stepIndex: number,
  recentPrompts: string[] = []
): string | undefined {
  if (situations.length === 0) return undefined
  const recentKeys = new Set(recentPrompts.map(normalizePromptKey).filter(Boolean))
  for (const situation of rotateItems(situations, stepIndex)) {
    const key = normalizePromptKey(situation)
    if (!key || recentKeys.has(key)) continue
    return situation
  }
  return rotateItems(situations, stepIndex)[0]
}

export function collectPracticeSourceSituations(lesson: LessonData): string[] {
  return (lesson.repeatConfig?.sourceSituations ?? []).filter((item) => item.trim().length > 0)
}

export function inferScenarioCategory(situation: string): PracticeScenarioCategory {
  const normalized = situation.toLowerCase()
  for (const [category, hints] of Object.entries(LESSON_1_SCENARIO_CATEGORY_HINTS) as Array<
    [PracticeScenarioCategory, string[]]
  >) {
    if (category === 'general') continue
    if (hints.some((hint) => normalized.includes(hint))) return category
  }
  return 'general'
}

function buildReferenceDiversityRule(params: {
  lesson: LessonData
  stepIndex: number
  total: number
  suggestedScenario?: string
  sourceSituations: string[]
  referenceExerciseType?: PracticeExerciseType
}): string {
  const scenarioNumber = params.stepIndex + 1
  const parts = [
    `Scenario ${scenarioNumber} of ${params.total}: generate a fresh Russian situation.`,
    params.suggestedScenario
      ? `Anchor on suggestedScenario: "${params.suggestedScenario}".`
      : 'Pick a fresh situation from sourceSituations.',
    'Do not repeat recentPrompts or seenKeys.',
    'Keep referenceExerciseType and mirror referenceCanonicalStep answer pattern (state vs action, not literal wording).',
  ]

  if (params.referenceExerciseType === 'free-response') {
    parts.push(
      'Translate task: prompt must be Переведите на английский: "…" with a Russian phrase from referenceCanonicalStep.exercise.variants.',
      'Each scenario must use a different Russian phrase and matching targetAnswer; do not set keywords or minWords.'
    )
  } else if (params.referenceExerciseType === 'dropdown-fill') {
    parts.push(
      'Gap-fill task: prompt must be Выберите слово для пропуска: "{RU}" - «{English frame with ___}».',
      'Russian phrase must name what maps to targetAnswer; options must be single words of the same class (3 closed / 4 open lexical).',
      'Never mix articles into country gaps.'
    )
  } else if (params.referenceExerciseType === 'dictation') {
    parts.push(
      'Dictation task: prompt is Russian situational context only: Ситуация: "{RU from sourceSituations}".',
      'Put English phrase only in audioText/targetAnswer; leave hint empty; never use Переведите or gap-fill wording.',
      'Rotate weather / time / distance contexts; never reuse identical Russian situation in prompt.'
    )
  } else if (params.referenceExerciseType === 'listening-select') {
    parts.push(
      'Put English phrase only in audioText/targetAnswer; Russian situational prompt (Ситуация/Тема) without listening instruction.'
    )
  } else if (params.referenceExerciseType === 'roleplay-mini') {
    parts.push(
      'Mini-dialogue: prompt MUST include RU role intro + Собеседник: «{EN question}?».',
      'Each scenario needs a unique targetAnswer, intro, and interlocutor EN question.',
      'Never reuse targetAnswer from recentTargetAnswers or interlocutor from recentInterlocutorLines.',
      'targetAnswer is declarative EN; lesson 2 uses declarative part only from step 6 pairs.',
      'targetAnswer follows lesson blueprint step 6; minWords: 2; keywords must all match in validation.'
    )
  } else if (params.referenceExerciseType === 'error-fix') {
    parts.push(
      'error-fix: Russian Ситуация:/Тема: + Исправьте: "{broken}."; lexical wrong-word preferred; no options/audioText/hint.',
      'Rotate situations; never reuse identical Russian situation text across scenarios in one reference pass.'
    )
  } else if (params.referenceExerciseType === 'boss-challenge') {
    parts.push('Final challenge; minWords 5; apply lesson theme creatively.')
  } else if (params.referenceExerciseType === 'word-builder-pro') {
    parts.push(
      'word-builder-pro: full phrase puzzle + exactly 2 grammar-precision traps in extraWords (a/an/the swap preferred; morph +s/+es only on content words).',
      'Never use lesson verb alternates (sleep, drink) as traps. Prompt: Russian situation aligned with targetAnswer; no ___ gap-fill.'
    )
  }

  if (params.lesson.id === '1') {
    const category = params.suggestedScenario ? inferScenarioCategory(params.suggestedScenario) : 'general'
    parts.push(
      'Rotate across weather, time, and distance contexts for formal it (It\'s + adjective vs It\'s time to + verb).',
      'Do not default to darkness ("темно" / It\'s dark) unless it is the only unused scenario.',
      category !== 'general' ? `Current category hint: ${category}.` : ''
    )
  } else if (params.sourceSituations.length > 0) {
    parts.push('Use vocabulary and situations from sourceSituations; do not copy the default lesson hook verbatim.')
  }

  return parts.filter(Boolean).join(' ')
}

function buildSessionDiversityRule(params: {
  lesson: LessonData
  suggestedScenario?: string
  sourceSituations: string[]
  practiceType?: PracticeExerciseType
  stepIndex?: number
}): string {
  const parts = [
    'Avoid repeating seenKeys; generate fresh prompts and answers.',
    params.suggestedScenario
      ? `Prefer a scenario related to: "${params.suggestedScenario}".`
      : 'Vary micro-situations across sourceSituations.',
  ]
  if (params.practiceType === 'word-builder-pro') {
    parts.push(
      'word-builder-pro: full phrase puzzle + exactly 2 grammar traps in extraWords; Russian situation aligned with targetAnswer; no gap-fill.'
    )
  }
  if (params.practiceType === 'dictation') {
    parts.push(
      'dictation: one-line Russian situation Ситуация: "{RU}"; full sentence in audioText/targetAnswer; hint empty; no listening instruction in prompt.'
    )
  }
  if (params.practiceType === 'listening-select') {
    parts.push(
      'listening-select: Russian situational prompt only; English phrase in audioText/targetAnswer; exactly 3 options; hint empty; never repeat targetAnswer in prompt.'
    )
  }
  if (params.practiceType === 'error-fix') {
    parts.push(
      'error-fix: Ситуация + Исправьте broken phrase; STT-safe lexical error; no options; hint empty; rotate situations.'
    )
  }
  if (params.practiceType === 'roleplay-mini') {
    parts.push(
      'roleplay-mini: RU intro + Собеседник EN question ending with ?; targetAnswer declarative EN; minWords 2.'
    )
    if (params.stepIndex === 9) {
      parts.push(
        'CHALLENGE step 10: targetAnswer MUST equal anchor phrase from priorSessionPhrases; interlocutor elicits that same phrase.'
      )
    }
  }
  if (params.lesson.id === '1') {
    parts.push('Rotate weather, time, and distance; avoid repeating "темно" / It\'s dark in consecutive items.')
  }
  return parts.join(' ')
}

export type PracticeDiversityPayload = {
  sourceSituations: string[]
  grammarFocus?: string[]
  ruleSummary?: string
  suggestedScenario?: string
  selectedVariantProfileId?: string
  scenarioCategories?: PracticeScenarioCategory[]
  diversityRule: string
}

export function buildPracticeDiversityPayload(params: {
  lesson: LessonData
  mode: PracticeMode
  stepIndex: number
  total?: number
  recentPrompts?: string[]
  referenceExerciseType?: PracticeExerciseType
}): PracticeDiversityPayload {
  const sourceSituations = collectPracticeSourceSituations(params.lesson)
  const suggestedScenario = pickSuggestedScenario(sourceSituations, params.stepIndex, params.recentPrompts)
  const profile = pickVariantProfileForStep(params.lesson, params.stepIndex)
  const repeatConfig = params.lesson.repeatConfig

  const stepSpec = getPracticeStepSpec(params.mode, params.stepIndex)
  const diversityRule =
    params.mode === 'reference'
      ? buildReferenceDiversityRule({
          lesson: params.lesson,
          stepIndex: params.stepIndex,
          total: params.total ?? 7,
          suggestedScenario,
          sourceSituations,
          referenceExerciseType: params.referenceExerciseType,
        })
      : buildSessionDiversityRule({
          lesson: params.lesson,
          suggestedScenario,
          sourceSituations,
          practiceType: params.referenceExerciseType ?? stepSpec?.type,
          stepIndex: params.stepIndex,
        })

  return {
    sourceSituations,
    grammarFocus: repeatConfig?.grammarFocus,
    ruleSummary: repeatConfig?.ruleSummary,
    suggestedScenario,
    selectedVariantProfileId: profile?.id,
    scenarioCategories: params.lesson.id === '1' ? ['weather', 'time', 'distance'] : undefined,
    diversityRule,
  }
}
