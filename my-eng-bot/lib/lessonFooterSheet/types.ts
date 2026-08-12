export type LessonFooterSheetMoment =
  | 'lessons_menu'
  | 'intro'
  | 'tips'
  | 'briefing'
  | 'lesson_idle'
  | 'lesson_checking'
  | 'lesson_error'
  | 'lesson_success'
  | 'finale'
  | 'reference'

export type LessonFooterSheetAudience = 'adult' | 'child'

export type LessonFooterSheetCard = {
  marker: string
  title: string
  body: string
}

export type LessonFooterSheetView = {
  moment: LessonFooterSheetMoment
  title: string
  now: LessonFooterSheetCard
  status: LessonFooterSheetCard
}

export type ResolveLessonFooterSheetMomentInput = {
  /** Active lesson screen under the chrome (wins over menu). */
  lessonViewStage?: 'intro' | 'tips' | 'briefing' | 'lesson' | 'reference' | null
  structuredLessonActive?: boolean
  structuredLessonStatus?: string | null
  structuredLessonFeedbackType?: 'success' | 'error' | null
  structuredLessonCompleted?: boolean
  /** Side menu on lessons list without an active lesson screen. */
  lessonsMenuOpenWithoutLesson?: boolean
}

export type BuildLessonFooterSheetViewInput = {
  moment: LessonFooterSheetMoment
  audience: LessonFooterSheetAudience
  dynamicText?: string | null
  staticText?: string | null
  lessonTitle?: string | null
  statusLine?: string | null
}
