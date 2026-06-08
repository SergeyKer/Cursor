export const FEEDBACK_SUCCESS_MARKER = '🟢'

export const FEEDBACK_ERROR_FIRST_MARKER = '🟡'

export const FEEDBACK_ERROR_REPEAT_MARKER = '🔴'



/** Плоский CSS-кружок в UI (без emoji-шрифта на Android/iOS). */

export const FEEDBACK_MARKER_DOT_CLASS: Record<string, string> = {

  [FEEDBACK_SUCCESS_MARKER]: 'bg-emerald-500',

  [FEEDBACK_ERROR_FIRST_MARKER]: 'bg-amber-400',

  [FEEDBACK_ERROR_REPEAT_MARKER]: 'bg-amber-400',

}



const FEEDBACK_MARKERS = [

  FEEDBACK_SUCCESS_MARKER,

  FEEDBACK_ERROR_FIRST_MARKER,

  FEEDBACK_ERROR_REPEAT_MARKER,

] as const



export type ParsedFeedbackStatusText =

  | { kind: 'plain'; text: string }

  | { kind: 'marked'; dotClass: string; text: string }



export function resolveFeedbackMarker(params: {

  tone: 'success' | 'error'

  attemptNumber: number

}): string {

  if (params.tone === 'success') return FEEDBACK_SUCCESS_MARKER

  return FEEDBACK_ERROR_FIRST_MARKER

}



export function stripFeedbackMarkerPrefix(message: string): string {

  let result = message.trimStart()

  let stripped = true

  while (stripped) {

    stripped = false

    for (const marker of FEEDBACK_MARKERS) {

      if (result.startsWith(marker)) {

        result = result.slice(marker.length).trimStart()

        stripped = true

        break

      }

    }

  }

  return result

}



export function parseFeedbackStatusText(text: string): ParsedFeedbackStatusText {

  const trimmed = text.trimStart()

  for (const marker of FEEDBACK_MARKERS) {

    if (trimmed.startsWith(marker)) {

      return {

        kind: 'marked',

        dotClass: FEEDBACK_MARKER_DOT_CLASS[marker],

        text: stripFeedbackMarkerPrefix(trimmed),

      }

    }

  }

  return { kind: 'plain', text: text.trim() }

}



export function prefixFeedbackMarker(marker: string, message: string): string {

  const body = stripFeedbackMarkerPrefix(message)

  if (!body) return marker

  return `${marker} ${body}`

}


