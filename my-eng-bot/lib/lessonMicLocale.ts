/**
 * Lesson / tutor mic strategy.
 * - `en`: Web Speech en-US (lessons) — unchanged default.
 * - `mix`: Whisper auto via MediaRecorder (tutor mixed RU+EN dictation),
 *   same engine idea as dialogue — not communication browser ru→en retry.
 */

export type LessonSpeechMode = 'en' | 'mix'

export type LessonMicStrategy =
  | { kind: 'browser'; locale: 'en-US'; apiLang: 'en' }
  | { kind: 'whisper-auto' }

export function resolveLessonMicStrategy(speechMode: LessonSpeechMode = 'en'): LessonMicStrategy {
  if (speechMode === 'mix') return { kind: 'whisper-auto' }
  return { kind: 'browser', locale: 'en-US', apiLang: 'en' }
}
