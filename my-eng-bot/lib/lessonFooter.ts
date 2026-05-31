import { formatComboSegmentText } from '@/lib/gamificationGlyphs'
import type { LessonFrozenMedalGlyph } from '@/lib/medalBadge'
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
  comboMilestoneBlocked?: boolean
  isRepeatRun?: boolean
  /** Локальный проход после закрытия цикла 1 (не variant repeat). */
  isLocalCycle1SilverCap?: boolean
  audience?: Audience
}

export type LessonFooterSegmentKind = 'goal' | 'xp' | 'combo' | 'medal'

export type LessonFooterAccountSegmentKind = 'totalXp' | 'streak'

export type { LessonFrozenMedalGlyph } from '@/lib/medalBadge'

export type LessonFooterMedalVisual =
  | { mode: 'tier'; tier: LessonMedalTier; muted?: boolean }
  | { mode: 'frozen'; glyph: LessonFrozenMedalGlyph; title?: string }
  | {
      mode: 'progress'
      nextTier: LessonMedalTier
      progressPercent: number
      hintText?: string
    }
  | { mode: 'textOnly'; hintText: string }

export interface LessonFooterSegment {
  kind: LessonFooterSegmentKind
  text: string
  title?: string
  medalVisual?: LessonFooterMedalVisual
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
  tier?: LessonMedalTier
  title: string
  muted?: boolean
  frozen?: LessonFrozenMedalGlyph
}

const FROZEN_START_TITLE = 'Старт — медаль появится с первых очков'

function frozenMedalDisplay(title: string): LessonCardMedalDisplay {
  return { frozen: 'military', title }
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
  if (medal === 'gold') return 'Золотая медаль — отлично!'
  if (medal === 'silver') return 'Серебряная медаль — хорошо!'
  if (medal === 'bronze') return 'Бронза. Можно улучшить!'
  return 'Урок пройден! Отличная работа!'
}

const CYCLE1_CLOSED_MENU_TITLE =
  'Урок начат — золото только с первого прохода без выхода. Локально — до серебра; в сгенерированном варианте — снова до золота.'

export function isLessonStartedForMenu(
  progress: UserLessonProgress | null | undefined
): boolean {
  if (!progress) return false
  return (
    progress.cycle1Started === true ||
    (progress.coreXp ?? 0) > 0 ||
    progress.completedSteps.length > 0
  )
}

/** Медаль в списке уроков: цветная только после финала (`progress.medal`); иначе 🏅. */
export function resolveLessonCardMedal(
  progress: UserLessonProgress | null | undefined
): LessonCardMedalDisplay | null {
  if (!progress) return null

  if (progress.medal) {
    const tier = progress.medal
    return {
      tier,
      title: MEDAL_LABEL[tier],
    }
  }

  if (progress.cycle1Closed) {
    return frozenMedalDisplay(CYCLE1_CLOSED_MENU_TITLE)
  }

  if (isLessonStartedForMenu(progress)) {
    return frozenMedalDisplay(FROZEN_START_TITLE)
  }

  return null
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
      ? `⭐${lessonXp}(+${input.coreDelta})`
      : `⭐${lessonXp}`

  return {
    kind: 'xp',
    text,
    title: `${lessonXp} — очки этого прохода (+ за шаг). К уровню — отдельно, только прирост к рекорду.`,
  }
}

function formatComboSegment(input: LessonFooterLiveInput): LessonFooterSegment {
  const { combo, comboDelta, maxCombo } = input
  let text: string
  let title = `COMBO: ${combo} подряд верных ответов. Ошибка сбрасывает COMBO.`

  if (comboDelta && comboDelta > 0) {
    text = formatComboSegmentText(combo, `(+${comboDelta})`)
    title = `COMBO ×${combo}. +${comboDelta} очков в счёт этого прохода. ${title}`
  } else if (input.comboMilestoneBlocked && combo >= 3) {
    text = formatComboSegmentText(combo)
    title = `COMBO ×${combo}. Серия в счёте урока; очки к уровню откроются от 50% core. ${title}`
  } else if (maxCombo > combo) {
    text = `${formatComboSegmentText(combo)} max ${maxCombo}`
    title = `COMBO сброшен (×${combo}). Рекорд COMBO ×${maxCombo}. Очки вех этого прохода уже в ⭐.`
  } else {
    text = formatComboSegmentText(combo)
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
    const tier = resolveMedalFromCoreXp(coreXp, true, maxCoreXp) ?? 'gold'
    return {
      kind: 'medal',
      text: '',
      title: FINAL_MEDAL_LABEL[tier],
      medalVisual: { mode: 'tier', tier },
    }
  }

  if (coreXp <= 0) {
    return {
      kind: 'medal',
      text: '',
      title: 'Первая медаль появится после верного ответа.',
      medalVisual: { mode: 'frozen', glyph: 'military', title: FROZEN_START_TITLE },
    }
  }

  const live = resolveLiveFooterMedal(coreXp, maxCoreXp)
  const repeatNote = input.isLocalCycle1SilverCap
    ? ' (локальный проход после выхода: max серебро)'
    : input.isRepeatRun
      ? ' (повтор: max серебро за проход)'
      : ''
  const toNext = coreXpToNextMedalTier(coreXp, maxCoreXp)

  if (!live.next || toNext == null) {
    const tier = live.current === 'grey' ? 'bronze' : live.current
    return {
      kind: 'medal',
      text: '',
      title: `${MEDAL_LABEL[live.current]}. Максимальная ступень по точности.${repeatNote}`,
      medalVisual: { mode: 'tier', tier },
    }
  }

  const gap = medalGapPercent(coreXp, maxCoreXp)
  const progressTitle = `${MEDAL_LABEL[live.current]}. До ${FINAL_MEDAL_LABEL[live.next].toLowerCase()}: ${gap}% точности (${toNext} очков за шаги).${repeatNote}`

  if (audience === 'child' && gap <= 8) {
    return {
      kind: 'medal',
      text: '',
      title: `${MEDAL_LABEL[live.current]}. До ${FINAL_MEDAL_LABEL[live.next].toLowerCase()}: ~${gap}% точности.`,
      medalVisual: {
        mode: 'progress',
        nextTier: live.next,
        progressPercent: gap,
        hintText: 'Почти!',
      },
    }
  }

  return {
    kind: 'medal',
    text: '',
    title: progressTitle,
    medalVisual: {
      mode: 'progress',
      nextTier: live.next,
      progressPercent: gap,
    },
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
    lessonTitle: 'Этап урока · очки · COMBO · медаль',
    accountTitle: '',
  }
}

/** Текущая медаль в шапке урока (не цель «До …» из футера). */
export function resolveLessonHeaderMedal(input: {
  coreXp: number
  maxCoreXp: number
  isFinale: boolean
  cycle1Closed?: boolean
}): LessonCardMedalDisplay | null {
  const { coreXp, maxCoreXp, isFinale, cycle1Closed } = input

  if (isFinale) {
    const tier = resolveMedalFromCoreXp(coreXp, true, maxCoreXp) ?? 'gold'
    return {
      tier,
      title: FINAL_MEDAL_LABEL[tier],
    }
  }

  if (coreXp <= 0) {
    if (cycle1Closed) {
      return frozenMedalDisplay(CYCLE1_CLOSED_MENU_TITLE)
    }
    return frozenMedalDisplay(FROZEN_START_TITLE)
  }

  const live = resolveLiveFooterMedal(coreXp, maxCoreXp)
  const tier = live.current === 'grey' ? 'bronze' : live.current

  return {
    tier,
    title: MEDAL_LABEL[live.current],
  }
}
