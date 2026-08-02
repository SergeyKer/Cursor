import type { TutorAnswerKind, TutorCheatsheetChipVisibility } from '@/lib/tutor/types'

/** Wave0: grammar/contrast/form → primary; how_to_say/orthography/translate/other → hidden. */
export function cheatsheetVisibilityForAnswerKind(
  kind: TutorAnswerKind
): TutorCheatsheetChipVisibility {
  if (kind === 'grammar' || kind === 'contrast' || kind === 'form') return 'primary'
  return 'hidden'
}

export function isPrimaryCheatsheetAnswerKind(kind: TutorAnswerKind): boolean {
  return cheatsheetVisibilityForAnswerKind(kind) === 'primary'
}
