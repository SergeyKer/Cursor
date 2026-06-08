import { describe, expect, it } from 'vitest'

import {

  FEEDBACK_ERROR_FIRST_MARKER,

  FEEDBACK_ERROR_REPEAT_MARKER,

  FEEDBACK_MARKER_DOT_CLASS,

  FEEDBACK_SUCCESS_MARKER,

  parseFeedbackStatusText,

  prefixFeedbackMarker,

  resolveFeedbackMarker,

  stripFeedbackMarkerPrefix,

} from '@/lib/feedbackMarkers'



describe('resolveFeedbackMarker', () => {

  it('returns green for success', () => {

    expect(resolveFeedbackMarker({ tone: 'success', attemptNumber: 1 })).toBe(FEEDBACK_SUCCESS_MARKER)

    expect(resolveFeedbackMarker({ tone: 'success', attemptNumber: 3 })).toBe(FEEDBACK_SUCCESS_MARKER)

  })



  it('returns yellow for any error attempt', () => {

    expect(resolveFeedbackMarker({ tone: 'error', attemptNumber: 1 })).toBe(FEEDBACK_ERROR_FIRST_MARKER)

    expect(resolveFeedbackMarker({ tone: 'error', attemptNumber: 2 })).toBe(FEEDBACK_ERROR_FIRST_MARKER)

    expect(resolveFeedbackMarker({ tone: 'error', attemptNumber: 5 })).toBe(FEEDBACK_ERROR_FIRST_MARKER)

  })

})



describe('prefixFeedbackMarker', () => {

  it('prefixes message with marker', () => {

    expect(prefixFeedbackMarker(FEEDBACK_SUCCESS_MARKER, 'Верно.')).toBe('🟢 Верно.')

    expect(prefixFeedbackMarker(FEEDBACK_ERROR_FIRST_MARKER, 'Почти.')).toBe('🟡 Почти.')

  })



  it('is idempotent and strips legacy markers', () => {

    expect(prefixFeedbackMarker(FEEDBACK_ERROR_REPEAT_MARKER, '🔴 Неверно.')).toBe('🔴 Неверно.')

    expect(prefixFeedbackMarker(FEEDBACK_SUCCESS_MARKER, '🟢 Верно.')).toBe('🟢 Верно.')

  })



  it('stripFeedbackMarkerPrefix removes known markers', () => {

    expect(stripFeedbackMarkerPrefix('🟡 Почти.')).toBe('Почти.')

    expect(stripFeedbackMarkerPrefix('🔴 Неверно.')).toBe('Неверно.')

  })

})



describe('parseFeedbackStatusText', () => {

  it('maps success to green dot class', () => {

    const parsed = parseFeedbackStatusText('🟢 Верно. Шаг 2 из 7.')

    expect(parsed).toEqual({

      kind: 'marked',

      dotClass: FEEDBACK_MARKER_DOT_CLASS[FEEDBACK_SUCCESS_MARKER],

      text: 'Верно. Шаг 2 из 7.',

    })

  })



  it('maps first error to yellow dot class', () => {

    const parsed = parseFeedbackStatusText('🟡 Почти. Попробуйте еще раз.')

    expect(parsed).toEqual({

      kind: 'marked',

      dotClass: FEEDBACK_MARKER_DOT_CLASS[FEEDBACK_ERROR_FIRST_MARKER],

      text: 'Почти. Попробуйте еще раз.',

    })

  })



  it('maps legacy red marker prefix to yellow dot class', () => {

    const parsed = parseFeedbackStatusText("🔴 Неверно. Попробуйте ещё раз: I'm happy.")

    expect(parsed).toEqual({

      kind: 'marked',

      dotClass: FEEDBACK_MARKER_DOT_CLASS[FEEDBACK_ERROR_FIRST_MARKER],

      text: "Неверно. Попробуйте ещё раз: I'm happy.",

    })

  })



  it('strips duplicate marker prefix idempotently', () => {

    const parsed = parseFeedbackStatusText('🔴 🔴 Неверно.')

    expect(parsed).toEqual({

      kind: 'marked',

      dotClass: FEEDBACK_MARKER_DOT_CLASS[FEEDBACK_ERROR_FIRST_MARKER],

      text: 'Неверно.',

    })

  })



  it('returns plain text without marker when prefix is unknown', () => {

    expect(parseFeedbackStatusText('Просто текст.')).toEqual({

      kind: 'plain',

      text: 'Просто текст.',

    })

  })

})


