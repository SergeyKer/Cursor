import { normalizeEnglishForLearnerAnswerMatch } from '@/lib/normalizeEnglishForLearnerAnswerMatch'
import { foldLatinHomoglyphsForEnglishMatch } from '@/lib/normalizeEnglishForRepeatMatch'
import { lemmaKeyFromEn } from '@/lib/vocabulary/wordFeed'

const MISTAKES_KEY = 'engvo_vocab_mistakes_inbox'
const MAX_ITEMS = 80

export type VocabMistakeItem = {
  lemmaKey: string
  en: string
  ru?: string
  at: number
  source: 'translation' | 'call' | 'practice' | 'manual'
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadVocabMistakes(): VocabMistakeItem[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(MISTAKES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VocabMistakeItem[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function saveVocabMistakes(items: VocabMistakeItem[]): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(MISTAKES_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // ignore
  }
}

export function appendVocabMistake(item: Omit<VocabMistakeItem, 'at' | 'lemmaKey'> & { lemmaKey?: string }): void {
  const lemmaKey = item.lemmaKey ?? lemmaKeyFromEn(item.en)
  const current = loadVocabMistakes().filter((row) => row.lemmaKey !== lemmaKey)
  saveVocabMistakes([{ ...item, lemmaKey, at: Date.now() }, ...current])
}

export function vocabMistakeLemmaKeys(): Set<string> {
  return new Set(loadVocabMistakes().map((item) => item.lemmaKey))
}

/**
 * Heuristic: Cyrillic token in user EN answer vs EN focus → mistake.
 * Typos / folded homoglyphs are not mistakes.
 */
export function extractLemmaMistake(params: {
  userText: string
  focusEn: string
  correctedEn?: string
}): { en: string } | null {
  const focus = normalizeEnglishForLearnerAnswerMatch(params.focusEn, 'translation')
  const user = normalizeEnglishForLearnerAnswerMatch(
    foldLatinHomoglyphsForEnglishMatch(params.userText),
    'translation'
  )
  if (!focus) return null
  if (user.includes(focus)) return null

  const hasCyrillic = /[А-Яа-яЁё]/.test(params.userText)
  if (hasCyrillic) {
    const en = params.correctedEn?.trim() || params.focusEn.trim()
    return en ? { en } : null
  }

  // edit distance soft allow for single-token focus
  if (focus.split(' ').length === 1 && user.split(' ').length === 1) {
    const a = focus
    const b = user
    if (Math.abs(a.length - b.length) <= 1) {
      let diff = 0
      for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
        if (a[i] !== b[i]) diff += 1
      }
      diff += Math.abs(a.length - b.length)
      if (diff <= 1) return null
    }
  }

  return { en: params.focusEn.trim() }
}
