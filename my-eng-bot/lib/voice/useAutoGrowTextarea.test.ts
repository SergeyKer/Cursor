import { describe, expect, it } from 'vitest'
import { computeAutoGrowTextareaHeight } from '@/lib/voice/useAutoGrowTextarea'

describe('computeAutoGrowTextareaHeight', () => {
  it('keeps single line when content fits', () => {
    const metrics = computeAutoGrowTextareaHeight({
      singleLineHeightPx: 44,
      scrollHeightPx: 44,
      maxHeightPx: 132,
      minHeightPx: 44,
    })
    expect(metrics.heightPx).toBe(44)
    expect(metrics.overflowY).toBe('hidden')
  })

  it('grows up to max height', () => {
    const metrics = computeAutoGrowTextareaHeight({
      singleLineHeightPx: 44,
      scrollHeightPx: 200,
      maxHeightPx: 132,
      minHeightPx: 44,
    })
    expect(metrics.heightPx).toBe(132)
    expect(metrics.overflowY).toBe('auto')
  })

  it('never shrinks below single line baseline', () => {
    const metrics = computeAutoGrowTextareaHeight({
      singleLineHeightPx: 48,
      scrollHeightPx: 40,
      maxHeightPx: 132,
      minHeightPx: 44,
    })
    expect(metrics.heightPx).toBe(48)
  })
})
