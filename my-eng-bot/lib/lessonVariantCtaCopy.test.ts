import { describe, expect, it } from 'vitest'

import {

  LESSON_VARIANT_FROZEN_UNTIL_START_TITLE,

  LESSON_VARIANT_PREPARE_LOADING_LABEL,

  LESSON_VARIANT_SECONDARY_HINT,

  LESSON_VARIANT_SECONDARY_LABEL,

  formatLessonVariantDualCtaTwoLineLabel,
  hasRepeatContextFromProgress,

  resolveLessonVariantDualCtaLabels,

  resolveLessonVariantDualCtaLayout,

  resolveMenuVariantRepeatContext,

} from './lessonVariantCtaCopy'



describe('formatLessonVariantDualCtaTwoLineLabel', () => {
  it('splits known briefing labels into two lines', () => {
    expect(formatLessonVariantDualCtaTwoLineLabel('Новый вариант')).toBe('Новый\nвариант')
    expect(formatLessonVariantDualCtaTwoLineLabel('Повтор варианта')).toBe('Повтор\nварианта')
  })
})

describe('CTA labels', () => {
  it('uses Новый вариант as secondary label', () => {
    expect(LESSON_VARIANT_SECONDARY_LABEL).toBe('Новый вариант')
    expect(LESSON_VARIANT_SECONDARY_HINT).toBe('Те же правила — новые ситуации')
  })
})

describe('hasRepeatContextFromProgress', () => {

  it('is false without medal', () => {

    expect(hasRepeatContextFromProgress(null)).toBe(false)

    expect(hasRepeatContextFromProgress({ medal: null } as never)).toBe(false)

    expect(hasRepeatContextFromProgress({ cycle1Closed: true } as never)).toBe(false)

  })



  it('is true with medal', () => {

    expect(hasRepeatContextFromProgress({ medal: 'silver' } as never)).toBe(true)

  })

})



describe('resolveMenuVariantRepeatContext', () => {

  it('is true when cycle1 closed without medal', () => {

    expect(resolveMenuVariantRepeatContext({ cycle1Closed: true, medal: null } as never)).toBe(true)

  })



  it('is false when lesson not touched', () => {

    expect(resolveMenuVariantRepeatContext(null)).toBe(false)

    expect(

      resolveMenuVariantRepeatContext({ cycle1Started: true, cycle1Closed: false, medal: null } as never)

    ).toBe(false)

  })

})



describe('resolveLessonVariantDualCtaLabels', () => {

  it('first pass uses start lesson', () => {

    expect(resolveLessonVariantDualCtaLabels({ hasRepeatContext: false })).toEqual({

      primaryLabel: 'Начать урок',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

    })

  })



  it('repeat uses repeat variant', () => {

    expect(resolveLessonVariantDualCtaLabels({ hasRepeatContext: true })).toEqual({

      primaryLabel: 'Повтор варианта',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

    })

  })



  it('exposes neutral loading copy', () => {

    expect(LESSON_VARIANT_PREPARE_LOADING_LABEL).toBe('Подготавливаем вариант...')

  })

})



describe('resolveLessonVariantDualCtaLayout', () => {

  it('freezes new variant before first start', () => {

    expect(resolveLessonVariantDualCtaLayout(null)).toEqual({

      primaryLabel: 'Начать урок',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

      emphasizeNewVariant: false,

      freezeNewVariant: true,

    })

  })



  it('keeps freeze while cycle1 is open', () => {

    expect(

      resolveLessonVariantDualCtaLayout({

        cycle1Started: true,

        cycle1Closed: false,

        medal: null,

        completedSteps: [1],

        coreXp: 5,

      } as never)

    ).toEqual({

      primaryLabel: 'Начать урок',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

      emphasizeNewVariant: false,

      freezeNewVariant: true,

    })

  })



  it('unlocks with repeat label after cycle1 closed', () => {

    expect(

      resolveLessonVariantDualCtaLayout({

        cycle1Closed: true,

        medal: null,

      } as never)

    ).toEqual({

      primaryLabel: 'Повтор варианта',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

      emphasizeNewVariant: true,

      freezeNewVariant: false,

    })

  })



  it('unlocks with repeat label when medal exists', () => {

    expect(

      resolveLessonVariantDualCtaLayout({

        cycle1Started: true,

        medal: 'silver',

        completedSteps: [1],

        coreXp: 10,

      } as never)

    ).toEqual({

      primaryLabel: 'Повтор варианта',

      secondaryLabel: LESSON_VARIANT_SECONDARY_LABEL,

      emphasizeNewVariant: true,

      freezeNewVariant: false,

    })

  })



  it('exposes frozen tooltip copy', () => {

    expect(LESSON_VARIANT_FROZEN_UNTIL_START_TITLE).toContain('Сначала начните урок')

  })

})


