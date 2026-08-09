import type { VocabularyFocusLemma } from '@/types/vocabulary'

const HANDOFF_KEY = 'engvo_vocab_translation_handoff'
const HANDOFF_TTL_MS = 30 * 60 * 1000

export type VocabTranslationHandoff = {
  lemmas: VocabularyFocusLemma[]
  source: 'vocab_finale' | 'feed_browse' | 'my_plan'
  at: number
  loadStudying?: boolean
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function writeVocabTranslationHandoff(packet: Omit<VocabTranslationHandoff, 'at'> & { at?: number }): void {
  if (!canUseStorage()) return
  const full: VocabTranslationHandoff = {
    lemmas: packet.lemmas,
    source: packet.source,
    at: packet.at ?? Date.now(),
    loadStudying: packet.loadStudying ?? true,
  }
  try {
    window.localStorage.setItem(HANDOFF_KEY, JSON.stringify(full))
  } catch {
    // best-effort
  }
}

export function peekVocabTranslationHandoff(now: number = Date.now()): VocabTranslationHandoff | null {
  if (!canUseStorage()) return null
  try {
    const raw = window.localStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VocabTranslationHandoff
    if (!parsed || !Array.isArray(parsed.lemmas) || typeof parsed.at !== 'number') return null
    if (now - parsed.at > HANDOFF_TTL_MS) {
      window.localStorage.removeItem(HANDOFF_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Read and clear. */
export function consumeVocabTranslationHandoff(now: number = Date.now()): VocabTranslationHandoff | null {
  const packet = peekVocabTranslationHandoff(now)
  if (!canUseStorage()) return packet
  try {
    window.localStorage.removeItem(HANDOFF_KEY)
  } catch {
    // ignore
  }
  return packet
}

export function clearVocabTranslationHandoff(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(HANDOFF_KEY)
  } catch {
    // ignore
  }
}

export function formatFocusLemmasCue(lemmas: VocabularyFocusLemma[]): string {
  if (lemmas.length === 0) return ''
  const list = lemmas.map((l) => `${l.en}${l.ru ? ` (${l.ru})` : ''}`).join(', ')
  return `Focus words today (learner should use these English lemmas when natural): ${list}. Prefer prompts that elicit these words.`
}
