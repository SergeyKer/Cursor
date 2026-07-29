/**
 * Lesson / tutor mic strategy.
 * - `en`: Web Speech en-US (lessons) — unchanged default.
 * - `mix`: browser ru-RU → en-US retry with interim (same idea as communication mix).
 */

export type LessonSpeechMode = 'en' | 'mix'

export type LessonMicStrategy =
  | { kind: 'browser'; locale: 'en-US'; apiLang: 'en' }
  | { kind: 'browser-mix'; primary: 'ru-RU'; secondary: 'en-US'; apiLang: 'ru' }

export function resolveLessonMicStrategy(speechMode: LessonSpeechMode = 'en'): LessonMicStrategy {
  if (speechMode === 'mix') {
    return { kind: 'browser-mix', primary: 'ru-RU', secondary: 'en-US', apiLang: 'ru' }
  }
  return { kind: 'browser', locale: 'en-US', apiLang: 'en' }
}
