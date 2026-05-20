import { describe, expect, it } from 'vitest'
import { buildLessonPageTitle, getLessonHeaderCenterPaddingClass } from '@/lib/lessonPageTitle'

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

  it('uses Урок prefix on tips', () => {
    const view = buildLessonPageTitle({
      stage: 'tips',
      topicTitle: "It's / It's time to",
    })
    expect(view.prefix).toBe('Урок:')
    expect(view.fullTitle).toBe("Урок: It's / It's time to")
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
