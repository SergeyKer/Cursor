export function shouldUseMediaRecorderFallback(params: {
  hasSpeechRecognition: boolean
  userAgent: string
}): boolean {
  const ua = params.userAgent.toLowerCase()
  const isIphoneChrome = /iphone|ipad|ipod/.test(ua) && /crios\//.test(ua)
  if (isIphoneChrome) return true
  return !params.hasSpeechRecognition
}

export function sttLangFromLocale(locale: 'ru-RU' | 'en-US'): 'ru' | 'en' {
  return locale.startsWith('ru') ? 'ru' : 'en'
}

export function pickRecordingMimeType(
  isTypeSupported: (mime: string) => boolean
): string | undefined {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const mime of candidates) {
    if (isTypeSupported(mime)) return mime
  }
  return undefined
}
