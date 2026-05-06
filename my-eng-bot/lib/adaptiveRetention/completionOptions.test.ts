import { describe, expect, it } from 'vitest'
import { buildCompletionOptions } from '@/lib/adaptiveRetention/completionOptions'

describe('buildCompletionOptions', () => {
  it('prioritizes fixing errors', () => {
    const options = buildCompletionOptions({
      kind: 'practice',
      title: 'Airport Survival',
      hadErrors: true,
      hasDueWords: false,
      audience: 'adult',
    })

    expect(options[0]).toMatchObject({ id: 'fix-errors', primary: true })
  })

  it('keeps due words as a secondary retention option', () => {
    const options = buildCompletionOptions({
      kind: 'vocabulary',
      title: 'Travel',
      hadErrors: false,
      hasDueWords: true,
      activeGoalTitle: 'Travel Basics',
      audience: 'adult',
    })

    expect(options.some((option) => option.id === 'review-due')).toBe(true)
  })
})
