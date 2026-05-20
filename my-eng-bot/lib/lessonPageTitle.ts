export type LessonPageTitleStage = 'intro' | 'tips' | 'lesson'

export type LessonPageTitleInput = {
  stage: LessonPageTitleStage
  topicTitle: string
  progressAriaLabel?: string | null
}

export type LessonPageTitleView = {
  prefix: 'Урок:' | null
  topicSegment: string
  displayTitle: string
  fullTitle: string
  ariaLabel: string
}

const LESSON_PREFIX = 'Урок:' as const

export function buildLessonPageTitle(input: LessonPageTitleInput): LessonPageTitleView {
  const topic = input.topicTitle.trim()
  const prefix = input.stage === 'lesson' ? null : LESSON_PREFIX
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
