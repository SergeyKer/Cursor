import { describe, expect, it } from 'vitest'
import { buildLessonCoinIntroBubble } from './lessonCoinIntroCopy'

const baseContext = {
  audience: 'adult' as const,
  lessonCoinClaimed: false,
  isGeneratedVariantRun: false,
  profileMedal: null,
}

describe('lessonCoinIntroCopy', () => {
  it('shows short coin promise on first pass when coin not claimed', () => {
    const bubble = buildLessonCoinIntroBubble(baseContext)
    expect(bubble?.content).toContain('+1 монета')
    expect(bubble?.content).toContain('4–7')
    expect(bubble?.content).toContain('1 раз за проход')
  })

  it('hides first-pass coin bubble on generated run', () => {
    expect(
      buildLessonCoinIntroBubble({
        ...baseContext,
        isGeneratedVariantRun: true,
      })
    ).toBeNull()
  })

  it('does not promise +1 when coin already claimed', () => {
    const bubble = buildLessonCoinIntroBubble({
      ...baseContext,
      lessonCoinClaimed: true,
    })
    expect(bubble?.content).toContain('уже получена')
    expect(bubble?.content).not.toContain('+1 монета')
  })
})
