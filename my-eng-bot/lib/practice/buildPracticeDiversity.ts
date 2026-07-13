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
      'targetAnswer fills ___ and matches RU + gap object (пить чай / ___ tea → drink, never go/eat/sleep); options MUST include targetAnswer.',
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
      'listening-select: Russian situational prompt only (Ситуация:/Тема:); no Прослушайте / Переведите / gap-fill in prompt.',
      'Put English phrase only in audioText/targetAnswer; exactly 3 options including targetAnswer; leave hint empty.'
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
      'Each scenario needs a unique Russian situation and matching targetAnswer on the same axis.',
      'Lesson 1: weather/distance → It\'s + adj; «Пора …» → It\'s time to + verb OR It\'s time for + noun; never mix axes; never target "It\'s time." alone.',
      'Broken stays on the same grammar axis as targetAnswer; STT-safe content-word error.',
      'Rotate situations; never reuse identical Russian situation text across scenarios in one reference pass.'
    )
  } else if (params.referenceExerciseType === 'boss-challenge') {
    parts.push(
      'boss-challenge: Russian Ситуация:/Тема: + short concrete Russian action frame; minWords 4; soft; no exam meta.',
      'Never put English pattern starters in prompt (I am…, Who…, I know what…); anchors belong in keywords only.',
      'Never use Финальный вызов / примените тему / соберите всё / Переведите / Исправьте / Собеседник.',
      'Rotate situations; never reuse identical Russian situation text across scenarios in one reference pass.',
      'keywords = pattern anchors (time to, I am, who…), not full target lexicon; hint empty; no options/audioText.'
    )
  } else if (params.referenceExerciseType === 'word-builder-pro') {
    parts.push(
      'word-builder-pro: full phrase puzzle + exactly 2 grammar-precision traps in extraWords (a/an/the swap preferred; morph +s/+es only on content words).',
      'Never use lesson verb alternates (sleep, drink) as traps. Prompt: Russian situation aligned with targetAnswer; no ___ gap-fill.'
    )
  }

  if (params.lesson.id === '1') {
    const category = params.suggestedScenario ? inferScenarioCategory(params.suggestedScenario) : 'general'
    parts.push(
      'Rotate across weather, time, and distance contexts for formal it (It\'s + adjective, It\'s time to + verb, It\'s time for + noun).',
      'Do not default to darkness ("темно" / It\'s dark) unless it is the only unused scenario.',
      'Correct targets: It\'s + adj, It\'s time to + base verb, OR It\'s time for + noun (lunch/dinner/bed/a break).',
      'Broken/distractor only: time for + verb (It\'s time for go) and time to + noun (It\'s time to dinner). Never use ambiguous for sleep as a correct for+noun axis.',
      category !== 'general' ? `Current category hint: ${category}.` : ''
    )
  } else if (params.lesson.id === '2') {
    parts.push(
      'Who questions lesson: subject Who + verb-s/is/are only; never object-Who (Who do / Who does) as correct.',
      'Roleplay: interlocutor Who…?; targetAnswer = Name + verb-s.',
      'listening-select: audioText === targetAnswer; prefer declarative contrast (Anna likes tea / Max likes tea).',
      'Contrast distractors: Who like, What likes, Who does works.',
      'When practiceScenarioBank is provided, mirror its grammar pattern but vary wording.'
    )
  } else if (params.lesson.id === '3') {
    parts.push(
      'Embedded questions lesson: inside Do you know / Tell me / I know clauses use declarative order (what she likes), never auxiliary inversion (what does she like).',
      'Roleplay interlocutor must use Do you know / Can you tell me + embedded clause, never direct WH with does (Where does Anna work?).',
      'Contrast distractors: does-inversion, missing -s, wrong word order (likes he).',
      'Rotate lead phrases: I know, I don\'t know, Tell me, Do you know across scenarios.',
      'When practiceScenarioBank is provided, mirror its grammar pattern and field structure but vary wording; do not copy prompts verbatim.'
    )
  } else if (params.lesson.id === '4') {
    parts.push(
      'Self-intro lesson: I am/I\'m + adjective (mood), from + place, a/an + role.',
      'a before consonant (student/teacher); an before vowel sound (engineer).',
      'Reject I from / I am from in as correct answers.',
      'error-fix: prefer missing am (I from Russia → I am from Russia) over pure country swaps.',
      'Boss/compound: prefer city + mood (I am from Moscow and I am happy) when synthesizing.',
      'When practiceScenarioBank is provided, mirror its grammar pattern but vary wording.'
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
      'error-fix: Ситуация + Исправьте broken phrase; STT-safe lexical error; no options; hint empty; rotate situations.',
      'Lesson 1: keep situation and targetAnswer on one axis (It\'s + adj vs It\'s time to + verb vs It\'s time for + noun); never incomplete "It\'s time."'
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
  if (params.practiceType === 'boss-challenge') {
    parts.push(
      'boss-challenge: situational final; Russian Ситуация + concrete Russian action frame; minWords 4; soft; no translate/exam meta.',
      'Never put English pattern starters in prompt (I am…, Who…, I know what…).'
    )
  }
  if (params.lesson.id === '1') {
    parts.push(
      'Rotate weather, time, and distance; avoid repeating "темно" / It\'s dark in consecutive items.',
      'Correct axes: It\'s + adj, It\'s time to + verb, or It\'s time for + noun (lunch/dinner/bed/a break).',
      'Keep for+verb and to+noun as error/distractor patterns only.'
    )
  }
  if (params.lesson.id === '2') {
    parts.push(
      'Subject Who + verb-s/is/are only; no object-Who correct answers.',
      'Challenge step 10 roleplay: targetAnswer equals free-response anchor (declarative Name + verb-s).',
      'When practiceScenarioBank is present, use it as the quality template for new scenarios.'
    )
  }
  if (params.lesson.id === '3') {
    parts.push(
      'Embedded questions: declarative order in embedded clauses; reject what does / where does patterns in correct answers.',
      'Challenge step 10 roleplay: interlocutor elicits the same embedded phrase as free-response anchor.',
      'When practiceScenarioBank is present, use it as the quality template for new scenarios.',
      'situationRu must be oblique (context), not a literal RU translation of targetAnswer (except free-response translateRu).',
      'hint must be empty: never put grammar recipes like "Tell me + what + she + likes".'
    )
  }
  if (params.lesson.id === '4') {
    parts.push(
      'Self-intro: I am/I\'m + mood adj, from + place, a/an correctly.',
      'error-fix: prefer missing am over country lexical swaps.',
      'Boss/compound: city + mood when synthesizing two parts.',
      'Challenge step 10 roleplay: targetAnswer equals free-response anchor (from-place phrase).',
      'When practiceScenarioBank is present, use it as the quality template for new scenarios.'
    )
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
