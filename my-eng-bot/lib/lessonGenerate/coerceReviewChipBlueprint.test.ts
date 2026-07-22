import { describe, expect, it } from 'vitest'
import { coerceReviewChipBlueprint } from '@/lib/lessonGenerate/coerceReviewChipBlueprint'
import { hasRequiredTheoryStructure, isValidLessonBlueprint } from '@/lib/lessonBlueprint'

describe('coerceReviewChipBlueprint', () => {
  it('accepts intro-only payload and fills stub blueprint fields', () => {
    const coerced = coerceReviewChipBlueprint(
      {
        intro: {
          topic: 'doing / -ing',
          kind: 'contrast',
          complexity: 'simple',
          quick: {
            why: [
              'Когда действие происходит сейчас, нужно использовать -ing.',
              "Для выражения текущего действия добавляем I'm перед -ing.",
            ],
            how: ["I'm + V-ing → I'm doing my homework."],
            examples: [
              {
                en: "I'm doing my homework now.",
                ru: 'Я сейчас делаю домашку.',
                note: 'now → -ing',
              },
            ],
            takeaway: 'Сейчас в процессе — am/is/are + -ing.',
          },
        },
      },
      'doing / -ing'
    )

    expect(coerced).not.toBeNull()
    expect(coerced?.intro?.topic).toBe('doing / -ing')
    expect(hasRequiredTheoryStructure(coerced!.theoryIntro)).toBe(true)
    expect(isValidLessonBlueprint(coerced)).toBe(true)
  })

  it('returns null when intro missing', () => {
    expect(coerceReviewChipBlueprint({ title: 'x' }, 'x')).toBeNull()
  })
})
