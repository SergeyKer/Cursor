import {
  BOSS_CHALLENGE_SYSTEM_RULES,
  bossChallengePromptHasContext,
  buildBossChallengePrompt,
  buildEtalonBossChallengePromptForLesson,
  findLessonBossChallengeSourceForPractice,
} from '@/lib/practice/prompt/buildBossChallengePrompt'
import {
  DICTATION_SYSTEM_RULES,
  buildDictationPrompt,
  buildEtalonDictationPromptForLesson,
  dictationPromptHasContext,
  findLessonDictationSourceForPractice,
} from '@/lib/practice/prompt/buildDictationPrompt'
import {
  DROPDOWN_FILL_SYSTEM_RULES,
  buildDropdownFillPrompt,
  buildEtalonDropdownFillPromptForLesson,
  dropdownFillPromptHasContext,
  findLessonDropdownFillSourceForPractice,
} from '@/lib/practice/prompt/buildDropdownFillPrompt'
import {
  FREE_RESPONSE_SYSTEM_RULES,
  buildEtalonFreeResponsePromptForLesson,
  buildFreeResponsePrompt,
  findLessonFreeResponseSourceForPractice,
  freeResponsePromptHasContext,
} from '@/lib/practice/prompt/buildFreeResponsePrompt'
import {
  LISTENING_SELECT_SYSTEM_RULES,
  buildEtalonListeningSelectPromptForLesson,
  buildListeningSelectPrompt,
  findLessonListeningSelectSourceForPractice,
  listeningSelectPromptHasContext,
} from '@/lib/practice/prompt/buildListeningSelectPrompt'
import {
  ROLEPLAY_MINI_SYSTEM_RULES,
  buildEtalonRoleplayPromptForLesson,
  buildRoleplayPrompt,
  findLessonRoleplaySourceForPractice,
  roleplayPromptHasContext,
} from '@/lib/practice/prompt/buildRoleplayPrompt'
import {
  SPEED_ROUND_SYSTEM_RULES,
  buildEtalonSpeedRoundPromptForLesson,
  buildSpeedRoundPrompt,
  findLessonSpeedRoundSourceForPractice,
  speedRoundPromptHasContext,
} from '@/lib/practice/prompt/buildSpeedRoundPrompt'
import type { PracticePromptSource } from '@/lib/practice/prompt/promptSourceTypes'
import { REFERENCE_STEP_MAP_TYPES } from '@/lib/practice/prompt/promptSourceTypes'
import type { LessonData } from '@/types/lesson'
import type { PracticeExerciseType } from '@/types/practice'

export type PracticePromptBuilderEntry = {
  findSource: (lesson: LessonData, stepIndex: number) => PracticePromptSource | null
  buildPrompt: (source: PracticePromptSource, lesson: LessonData, stepIndex: number, targetAnswer: string) => string | null
  buildEtalonForLesson: (lesson: LessonData, stepIndex: number) => string | null
  hasContext: (prompt: string) => boolean
  systemRules: readonly string[]
}

const BUILDERS: Partial<Record<PracticeExerciseType, PracticePromptBuilderEntry>> = {
  'free-response': {
    findSource: findLessonFreeResponseSourceForPractice,
    buildPrompt: (source, lesson, stepIndex) => buildFreeResponsePrompt(source, lesson, stepIndex),
    buildEtalonForLesson: buildEtalonFreeResponsePromptForLesson,
    hasContext: freeResponsePromptHasContext,
    systemRules: FREE_RESPONSE_SYSTEM_RULES,
  },
  'dropdown-fill': {
    findSource: findLessonDropdownFillSourceForPractice,
    buildPrompt: (source, lesson, stepIndex) => buildDropdownFillPrompt(source, lesson, stepIndex),
    buildEtalonForLesson: buildEtalonDropdownFillPromptForLesson,
    hasContext: dropdownFillPromptHasContext,
    systemRules: DROPDOWN_FILL_SYSTEM_RULES,
  },
  dictation: {
    findSource: findLessonDictationSourceForPractice,
    buildPrompt: (source, lesson, stepIndex, targetAnswer) =>
      buildDictationPrompt(source, lesson, stepIndex, targetAnswer),
    buildEtalonForLesson: buildEtalonDictationPromptForLesson,
    hasContext: dictationPromptHasContext,
    systemRules: DICTATION_SYSTEM_RULES,
  },
  'listening-select': {
    findSource: findLessonListeningSelectSourceForPractice,
    buildPrompt: (source, lesson, stepIndex, targetAnswer) =>
      buildListeningSelectPrompt(source, lesson, stepIndex, targetAnswer),
    buildEtalonForLesson: buildEtalonListeningSelectPromptForLesson,
    hasContext: listeningSelectPromptHasContext,
    systemRules: LISTENING_SELECT_SYSTEM_RULES,
  },
  'roleplay-mini': {
    findSource: findLessonRoleplaySourceForPractice,
    buildPrompt: (source, lesson, stepIndex) => buildRoleplayPrompt(source, lesson, stepIndex),
    buildEtalonForLesson: buildEtalonRoleplayPromptForLesson,
    hasContext: roleplayPromptHasContext,
    systemRules: ROLEPLAY_MINI_SYSTEM_RULES,
  },
  'speed-round': {
    findSource: findLessonSpeedRoundSourceForPractice,
    buildPrompt: (source, lesson) => buildSpeedRoundPrompt(source, lesson),
    buildEtalonForLesson: buildEtalonSpeedRoundPromptForLesson,
    hasContext: speedRoundPromptHasContext,
    systemRules: SPEED_ROUND_SYSTEM_RULES,
  },
  'boss-challenge': {
    findSource: findLessonBossChallengeSourceForPractice,
    buildPrompt: (source, lesson, stepIndex) => buildBossChallengePrompt(source, lesson, stepIndex),
    buildEtalonForLesson: buildEtalonBossChallengePromptForLesson,
    hasContext: bossChallengePromptHasContext,
    systemRules: BOSS_CHALLENGE_SYSTEM_RULES,
  },
}

export function isReferenceStepMapType(type: PracticeExerciseType): boolean {
  return REFERENCE_STEP_MAP_TYPES.has(type)
}

export function getPracticePromptBuilder(type: PracticeExerciseType): PracticePromptBuilderEntry | undefined {
  return BUILDERS[type]
}

export function buildEtalonPromptForReferenceType(
  lesson: LessonData,
  type: PracticeExerciseType,
  stepIndex = 0
): string | null {
  return getPracticePromptBuilder(type)?.buildEtalonForLesson(lesson, stepIndex) ?? null
}

export function collectReferencePromptBuilderSystemRules(type: PracticeExerciseType): string[] {
  const builder = getPracticePromptBuilder(type)
  return builder ? [...builder.systemRules] : []
}

export function buildReferencePromptFromLesson(params: {
  lesson: LessonData
  type: PracticeExerciseType
  stepIndex: number
  targetAnswer: string
}): string | null {
  const builder = getPracticePromptBuilder(params.type)
  if (!builder) return null
  const source = builder.findSource(params.lesson, params.stepIndex)
  if (!source) return null
  return builder.buildPrompt(source, params.lesson, params.stepIndex, params.targetAnswer)
}
