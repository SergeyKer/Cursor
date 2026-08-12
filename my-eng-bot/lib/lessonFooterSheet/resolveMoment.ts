import type {
  ResolveLessonFooterSheetMomentInput,
  LessonFooterSheetMoment,
} from '@/lib/lessonFooterSheet/types'

/**
 * Priority: active lesson screen (even under menu) → lessons list → null (out of scope).
 */
export function resolveLessonFooterSheetMoment(
  input: ResolveLessonFooterSheetMomentInput
): LessonFooterSheetMoment | null {
  const stage = input.lessonViewStage ?? null

  if (stage === 'intro') return 'intro'
  if (stage === 'tips') return 'tips'
  if (stage === 'briefing') return 'briefing'
  if (stage === 'reference') return 'reference'

  if (stage === 'lesson' || input.structuredLessonActive) {
    if (input.structuredLessonCompleted) return 'finale'
    const status = input.structuredLessonStatus ?? ''
    if (status === 'completed') return 'finale'
    if (status === 'checking') return 'lesson_checking'
    if (input.structuredLessonFeedbackType === 'error') return 'lesson_error'
    if (input.structuredLessonFeedbackType === 'success') return 'lesson_success'
    return 'lesson_idle'
  }

  if (input.lessonsMenuOpenWithoutLesson) return 'lessons_menu'
  return null
}

export function isLessonHudFooterScope(
  input: ResolveLessonFooterSheetMomentInput
): boolean {
  return resolveLessonFooterSheetMoment(input) != null
}
