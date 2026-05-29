import { describe, expect, it } from 'vitest'
import { buildLessonCycle1Hint } from '@/lib/lessonCycle1Hint'

describe('buildLessonCycle1Hint', () => {
  it('local reopen after cycle1 closed', () => {
    const text = buildLessonCycle1Hint({ audience: 'adult', origin: 'menu_reopen' })
    expect(text).toContain('максимум серебро')
    expect(text).toContain('сгенерированном')
  })

  it('generate variant allows gold again', () => {
    const text = buildLessonCycle1Hint({ audience: 'child', origin: 'menu_generate' })
    expect(text).toContain('золото')
    expect(text).not.toContain('максимум серебро')
  })
})
