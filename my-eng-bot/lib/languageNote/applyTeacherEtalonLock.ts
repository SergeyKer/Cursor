import {
  equalsIgnoringPunctuation,
  sanitizeChangedHighlights,
} from '@/lib/languageNote/parseLanguageNoteResponse'
import type { LanguageNote } from '@/lib/languageNote/types'

/**
 * Hard-lock language-note `correct` to teacher Say/Скажи etalon.
 * No-op when etalon is missing — free-call path unchanged.
 */
export function applyTeacherEtalonLock(
  note: LanguageNote,
  expectedEnglish: string | null | undefined
): LanguageNote {
  const etalon = typeof expectedEnglish === 'string' ? expectedEnglish.trim() : ''
  if (!etalon) return note

  const original = note.original
  const sameAsEtalon = equalsIgnoringPunctuation(original, etalon)
  const correctReasons = note.correctReasons.slice(0, 3)

  return {
    ...note,
    status: sameAsEtalon ? 'already_good' : 'needs_fix',
    correct: etalon,
    correctHighlights: sanitizeChangedHighlights({
      previous: original,
      next: etalon,
      highlights: note.correctHighlights,
      reasons: correctReasons,
    }),
    correctReasons: sameAsEtalon ? correctReasons.slice(0, 1) : correctReasons,
    better: null,
    betterHighlights: [],
    betterReasons: [],
    betterAlternatives: [],
    teacherEtalon: true,
  }
}
