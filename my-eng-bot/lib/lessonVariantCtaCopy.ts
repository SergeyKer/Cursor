import type { UserLessonProgress } from '@/types/userProgress'



export type LessonVariantDualCtaLabels = {

  primaryLabel: string

  secondaryLabel: string

}



export type LessonVariantDualCtaLayout = LessonVariantDualCtaLabels & {

  /** «Новый вариант» сверху, тёмно-синий — после броска или медали. */

  emphasizeNewVariant: boolean

  /** «Новый вариант» снизу, disabled — до броска и медали. */

  freezeNewVariant: boolean

}



export const LESSON_VARIANT_SECONDARY_LABEL = 'Новый вариант'

export const LESSON_VARIANT_PREPARE_LOADING_LABEL = 'Подготавливаем вариант...'

const DUAL_CTA_TWO_LINE_LABELS: Record<string, string> = {
  'Новый вариант': 'Новый\nвариант',
  'Повтор варианта': 'Повтор\nварианта',
  'Начать урок': 'Начать\nурок',
}

/** Две строки в узкой кнопке briefing (рядом). */
export function formatLessonVariantDualCtaTwoLineLabel(label: string): string {
  return DUAL_CTA_TWO_LINE_LABELS[label] ?? label
}

export const LESSON_VARIANT_FROZEN_UNTIL_START_TITLE =

  'Сначала начните урок — новый вариант откроется после первого прохода.'



/** Медаль в progress (briefing и общий контекст повтора). */

export function hasRepeatContextFromProgress(

  progress: UserLessonProgress | null | undefined

): boolean {

  return progress?.medal != null

}



/** Только меню: разблокировка «Новый вариант» и подпись «Повтор варианта». */

export function resolveMenuVariantRepeatContext(

  progress: UserLessonProgress | null | undefined

): boolean {

  return hasRepeatContextFromProgress(progress) || progress?.cycle1Closed === true

}



export function resolveLessonVariantDualCtaLabels(params: {

  hasRepeatContext: boolean

}): LessonVariantDualCtaLabels {

  return {

    primaryLabel: params.hasRepeatContext ? 'Повтор варианта' : 'Начать урок',

    secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

  }

}



export function resolveLessonVariantDualCtaLayout(

  progress: UserLessonProgress | null | undefined

): LessonVariantDualCtaLayout {

  const menuRepeatContext = resolveMenuVariantRepeatContext(progress)

  return {

    ...resolveLessonVariantDualCtaLabels({ hasRepeatContext: menuRepeatContext }),

    emphasizeNewVariant: menuRepeatContext,

    freezeNewVariant: !menuRepeatContext,

  }

}


