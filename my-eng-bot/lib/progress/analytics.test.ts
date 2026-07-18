import { describe, expect, it, vi } from 'vitest'
import {
  setProgressAnalyticsSink,
  trackProgressEvent,
} from '@/lib/progress/analytics'

describe('progress analytics', () => {
  it('calls sink and swallows errors', () => {
    const sink = vi.fn()
    setProgressAnalyticsSink(sink)
    trackProgressEvent('progress_viewed', { audience: 'child' })
    expect(sink).toHaveBeenCalledWith('progress_viewed', { audience: 'child' })

    setProgressAnalyticsSink(() => {
      throw new Error('boom')
    })
    expect(() => trackProgressEvent('progress_to_my_plan_click')).not.toThrow()
  })
})
