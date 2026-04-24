export function shouldUseMediaRecorderFallback(params: {
  hasSpeechRecognition: boolean
  isIosChrome: boolean
}): boolean {
  return params.isIosChrome || !params.hasSpeechRecognition
}

export function isIosLikeDevice(userAgent: string): boolean {
  const ua = userAgent ?? ''
  return /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
}

export function isIosChromeBrowser(userAgent: string): boolean {
  const ua = userAgent ?? ''
  const isCriOs = /CriOS\/\d+/i.test(ua)
  return isIosLikeDevice(ua) && isCriOs
}

/** iOS (любой браузер) и Chrome/Chromium: в textarea и оверлее голоса выравнивание текста расходится без общих метрик. */
export function needsVoiceComposerWebMetrics(userAgent: string): boolean {
  const ua = userAgent ?? ''
  if (isIosLikeDevice(ua)) return true
  const isEdge = /EdgA?\//i.test(ua)
  const isChromeFamily = /Chrome\/\d+/i.test(ua) || /CriOS\/\d+/i.test(ua)
  return isChromeFamily && !isEdge
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
