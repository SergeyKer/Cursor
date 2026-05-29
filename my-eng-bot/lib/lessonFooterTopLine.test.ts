import { describe, expect, it } from 'vitest'
import { resolveLessonFooterTopLine } from '@/lib/lessonFooterTopLine'

describe('resolveLessonFooterTopLine', () => {
  it('returns level xp line when global delta positive in success_reward moment', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 8,
        bestTotalXp: 100,
        combo: 2,
        voiceFallback: 'Верно.',
        moment: 'success_reward',
      })
    ).toContain('+8 к уровню')
  })

  it('returns voiceFallback on error instead of stale global delta', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 10,
        bestTotalXp: 100,
        combo: 0,
        voiceFallback: 'Почти. Попробуйте еще раз.',
        moment: 'error',
      })
    ).toBe('Почти. Попробуйте еще раз.')
  })

  it('returns voiceFallback on checking instead of stale global delta', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 10,
        bestTotalXp: 100,
        combo: 2,
        voiceFallback: 'Смотрю ваш ответ.',
        moment: 'checking',
      })
    ).toBe('Смотрю ваш ответ.')
  })

  it('returns voiceFallback on neutral instead of stale global delta', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 10,
        bestTotalXp: 100,
        combo: 2,
        voiceFallback: 'Шаг 2: откуда ты.',
        moment: 'neutral',
      })
    ).toBe('Шаг 2: откуда ты.')
  })

  it('returns record kept message when delta zero', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 0,
        bestTotalXp: 170,
        combo: 1,
        voiceFallback: null,
      })
    ).toContain('без изменений')
  })

  it('returns repeat hint when medal saved and delta zero', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 0,
        bestTotalXp: 170,
        combo: 2,
        isRepeatWithSavedMedal: true,
        voiceFallback: null,
      })
    ).toContain('рекорд')
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 0,
        bestTotalXp: 170,
        combo: 2,
        isRepeatWithSavedMedal: true,
        voiceFallback: null,
      })
    ).not.toContain('Счёт идёт')
  })

  it('prefers step voice on repeat run instead of repeat hint', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 0,
        bestTotalXp: 170,
        combo: 0,
        isRepeatWithSavedMedal: true,
        voiceFallback: 'Вижу, вы готовы к новой конструкции.',
        moment: 'neutral',
      })
    ).toBe('Вижу, вы готовы к новой конструкции.')
  })

  it('shows combo milestone line with fire glyph', () => {
    expect(
      resolveLessonFooterTopLine({
        audience: 'adult',
        globalDelta: 0,
        bestTotalXp: 100,
        combo: 3,
        comboMilestoneBlocked: true,
        voiceFallback: null,
      })
    ).toBe('🔥 COMBO ×3 — в счёте урока.')
  })
})

