import { getCachedNecessaryWords } from '@/lib/vocabulary/catalogCache'
import {
  appendVocabMistake,
  extractLemmaMistake,
} from '@/lib/vocabulary/mistakesList'
import {
  createEmptyWordProgress,
  loadVocabularyProgress,
  patchWordProgress,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import {
  lemmaKeyFromEn,
  recordFeedFail,
  recordFeedUse,
} from '@/lib/vocabulary/wordFeed'

export type FocusLemmaRef = { en: string; ru?: string; wordId?: number }

function resolveWordId(lemma: FocusLemmaRef, stateWords: ReturnType<typeof loadVocabularyProgress>['words']): number | null {
  if (typeof lemma.wordId === 'number') return lemma.wordId
  const key = lemmaKeyFromEn(lemma.en)
  const byKey = Object.values(stateWords).find((row) => (row.lemmaKey ?? '') === key)
  if (byKey) return byKey.wordId
  const catalog = getCachedNecessaryWords() ?? []
  const found = catalog.find((word) => lemmaKeyFromEn(word.en) === key)
  return found?.id ?? null
}

/**
 * Apply Translation/Call focus outcome to WordFeed + optional mistakes inbox.
 * Best-effort localStorage; never throws into UX.
 */
export function applyFocusLemmasOutcome(params: {
  lemmas: FocusLemmaRef[]
  outcome: 'success' | 'fail'
  userText?: string | null
  source?: 'translation' | 'call'
}): void {
  if (params.lemmas.length === 0) return

  try {
    let state = loadVocabularyProgress()
    for (const lemma of params.lemmas) {
      const wordId = resolveWordId(lemma, state.words)
      const key = lemmaKeyFromEn(lemma.en)

      if (typeof wordId === 'number') {
        const current = state.words[String(wordId)] ?? createEmptyWordProgress(wordId)
        const withKey = { ...current, lemmaKey: current.lemmaKey ?? key }
        const next =
          params.outcome === 'success' ? recordFeedUse(withKey) : recordFeedFail(withKey)
        state = patchWordProgress(state, wordId, next)
      }

      if (params.outcome === 'fail') {
        const extracted = params.userText
          ? extractLemmaMistake({ userText: params.userText, focusEn: lemma.en })
          : { en: lemma.en }
        if (extracted) {
          appendVocabMistake({
            en: extracted.en,
            ru: lemma.ru,
            source: params.source ?? 'translation',
            lemmaKey: key,
          })
        }
      }
    }
    saveVocabularyProgress(state)
  } catch {
    // never block chat UX
  }
}
