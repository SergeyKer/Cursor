export function shouldUseMediaRecorderFallback(params: {
  hasSpeechRecognition: boolean
}): boolean {
  return !params.hasSpeechRecognition
}

export function shouldUseShortSilenceTimeoutForIosChrome(params: {
  userAgent: string
}): boolean {
  return isIosChromeBrowser(params.userAgent)
}

export function isIosChromeBrowser(userAgent: string): boolean {
  const ua = userAgent ?? ''
  const isIosDevice = /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
  const isCriOs = /CriOS\/\d+/i.test(ua)
  return isIosDevice && isCriOs
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
