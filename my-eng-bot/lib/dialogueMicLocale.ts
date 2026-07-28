/**
 * Dialogue mic language. Browser/Web Speech en-US strips Cyrillic and breaks
 * free_talk topic naming + mixed input (e.g. "I go to школа").
 * Default: Whisper auto via MediaRecorder. One-shot forceNextMicLang still wins.
 */
export function resolveDialogueSttLang(
  forceNextMicLang?: 'ru' | 'en' | null
): 'ru' | 'en' | 'auto' {
  if (forceNextMicLang === 'ru' || forceNextMicLang === 'en') return forceNextMicLang
  return 'auto'
}
