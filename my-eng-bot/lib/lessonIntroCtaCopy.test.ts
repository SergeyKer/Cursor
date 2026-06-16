import { describe, expect, it } from 'vitest'
import {
  LESSON_INTRO_READY_CTA_LABEL,
  resolveLessonIntroPrimaryCtaLabel,
} from './lessonIntroCtaCopy'
import { LESSON_VARIANT_PREPARE_LOADING_LABEL } from './lessonVariantCtaCopy'

describe('resolveLessonIntroPrimaryCtaLabel', () => {
  it('shows loading lesson', () => {
    expect(
      resolveLessonIntroPrimaryCtaLabel({
        loadingLesson: true,
        footerVariantRegenerating: false,
      })
    ).toBe('Готовлю урок...')
  })

  it('shows preparing variant', () => {
    expect(
      resolveLessonIntroPrimaryCtaLabel({
        loadingLesson: false,
        footerVariantRegenerating: true,
      })
    ).toBe(LESSON_VARIANT_PREPARE_LOADING_LABEL)
  })

  it('shows ready cta', () => {
    expect(
      resolveLessonIntroPrimaryCtaLabel({
        loadingLesson: false,
        footerVariantRegenerating: false,
      })
    ).toBe(LESSON_INTRO_READY_CTA_LABEL)
  })
})
