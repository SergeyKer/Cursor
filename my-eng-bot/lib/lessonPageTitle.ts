export type LessonPageTitleStage = 'intro' | 'tips' | 'lesson'

export type LessonPageTitleInput = {
  stage: LessonPageTitleStage
  topicTitle: string
  progressAriaLabel?: string | null
}

export type LessonPageTitleView = {
  prefix: 'Урок:' | 'Фишки:' | null
  topicSegment: string
  displayTitle: string
  fullTitle: string
  ariaLabel: string
}

const LESSON_PREFIX = 'Урок:' as const
const TIPS_PREFIX = 'Фишки:' as const

export function buildLessonPageTitle(input: LessonPageTitleInput): LessonPageTitleView {
  const topic = input.topicTitle.trim()
  const prefix =
    input.stage === 'lesson' ? null : input.stage === 'tips' ? TIPS_PREFIX : LESSON_PREFIX
  const fullTitle = prefix ? `${prefix} ${topic}` : topic
  const progressSuffix = input.progressAriaLabel?.trim()
  const ariaLabel = progressSuffix ? `${fullTitle}. ${progressSuffix}` : fullTitle

  return {
    prefix,
    topicSegment: topic,
    displayTitle: fullTitle,
    fullTitle,
    ariaLabel,
  }
}

export function getLessonHeaderCenterPaddingClass(input: {
  isPreSteps: boolean
  hasHeaderMedal: boolean
  hasProgressSubStep: boolean
}): string {
  if (input.hasProgressSubStep) {
    return 'px-[3.75rem] sm:px-[5rem]'
  }
  if (input.isPreSteps && !input.hasHeaderMedal) {
    return 'px-12 sm:px-16'
  }
  return 'px-14 sm:px-[4.25rem]'
}

/** max-width для заголовка, центрированного по всей ширине хедера (left: 50%). */
export function getAppHeaderTitleMaxWidthClass(input: {
  dialogStarted: boolean
  hasCommunicationControls: boolean
  lessonPageTitleView: boolean
  hasLessonHeaderProgress: boolean
  isLessonPreSteps: boolean
  hasHeaderMedal: boolean
}): string {
  if (input.lessonPageTitleView) {
    if (input.hasLessonHeaderProgress) {
      return 'max-w-[calc(100%-3rem-10rem)] sm:max-w-[calc(100%-3rem-12rem)]'
    }
    if (input.isLessonPreSteps && !input.hasHeaderMedal) {
      return 'max-w-[calc(100%-3rem-7rem)] sm:max-w-[calc(100%-3rem-9rem)]'
    }
    return 'max-w-[calc(100%-3rem-8rem)] sm:max-w-[calc(100%-3rem-9.5rem)]'
  }
  if (input.hasCommunicationControls) {
    return 'max-w-[calc(100%-3rem-9.5rem)] sm:max-w-[calc(100%-3rem-10.5rem)]'
  }
  if (input.dialogStarted) {
    return 'max-w-[calc(100%-3rem-3.5rem)]'
  }
  return 'max-w-[calc(100%-3.5rem)]'
}
