import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from '@/lib/lessonVariantCtaCopy'

export const LESSON_INTRO_READY_CTA_LABEL = 'К уроку'
export const LESSON_INTRO_LOADING_LESSON_LABEL = 'Готовлю урок...'

export function resolveLessonIntroPrimaryCtaLabel(params: {
  loadingLesson: boolean
  footerVariantRegenerating: boolean
}): string {
  if (params.loadingLesson) return LESSON_INTRO_LOADING_LESSON_LABEL
  if (params.footerVariantRegenerating) return LESSON_VARIANT_PREPARE_LOADING_LABEL
  return LESSON_INTRO_READY_CTA_LABEL
}
