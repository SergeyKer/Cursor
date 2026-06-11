import type { Exercise } from '@/types/lesson'
import { PUZZLE_BOTTOM_STACK_FALLBACK, estimatePuzzlePanelMinHeight } from '@/lib/puzzlePanelLayout'

export type LessonComposerPanelKind =
  | 'choice'
  | 'text-input'
  | 'puzzle'
  | 'post-lesson'
  | 'medal'
  | 'finale'
  | 'none'

const CHOICE_CHIP_HEIGHT_PX = 36
const CHOICE_CHIP_ROW_GAP_PX = 6
const CHOICE_CHIPS_PER_ROW = 3
const CHOICE_PANEL_VERTICAL_PADDING_PX = 12
const TEXT_INPUT_COMPOSER_HEIGHT_PX = 88
const POST_LESSON_COMPOSER_HEIGHT_PX = 240
const MEDAL_FLOW_COMPOSER_HEIGHT_PX = 180
const LESSON_FINALE_COMPOSER_HEIGHT_PX = 300
const INTRO_CHIP_ROW_HEIGHT_PX = 44
const INTRO_PRIMARY_BUTTON_HEIGHT_PX = 44
const INTRO_COMPOSER_ROW_GAP_PX = 8
const INTRO_COMPOSER_STACK_PADDING_PX = 20
const INTRO_ERROR_BANNER_HEIGHT_PX = 52

/** Класс scroll-контейнера intro/tips — iOS padding fallback в globals.css. */
export const LESSON_INTRO_SCROLL_CLASS = 'lesson-intro-scroll'

export function isLessonChoiceChipsPanel(exercise: Exercise | null | undefined): boolean {
  if (!exercise) return false
  if (exercise.type !== 'fill_choice' && exercise.type !== 'micro_quiz') return false
  return (exercise.options?.length ?? 0) > 0
}

export function resolveLessonComposerPanelKind(params: {
  exercise: Exercise | null | undefined
  hasPostLessonOptions: boolean
  showLessonFinale?: boolean
  /** @deprecated use showLessonFinale */
  showPostLessonMedalPhase?: boolean
}): LessonComposerPanelKind {
  if (params.showLessonFinale || params.showPostLessonMedalPhase) return 'finale'
  if (params.hasPostLessonOptions) return 'post-lesson'
  if (!params.exercise) return 'none'
  if (params.exercise.type === 'sentence_puzzle') return 'puzzle'
  if (isLessonChoiceChipsPanel(params.exercise)) return 'choice'
  return 'text-input'
}

export function estimateLessonChoiceChipsMinHeight(optionCount: number): number {
  if (optionCount <= 0) return 0
  const rows = Math.ceil(optionCount / CHOICE_CHIPS_PER_ROW)
  return (
    CHOICE_PANEL_VERTICAL_PADDING_PX +
    rows * CHOICE_CHIP_HEIGHT_PX +
    Math.max(0, rows - 1) * CHOICE_CHIP_ROW_GAP_PX
  )
}

function parseRemToPx(rem: string): number {
  const match = /^([\d.]+)rem$/.exec(rem.trim())
  if (!match) return 288
  const root =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize)
      : 16
  return Math.round(parseFloat(match[1]) * root)
}

/** Высота панели действий на LessonIntroScreen (один ряд чипов + CTA). */
export function estimateIntroComposerMinHeight(params: {
  hasSecondaryChips: boolean
  hasErrorBanner?: boolean
}): number {
  let height = INTRO_COMPOSER_STACK_PADDING_PX + INTRO_CHIP_ROW_HEIGHT_PX + INTRO_COMPOSER_ROW_GAP_PX
  if (params.hasErrorBanner) {
    height += INTRO_ERROR_BANNER_HEIGHT_PX + INTRO_COMPOSER_ROW_GAP_PX
  }
  height += INTRO_PRIMARY_BUTTON_HEIGHT_PX
  return height
}

export function estimateLessonComposerMinHeight(params: {
  panelKind: LessonComposerPanelKind
  optionCount?: number
  puzzleWords?: string[]
  puzzleHasInstruction?: boolean
  containerWidthPx?: number
  compact?: boolean
}): number {
  const stackPadding = params.compact ? 8 : 20

  switch (params.panelKind) {
    case 'choice':
      return stackPadding + estimateLessonChoiceChipsMinHeight(params.optionCount ?? 0)
    case 'text-input':
      return stackPadding + TEXT_INPUT_COMPOSER_HEIGHT_PX
    case 'puzzle': {
      const words = params.puzzleWords ?? []
      const fallback = parseRemToPx(PUZZLE_BOTTOM_STACK_FALLBACK)
      const panelHeight =
        words.length > 0
          ? estimatePuzzlePanelMinHeight({
              words,
              hasInstruction: params.puzzleHasInstruction ?? true,
              containerWidthPx: params.containerWidthPx,
            })
          : fallback
      return stackPadding + panelHeight
    }
    case 'post-lesson':
      return stackPadding + POST_LESSON_COMPOSER_HEIGHT_PX
    case 'medal':
      return stackPadding + MEDAL_FLOW_COMPOSER_HEIGHT_PX
    case 'finale':
      return stackPadding + LESSON_FINALE_COMPOSER_HEIGHT_PX
    default:
      return 0
  }
}
