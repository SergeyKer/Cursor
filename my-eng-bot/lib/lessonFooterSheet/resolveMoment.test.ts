import { describe, expect, it } from 'vitest'
import { buildLessonFooterSheetView } from '@/lib/lessonFooterSheet/buildView'
import {
  isLessonHudFooterScope,
  resolveLessonFooterSheetMoment,
} from '@/lib/lessonFooterSheet/resolveMoment'
import type { LessonFooterSheetMoment } from '@/lib/lessonFooterSheet/types'

describe('resolveLessonFooterSheetMoment', () => {
  it('prefers active lesson stage over lessons menu', () => {
    expect(
      resolveLessonFooterSheetMoment({
        lessonViewStage: 'intro',
        lessonsMenuOpenWithoutLesson: true,
      })
    ).toBe('intro')
  })

  it('maps stages and lesson feedback', () => {
    const cases: Array<[Parameters<typeof resolveLessonFooterSheetMoment>[0], LessonFooterSheetMoment]> =
      [
        [{ lessonViewStage: 'tips' }, 'tips'],
        [{ lessonViewStage: 'briefing' }, 'briefing'],
        [{ lessonViewStage: 'reference' }, 'reference'],
        [{ lessonViewStage: 'lesson', structuredLessonStatus: 'idle' }, 'lesson_idle'],
        [{ lessonViewStage: 'lesson', structuredLessonStatus: 'checking' }, 'lesson_checking'],
        [
          {
            lessonViewStage: 'lesson',
            structuredLessonStatus: 'idle',
            structuredLessonFeedbackType: 'error',
          },
          'lesson_error',
        ],
        [
          {
            lessonViewStage: 'lesson',
            structuredLessonStatus: 'idle',
            structuredLessonFeedbackType: 'success',
          },
          'lesson_success',
        ],
        [{ lessonViewStage: 'lesson', structuredLessonStatus: 'completed' }, 'finale'],
        [{ structuredLessonActive: true, structuredLessonCompleted: true }, 'finale'],
        [{ lessonsMenuOpenWithoutLesson: true }, 'lessons_menu'],
      ]
    for (const [input, expected] of cases) {
      expect(resolveLessonFooterSheetMoment(input)).toBe(expected)
    }
  })

  it('returns null outside scope', () => {
    expect(resolveLessonFooterSheetMoment({})).toBeNull()
    expect(isLessonHudFooterScope({})).toBe(false)
    expect(isLessonHudFooterScope({ lessonViewStage: 'intro' })).toBe(true)
  })
})

describe('buildLessonFooterSheetView', () => {
  it('prefers live footer lines over fallbacks', () => {
    const view = buildLessonFooterSheetView({
      moment: 'lesson_idle',
      audience: 'adult',
      dynamicText: 'Ответь на шаг 3',
      staticText: 'Цель 3/7 | ⭐12',
    })
    expect(view.title).toBe('Подробнее')
    expect(view.now.body).toBe('Ответь на шаг 3')
    expect(view.status.body).toBe('Цель 3/7 | ⭐12')
  })

  it('uses audience fallbacks when lines empty', () => {
    const adult = buildLessonFooterSheetView({ moment: 'lessons_menu', audience: 'adult' })
    const child = buildLessonFooterSheetView({ moment: 'lessons_menu', audience: 'child' })
    expect(adult.now.body).toContain('темы уроков')
    expect(child.now.body).toContain('уроки')
  })
})
