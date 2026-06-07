import { describe, expect, it } from 'vitest'

/** Зеркало взаимоисключения флагов в useLessonEngine.scheduleSuccessAdvance */
function resolveAdvanceFlags(kind: 'variant' | 'step') {
  return {
    isAdvancingToNextStep: kind === 'step',
    isAdvancingToNextVariant: kind === 'variant',
  }
}

describe('lesson advance flags', () => {
  it('step and variant flags are mutually exclusive', () => {
    const step = resolveAdvanceFlags('step')
    const variant = resolveAdvanceFlags('variant')

    expect(step.isAdvancingToNextStep).toBe(true)
    expect(step.isAdvancingToNextVariant).toBe(false)
    expect(variant.isAdvancingToNextStep).toBe(false)
    expect(variant.isAdvancingToNextVariant).toBe(true)
    expect(step.isAdvancingToNextStep && step.isAdvancingToNextVariant).toBe(false)
    expect(variant.isAdvancingToNextStep && variant.isAdvancingToNextVariant).toBe(false)
  })
})
