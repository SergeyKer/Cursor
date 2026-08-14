import { getCachedNecessaryWords } from '@/lib/vocabulary/catalogCache'
import {
  appendVocabMistake,
  extractLemmaMistake,
} from '@/lib/vocabulary/mistakesList'
import {
  loadVocabularyProgress,
  patchWordProgress,
  saveVocabularyProgress,
} from '@/lib/vocabulary/storage'
import { createEmptyWordProgress } from '@/lib/vocabulary/srs'
import {
  lemmaKeyFromEn,
  recordFeedFail,
  recordLiveLemmaUse,
  recordTranslationLemmaUse,
  utteranceHasLemma,
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
 * Translation: крепит in_feed, не mastered.
 * Call/communication success: Умею только если лемма в userText (без текста — пакет не мастерится).
 * Fail: returned + inbox; снимает пометку know (Пропускаю).
 */
export function applyFocusLemmasOutcome(params: {
  lemmas: FocusLemmaRef[]
  outcome: 'success' | 'fail'
  userText?: string | null
  source?: 'translation' | 'call' | 'communication'
}): void {
  if (params.lemmas.length === 0) return
  const source = params.source ?? 'translation'

  try {
    let state = loadVocabularyProgress()
    for (const lemma of params.lemmas) {
      const wordId = resolveWordId(lemma, state.words)
      const key = lemmaKeyFromEn(lemma.en)

      if (typeof wordId === 'number') {
        const current = state.words[String(wordId)] ?? createEmptyWordProgress(wordId)
        const withKey = { ...current, lemmaKey: current.lemmaKey ?? key }

        if (params.outcome === 'success') {
          if (source === 'translation') {
            state = patchWordProgress(state, wordId, recordTranslationLemmaUse(withKey))
          } else if (params.userText && utteranceHasLemma(params.userText, lemma.en)) {
            state = patchWordProgress(state, wordId, recordLiveLemmaUse(withKey, params.userText, lemma.en))
          }
        } else {
          const liveMiss =
            source === 'translation' ||
            Boolean(params.userText && extractLemmaMistake({ userText: params.userText, focusEn: lemma.en }))
          if (liveMiss) {
            state = patchWordProgress(state, wordId, recordFeedFail(withKey))
          }
        }
      }

      if (params.outcome === 'fail') {
        const extracted = params.userText
          ? extractLemmaMistake({ userText: params.userText, focusEn: lemma.en })
          : source === 'translation'
            ? { en: lemma.en }
            : null
        if (extracted) {
          appendVocabMistake({
            en: extracted.en,
            ru: lemma.ru,
            source: source === 'call' ? 'call' : 'translation',
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
