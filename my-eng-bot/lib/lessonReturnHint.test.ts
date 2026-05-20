import { describe, expect, it } from 'vitest'
import { buildLessonReturnHint, buildLessonReturnHintBannerLine } from '@/lib/lessonReturnHint'

describe('buildLessonReturnHint', () => {
  it('builds menu reopen hint without repeat cap line', () => {
    const text = buildLessonReturnHint({
      medal: 'gold',
      audience: 'adult',
      context: 'menu_reopen',
      bestTotalXp: 170,
    })
    expect(text).toContain('сохраняется')
    expect(text).toContain('170 XP')
    expect(text).not.toContain('максимум серебро')
  })

  it('builds post lesson repeat hint with cap line', () => {
    const text = buildLessonReturnHint({
      medal: 'gold',
      audience: 'adult',
      context: 'post_lesson_repeat',
      bestTotalXp: 170,
    })
    expect(text).toContain('максимум серебро')
    expect(text.split('\n')).toHaveLength(3)
  })

  it('builds single-line banner without newlines', () => {
    const line = buildLessonReturnHintBannerLine({
      audience: 'adult',
      bestTotalXp: 120,
    })
    expect(line).toContain('120 XP')
    expect(line).not.toContain('\n')
  })
})
