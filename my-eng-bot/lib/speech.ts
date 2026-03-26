function selectVoice(
  voices: SpeechSynthesisVoice[],
  voiceId: string,
  allowCustomVoice: boolean,
  preferredLangPrefix: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  if (allowCustomVoice && voiceId) {
    const exact = voices.find((v) => v.voiceURI === voiceId || v.name === voiceId)
    if (exact) return exact
  }

  const preferredPrefixRe = new RegExp(`^${preferredLangPrefix}(-|_)`, 'i')
  const preferred =
    voices.find((v) => preferredPrefixRe.test(v.lang) && v.default) || voices.find((v) => preferredPrefixRe.test(v.lang))
  if (preferred) return preferred

  return voices.find((v) => v.default) ?? voices[0] ?? null
}

function speakOnce(
  synth: SpeechSynthesis,
  text: string,
  voiceId: string,
  allowCustomVoice: boolean
): void {
  const utterance = new SpeechSynthesisUtterance(text)
  // Автодетект языка по кириллице: для общения на русском/английском TTS должен звучать на нужном языке.
  const isRu = /[А-Яа-яЁё]/.test(text)
  utterance.lang = isRu ? 'ru-RU' : 'en-US'
  utterance.rate = 0.9

  const voices = synth.getVoices()
  const selectedVoice = selectVoice(voices, voiceId, allowCustomVoice, isRu ? 'ru' : 'en')
  if (selectedVoice) utterance.voice = selectedVoice

  // На некоторых браузерах (особенно Chromium) после cancel() нужен micro-delay.
  // Иначе speak() может "проглотиться" без ошибки и без звука.
  window.setTimeout(() => {
    if (synth.paused) synth.resume()
    synth.speak(utterance)
  }, 0)
}

/**
 * TTS: воспроизведение текста выбранным голосом.
 * На Android и iOS игнорирует voiceId и использует системный голос.
 */
export function speak(text: string, voiceId: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const normalized = text.trim()
  if (!normalized) return

  const synth = window.speechSynthesis
  const allowCustomVoice = true

  synth.cancel()
  speakOnce(synth, normalized, voiceId, allowCustomVoice)

  // Safari/Chromium иногда отдают голоса не сразу. Делаем один авто-ретрай.
  if (synth.getVoices().length === 0) {
    const onVoicesReady = () => {
      synth.removeEventListener('voiceschanged', onVoicesReady)
      if (!synth.speaking) {
        speakOnce(synth, normalized, voiceId, allowCustomVoice)
      }
    }
    synth.addEventListener('voiceschanged', onVoicesReady, { once: true })
  }
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
