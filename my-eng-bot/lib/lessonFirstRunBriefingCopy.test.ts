import { describe, expect, it } from 'vitest'
import { buildLessonFirstRunBriefingCopy } from './lessonFirstRunBriefingCopy'

describe('buildLessonFirstRunBriefingCopy', () => {
  it('includes core lesson rules and coin line for adult first pass', () => {
    const copy = buildLessonFirstRunBriefingCopy({
      audience: 'adult',
      coinIntroContext: {
        audience: 'adult',
        lessonCoinClaimed: false,
        isGeneratedVariantRun: false,
        profileMedal: null,
      },
    })

    expect(copy.title).toBe('Как устроен урок')
    expect(copy.message).toContain('Семь коротких шагов')
    expect(copy.message).toContain('+1 монета')
    expect(copy.secondaryMessage).toContain('шагах 4–7')
  })
})
