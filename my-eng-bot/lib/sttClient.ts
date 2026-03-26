export function shouldUseMediaRecorderFallback(params: {
  hasSpeechRecognition: boolean
  userAgent: string
}): boolean {
  if (!params.hasSpeechRecognition) return true
  const ua = params.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isChromeIOS = /CriOS/i.test(ua)
  return isIOS && isChromeIOS
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
