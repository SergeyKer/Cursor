import { getLessonLearningSteps } from '@/lib/lessonFinale'
import {
  coreXpToNextMedalTier,
  listLessonScoringUnits,
  MAX_CORE_XP_DEFAULT,
  resolveLiveFooterMedal,
  resolveMedalFromCoreXp,
} from '@/lib/lessonScore'
import type { LessonMedalTier, LessonMedalTierOrNull, LiveFooterMedalState } from '@/lib/lessonScore'
import type { LessonData } from '@/types/lesson'
import type { Audience } from '@/lib/types'
import type { UserLessonProgress } from '@/types/userProgress'

const MEDAL_EMOJI: Record<LiveFooterMedalState, string> = {
  grey: '○',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

const NEXT_TIER_EMOJI: Record<LessonMedalTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

const MEDAL_LABEL: Record<LiveFooterMedalState, string> = {
  grey: 'Старт — медаль появится с первых очков',
  bronze: 'Сейчас: бронза',
  silver: 'Сейчас: серебро',
  gold: 'Сейчас: золото',
}

const FINAL_MEDAL_LABEL: Record<LessonMedalTier, string> = {
  bronze: 'Бронзовая медаль',
  silver: 'Серебряная медаль',
  gold: 'Золотая медаль',
}

export interface LessonFooterLiveInput {
  lesson: LessonData | null
  currentStep: number
  currentVariantIndex: number
  isFinale: boolean
  coreXp: number
  maxCoreXp: number
  comboXp: number
  combo: number
  maxCombo: number
  coreDelta?: number
  comboDelta?: number
  audience?: Audience
}

export type LessonFooterSegmentKind = 'goal' | 'xp' | 'combo' | 'medal'

export type LessonFooterAccountSegmentKind = 'totalXp' | 'streak'

export interface LessonFooterSegment {
  kind: LessonFooterSegmentKind
  text: string
  title?: string
}

export interface LessonFooterAccountSegment {
  kind: LessonFooterAccountSegmentKind
  text: string
}

export interface LessonFooterLiveView {
  lessonSegments: LessonFooterSegment[]
  accountSegments: LessonFooterAccountSegment[]
  accountLine: string
  lessonTitle: string
  accountTitle: string
}

export interface LessonCardMedalDisplay {
  emoji: string
  title: string
}

export interface LessonStageProgress {
  percent: number
  completedUnits: number
  totalUnits: number
}

/** Индекс текущего scoring unit (задания до этой позиции = прогресс). */
export function indexOfCurrentScoringUnit(
  lesson: LessonData,
  currentStepIndex: number,
  variantIndex: number
): number {
  const units = listLessonScoringUnits(lesson)
  if (units.length === 0) return 0

  const learningSteps = getLessonLearningSteps(lesson)
  const step = learningSteps[currentStepIndex]
  if (!step) return 0

  const stepUnits = units.filter((unit) => unit.stepNumber === step.stepNumber)
  if (stepUnits.length === 0) {
    return Math.max(
      0,
      units.findIndex((unit) => unit.stepNumber >= step.stepNumber)
    )
  }

  const exercise = step.exercise
  let matched: (typeof units)[number] | undefined

  if (exercise?.variants?.length) {
    matched = stepUnits.find((unit) => unit.kind === 'variant' && unit.variantIndex === variantIndex)
  } else if (exercise?.puzzleVariants?.length) {
    matched = stepUnits.find((unit) => unit.kind === 'puzzleSub' && unit.puzzleSubIndex === 0)
  } else {
    matched = stepUnits.find((unit) => unit.kind === 'step')
  }

  if (!matched) {
    matched = stepUnits[0]
  }

  const globalIndex = units.indexOf(matched)
  return globalIndex >= 0 ? globalIndex : 0
}

export function computeLessonStagePercent(input: {
  lesson: LessonData | null
  currentStep: number
  currentVariantIndex: number
  isFinale: boolean
}): LessonStageProgress {
  if (!input.lesson) {
    return { percent: 0, completedUnits: 0, totalUnits: 0 }
  }

  const units = listLessonScoringUnits(input.lesson)
  const totalUnits = units.length
  if (input.isFinale || totalUnits === 0) {
    return { percent: 100, completedUnits: totalUnits, totalUnits }
  }

  const completedUnits = indexOfCurrentScoringUnit(
    input.lesson,
    input.currentStep,
    input.currentVariantIndex
  )
  const percent = Math.round((completedUnits / totalUnits) * 100)
  return { percent, completedUnits, totalUnits }
}

export function formatLessonCompletionFooter(medal: LessonMedalTierOrNull): string {
  if (medal === 'gold') return 'Поздравляем! Золотая медаль — отличный результат!'
  if (medal === 'silver') return 'Поздравляем! Серебряная медаль — хороший результат!'
  if (medal === 'bronze') return 'Урок пройден! Бронзовая медаль — можно улучшить до золота.'
  return 'Урок пройден! Отличная работа!'
}

export function resolveLessonCardMedal(
  progress: UserLessonProgress | null | undefined
): LessonCardMedalDisplay | null {
  if (!progress) return null

  if (progress.medal) {
    const tier = progress.medal
    return {
      emoji: MEDAL_EMOJI[tier],
      title: MEDAL_LABEL[tier],
    }
  }

  const coreXp = progress.coreXp ?? 0
  if (coreXp <= 0) return null

  const maxCoreXp =
    typeof progress.maxCoreXp === 'number' && progress.maxCoreXp > 0
      ? progress.maxCoreXp
      : MAX_CORE_XP_DEFAULT
  const live = resolveLiveFooterMedal(coreXp, maxCoreXp)
  if (live.current === 'grey') return null

  return {
    emoji: MEDAL_EMOJI[live.current],
    title: MEDAL_LABEL[live.current],
  }
}

function formatGoalSegment(stage: LessonStageProgress): LessonFooterSegment {
  return {
    kind: 'goal',
    text: `🎯${stage.percent}%`,
    title:
      stage.totalUnits > 0
        ? `Задание ${stage.completedUnits} из ${stage.totalUnits}`
        : 'Прогресс урока',
  }
}

function formatXpSegment(input: LessonFooterLiveInput): LessonFooterSegment {
  const lessonXp = input.coreXp + input.comboXp
  const text =
    input.coreDelta && input.coreDelta > 0
      ? `⭐${lessonXp}(+${input.coreDelta}) XP`
      : `⭐${lessonXp} XP`

  return {
    kind: 'xp',
    text,
    title: `${lessonXp} XP за урок (шаги + бонусы COMBO). Медаль — по точности шагов.`,
  }
}

function formatComboSegment(input: LessonFooterLiveInput): LessonFooterSegment {
  const { combo, comboDelta, maxCombo } = input
  let text: string
  let title = `COMBO: ${combo} подряд верных ответов. Ошибка сбрасывает серию.`

  if (comboDelta && comboDelta > 0) {
    text = `🔥×${combo}(+${comboDelta} XP)`
    title = `COMBO ×${combo}. Бонус +${comboDelta} XP за веху. ${title}`
  } else if (maxCombo > combo) {
    text = `🔥×${combo} рек.×${maxCombo}`
    title = `Серия сброшена (сейчас ×${combo}). Рекорд урока: ×${maxCombo}. Бонусы COMBO в XP сохранены.`
  } else {
    text = `🔥×${combo}`
  }

  return { kind: 'combo', text, title }
}

function medalGapPercent(coreXp: number, maxCoreXp: number): number {
  const toNext = coreXpToNextMedalTier(coreXp, maxCoreXp)
  if (toNext == null || maxCoreXp <= 0) return 0
  return Math.max(1, Math.ceil((toNext / maxCoreXp) * 100))
}

function formatMedalFooterSegment(input: LessonFooterLiveInput): LessonFooterSegment {
  const { coreXp, maxCoreXp, isFinale, audience } = input

  if (isFinale) {
    const tier = resolveMedalFromCoreXp(coreXp, true, maxCoreXp)
    const emoji = tier ? MEDAL_EMOJI[tier] : '🥇'
    return {
      kind: 'medal',
      text: emoji,
      title: tier ? FINAL_MEDAL_LABEL[tier] : 'Урок завершён',
    }
  }

  if (coreXp <= 0) {
    return {
      kind: 'medal',
      text: '🥉',
      title: 'Первая медаль — бронза. Ответьте верно, чтобы начать.',
    }
  }

  const live = resolveLiveFooterMedal(coreXp, maxCoreXp)
  const toNext = coreXpToNextMedalTier(coreXp, maxCoreXp)

  if (!live.next || toNext == null) {
    return {
      kind: 'medal',
      text: MEDAL_EMOJI[live.current],
      title: `${MEDAL_LABEL[live.current]}. Максимальная ступень по точности.`,
    }
  }

  const gap = medalGapPercent(coreXp, maxCoreXp)
  const nextEmoji = NEXT_TIER_EMOJI[live.next]

  if (audience === 'child' && gap <= 8) {
    return {
      kind: 'medal',
      text: `Почти ${nextEmoji}!`,
      title: `${MEDAL_LABEL[live.current]}. До ${FINAL_MEDAL_LABEL[live.next].toLowerCase()}: ~${gap}% точности.`,
    }
  }

  return {
    kind: 'medal',
    text: `${nextEmoji}→${gap}%`,
    title: `${MEDAL_LABEL[live.current]}. До ${FINAL_MEDAL_LABEL[live.next].toLowerCase()}: ${gap}% точности (${toNext} XP за шаги).`,
  }
}

export function buildLessonFooterLive(input: LessonFooterLiveInput): LessonFooterLiveView {
  const stage = computeLessonStagePercent({
    lesson: input.lesson,
    currentStep: input.currentStep,
    currentVariantIndex: input.currentVariantIndex,
    isFinale: input.isFinale,
  })

  const lessonSegments: LessonFooterSegment[] = [
    formatGoalSegment(stage),
    formatXpSegment(input),
    formatComboSegment(input),
    formatMedalFooterSegment(input),
  ]

  return {
    lessonSegments,
    accountSegments: [],
    accountLine: '',
    lessonTitle: 'Этап урока · XP · серия · медаль',
    accountTitle: '',
  }
}
