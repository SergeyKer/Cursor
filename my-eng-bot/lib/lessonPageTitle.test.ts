import { describe, expect, it } from 'vitest'
import {
  buildLessonPageTitle,
  getAppHeaderTitleMaxWidthClass,
  getLessonHeaderCenterPaddingClass,
} from '@/lib/lessonPageTitle'

describe('buildLessonPageTitle', () => {
  it('uses Урок prefix before steps', () => {
    expect(
      buildLessonPageTitle({
        stage: 'intro',
        topicTitle: 'Who ...?',
      })
    ).toEqual({
      prefix: 'Урок:',
      topicSegment: 'Who ...?',
      displayTitle: 'Урок: Who ...?',
      fullTitle: 'Урок: Who ...?',
      ariaLabel: 'Урок: Who ...?',
    })
  })

  it('uses Фишки prefix on tips', () => {
    const view = buildLessonPageTitle({
      stage: 'tips',
      topicTitle: "It's / It's time to",
    })
    expect(view.prefix).toBe('Фишки:')
    expect(view.fullTitle).toBe("Фишки: It's / It's time to")
  })

  it('keeps full topicSegment for long tips titles (CSS truncates)', () => {
    const longTopic = 'Present Perfect Continuous vs Present Perfect Simple'
    const view = buildLessonPageTitle({
      stage: 'tips',
      topicTitle: longTopic,
    })
    expect(view.prefix).toBe('Фишки:')
    expect(view.topicSegment).toBe(longTopic)
    expect(view.fullTitle).toBe(`Фишки: ${longTopic}`)
  })

  it('shows topic only on lesson steps', () => {
    expect(
      buildLessonPageTitle({
        stage: 'lesson',
        topicTitle: 'I know what she likes',
        progressAriaLabel: 'Шаг 2 из 7',
      })
    ).toEqual({
      prefix: null,
      topicSegment: 'I know what she likes',
      displayTitle: 'I know what she likes',
      fullTitle: 'I know what she likes',
      ariaLabel: 'I know what she likes. Шаг 2 из 7',
    })
  })

  it('trims topic whitespace', () => {
    const view = buildLessonPageTitle({
      stage: 'intro',
      topicTitle: '  Colors  ',
    })
    expect(view.topicSegment).toBe('Colors')
    expect(view.fullTitle).toBe('Урок: Colors')
  })
})

describe('getLessonHeaderCenterPaddingClass', () => {
  it('widens padding for progress sub-steps', () => {
    expect(
      getLessonHeaderCenterPaddingClass({
        isPreSteps: false,
        hasHeaderMedal: true,
        hasProgressSubStep: true,
      })
    ).toBe('px-[3.75rem] sm:px-[5rem]')
  })

  it('narrows padding on pre-steps without medal', () => {
    expect(
      getLessonHeaderCenterPaddingClass({
        isPreSteps: true,
        hasHeaderMedal: false,
        hasProgressSubStep: false,
      })
    ).toBe('px-12 sm:px-16')
  })

  it('uses default padding when medal is shown before steps', () => {
    expect(
      getLessonHeaderCenterPaddingClass({
        isPreSteps: true,
        hasHeaderMedal: true,
        hasProgressSubStep: false,
      })
    ).toBe('px-14 sm:px-[4.25rem]')
  })
})

describe('getAppHeaderTitleMaxWidthClass', () => {
  it('reserves space for communication controls on the right', () => {
    expect(
      getAppHeaderTitleMaxWidthClass({
        dialogStarted: true,
        hasCommunicationControls: true,
        lessonPageTitleView: false,
        hasLessonHeaderProgress: false,
        isLessonPreSteps: false,
        hasHeaderMedal: false,
      })
    ).toBe('max-w-[calc(100%-3rem-9.5rem)] sm:max-w-[calc(100%-3rem-10.5rem)]')
  })

  it('uses lesson progress width when progress label is shown', () => {
    expect(
      getAppHeaderTitleMaxWidthClass({
        dialogStarted: true,
        hasCommunicationControls: false,
        lessonPageTitleView: true,
        hasLessonHeaderProgress: true,
        isLessonPreSteps: false,
        hasHeaderMedal: true,
      })
    ).toBe('max-w-[calc(100%-3rem-10rem)] sm:max-w-[calc(100%-3rem-12rem)]')
  })
})
