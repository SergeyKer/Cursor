/**
 * Фильтр текста транскрипта звонка Engvo перед показом в чате:
 * только латиница/кириллица (включая смесь) + цифры и базовая пунктуация;
 * короткие шумовые реплики (кхе, hm, uh…) не показываем.
 */

const ENGVO_ALLOWED_NON_LETTER = /^[\s0-9.,!?;:'"«»„""''\u2018\u2019\u201C\u201D\-–—…()[\]{}]$/u

function engvoVoiceTranscriptHasOnlyLatinOrCyrillicLetters(text: string): boolean {
  const s = text.trim().normalize('NFC')
  if (!s) return false
  for (const ch of s) {
    if (/\s/u.test(ch)) continue
    if (/[0-9]/.test(ch)) continue
    if (ENGVO_ALLOWED_NON_LETTER.test(ch)) continue
    if (/\p{L}/u.test(ch)) {
      if (/\p{Script=Latin}/u.test(ch) || /\p{Script=Cyrillic}/u.test(ch)) continue
      return false
    }
    if (/\p{M}/u.test(ch)) continue
    return false
  }
  return true
}

function lettersAndDigitsNormalized(text: string): string {
  return text.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()
}

const ENGVO_NOISE_TRANSCRIPTS = new Set([
  'hm',
  'hmm',
  'uh',
  'uhh',
  'um',
  'umm',
  'eh',
  'ah',
  'oh',
  'mm',
  'mhm',
  'mhmm',
  'хм',
  'хмм',
  'эм',
  'мм',
  'кх',
  'кхе',
  'кхм',
  'кхкх',
  'tsk',
  'tss',
  'psst',
])

export function engvoVoiceTranscriptIsLikelyNoise(text: string): boolean {
  const n = lettersAndDigitsNormalized(text)
  if (!n) return true
  if (n.length >= 6) return false
  if (ENGVO_NOISE_TRANSCRIPTS.has(n)) return true
  if (/^[кх]+$/u.test(n) && n.length <= 8) return true
  if (/^[hm]+$/u.test(n) && n.length <= 6) return true
  return false
}

/** `true`, если транскрипт можно показать пользователю в чате звонка. */
export function shouldShowEngvoVoiceUserTranscript(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (!engvoVoiceTranscriptHasOnlyLatinOrCyrillicLetters(t)) return false
  if (engvoVoiceTranscriptIsLikelyNoise(t)) return false
  return true
}
