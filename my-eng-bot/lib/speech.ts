/**
 * TTS: воспроизведение текста выбранным голосом.
 */
export function speak(text: string, voiceId: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  if (voiceId) {
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((v) => v.voiceURI === voiceId || v.name === voiceId)
    if (voice) u.voice = voice
  }
  window.speechSynthesis.speak(u)
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

/**
 * Ждём загрузки голосов (на некоторых браузерах getVoices() пустой до события).
 */
export function onVoicesLoaded(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {}
  const wrap = () => cb()
  window.speechSynthesis.onvoiceschanged = wrap
  if (window.speechSynthesis.getVoices().length > 0) cb()
  return () => {
    window.speechSynthesis.onvoiceschanged = null
  }
}
