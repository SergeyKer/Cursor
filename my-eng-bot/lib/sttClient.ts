export function shouldUseMediaRecorderFallback(params: {
  hasSpeechRecognition: boolean
  userAgent: string
}): boolean {
  // Быстрый путь — всегда предпочитаем нативный Web Speech, если он доступен.
  // Fallback через MediaRecorder запускаем только когда API реально недоступен
  // или когда распознавание падает в runtime (см. Chat.tsx onerror/start catch).
  return !params.hasSpeechRecognition
}

export function sttLangFromLocale(locale: 'ru-RU' | 'en-US'): 'ru' | 'en' {
  return locale.startsWith('ru') ? 'ru' : 'en'
}

export function pickRecordingMimeType(
  isTypeSupported: (mime: string) => boolean
): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const mime of candidates) {
    if (isTypeSupported(mime)) return mime
  }
  return undefined
}
