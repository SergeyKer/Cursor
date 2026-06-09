import type { Exercise } from '@/types/lesson'
import { PUZZLE_BOTTOM_STACK_FALLBACK } from '@/lib/puzzlePanelLayout'

export type LessonComposerPanelKind = 'choice' | 'text-input' | 'puzzle' | 'post-lesson' | 'medal' | 'none'

const CHOICE_CHIP_HEIGHT_PX = 36
const CHOICE_CHIP_ROW_GAP_PX = 6
const CHOICE_CHIPS_PER_ROW = 3
const CHOICE_PANEL_VERTICAL_PADDING_PX = 12
const TEXT_INPUT_COMPOSER_HEIGHT_PX = 88
const POST_LESSON_COMPOSER_HEIGHT_PX = 200
const MEDAL_FLOW_COMPOSER_HEIGHT_PX = 180

export function isLessonChoiceChipsPanel(exercise: Exercise | null | undefined): boolean {
  if (!exercise) return false
  if (exercise.type !== 'fill_choice' && exercise.type !== 'micro_quiz') return false
  return (exercise.options?.length ?? 0) > 0
}

export function resolveLessonComposerPanelKind(params: {
  exercise: Exercise | null | undefined
  hasPostLessonOptions: boolean
  showPostLessonMedalPhase: boolean
}): LessonComposerPanelKind {
  if (params.showPostLessonMedalPhase) return 'medal'
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

export function estimateLessonComposerMinHeight(params: {
  panelKind: LessonComposerPanelKind
  optionCount?: number
  compact?: boolean
}): number {
  const stackPadding = params.compact ? 8 : 20

  switch (params.panelKind) {
    case 'choice':
      return stackPadding + estimateLessonChoiceChipsMinHeight(params.optionCount ?? 0)
    case 'text-input':
      return stackPadding + TEXT_INPUT_COMPOSER_HEIGHT_PX
    case 'puzzle':
      return stackPadding + parseRemToPx(PUZZLE_BOTTOM_STACK_FALLBACK)
    case 'post-lesson':
      return stackPadding + POST_LESSON_COMPOSER_HEIGHT_PX
    case 'medal':
      return stackPadding + MEDAL_FLOW_COMPOSER_HEIGHT_PX
    default:
      return 0
  }
}
