/** Ключ активной или только что поставленной в очередь озвучки (для повторного клика «стоп»). */
let activeSpeakSessionKey: string | null = null
let androidSpeakRetryTimer: ReturnType<typeof window.setTimeout> | null = null

function makeSpeakSessionKey(text: string, voiceId: string): string {
  return `${text}\0${voiceId}`
}

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
  allowCustomVoice: boolean,
  sessionKey: string
): void {
  const utterance = new SpeechSynthesisUtterance(text)
  // Автодетект языка по кириллице: для общения на русском/английском TTS должен звучать на нужном языке.
  const isRu = /[А-Яа-яЁё]/.test(text)
  utterance.lang = isRu ? 'ru-RU' : 'en-US'
  utterance.rate = 0.9

  const voices = synth.getVoices()
  const selectedVoice = selectVoice(voices, voiceId, allowCustomVoice, isRu ? 'ru' : 'en')
  if (selectedVoice) utterance.voice = selectedVoice

  const releaseSession = () => {
    if (activeSpeakSessionKey === sessionKey) activeSpeakSessionKey = null
  }
  utterance.onend = releaseSession
  utterance.onerror = releaseSession

  // Вызов speak() синхронно после cancel(): setTimeout(0) выводит в macrotask и в Chromium
  // часто ломает user activation — озвучка не стартует без ошибки.
  const runSpeak = () => {
    if (synth.paused) synth.resume()
    // До onstart: чтобы второй клик «Озвучить» по тому же тексту сразу остановил очередь.
    activeSpeakSessionKey = sessionKey
    synth.speak(utterance)
  }
  runSpeak()
}

function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * TTS: воспроизведение текста выбранным голосом.
 * Повторный вызов с тем же текстом и voiceId, пока идёт воспроизведение или очередь не пуста — останавливает озвучку.
 * На Android и iOS игнорирует voiceId и использует системный голос.
 */
export function speak(text: string, voiceId: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const normalized = text.trim()
  if (!normalized) return

  const synth = window.speechSynthesis
  const allowCustomVoice = true
  const androidBrowser = isAndroidBrowser()
  const sessionKey = makeSpeakSessionKey(normalized, voiceId)

  if (androidSpeakRetryTimer != null) {
    window.clearTimeout(androidSpeakRetryTimer)
    androidSpeakRetryTimer = null
  }

  if ((synth.speaking || synth.pending) && activeSpeakSessionKey === sessionKey) {
    synth.cancel()
    activeSpeakSessionKey = null
    return
  }

  // На Android cancel() перед каждым speak() может прервать и следующий utterance.
  // Поэтому отменяем только когда очередь реально занята.
  if (!androidBrowser || synth.speaking || synth.pending) {
    synth.cancel()
  }
  speakOnce(synth, normalized, voiceId, allowCustomVoice, sessionKey)

  // На части Android-устройств первый запуск "молчит" без явной ошибки.
  // Повторяем один раз с системным голосом.
  if (androidBrowser) {
    androidSpeakRetryTimer = window.setTimeout(() => {
      androidSpeakRetryTimer = null
      if (!synth.speaking && !synth.pending) {
        speakOnce(synth, normalized, '', false, sessionKey)
      }
    }, 180)
  }

  // Safari/Chromium иногда отдают голоса не сразу. Делаем один авто-ретрай.
  if (synth.getVoices().length === 0) {
    const onVoicesReady = () => {
      synth.removeEventListener('voiceschanged', onVoicesReady)
      if (!synth.speaking) {
        speakOnce(synth, normalized, voiceId, allowCustomVoice, sessionKey)
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
