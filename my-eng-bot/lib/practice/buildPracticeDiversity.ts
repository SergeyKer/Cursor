import type { LessonData, LessonRepeatVariantProfile } from '@/types/lesson'
import type { PracticeMode, PracticeExerciseType } from '@/types/practice'
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

function inferScenarioCategory(situation: string): PracticeScenarioCategory {
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
    parts.push('Single-word gap fill; at least 3 single-word English options.')
  } else if (params.referenceExerciseType === 'dictation' || params.referenceExerciseType === 'listening-select') {
    parts.push('Put English phrase only in audioText/targetAnswer; Russian situational prompt without the answer.')
  } else if (params.referenceExerciseType === 'roleplay-mini') {
    parts.push('Mini-dialogue lead in Russian; learner replies in 1-2 English sentences.')
  } else if (params.referenceExerciseType === 'speed-round') {
    parts.push('Quick situational choice with exactly 3 options.')
  } else if (params.referenceExerciseType === 'boss-challenge') {
    parts.push('Final challenge; minWords 5; apply lesson theme creatively.')
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
}): string {
  const parts = [
    'Avoid repeating seenKeys; generate fresh prompts and answers.',
    params.suggestedScenario
      ? `Prefer a scenario related to: "${params.suggestedScenario}".`
      : 'Vary micro-situations across sourceSituations.',
  ]
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
