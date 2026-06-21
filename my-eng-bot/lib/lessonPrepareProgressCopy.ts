import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from '@/lib/lessonVariantCtaCopy'

export const LESSON_PREPARE_LABEL_SITUATIONS = 'Engvo придумывает ситуации...'
export const LESSON_PREPARE_LABEL_VERIFY = 'Почти готово...'

/** Самая длинная фазовая подпись - для ghost-span стабильной ширины кнопки. */
export const LESSON_PREPARE_GHOST_LABEL = LESSON_PREPARE_LABEL_SITUATIONS

export const LESSON_PREPARE_LABEL_BY_THRESHOLD = [
  { minProgress: 0, label: LESSON_VARIANT_PREPARE_LOADING_LABEL },
  { minProgress: 20, label: LESSON_PREPARE_LABEL_SITUATIONS },
  { minProgress: 80, label: LESSON_PREPARE_LABEL_VERIFY },
] as const
