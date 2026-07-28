import type { TutorAnswerKind, TutorCheatsheetChipVisibility } from '@/lib/tutor/types'

/** Plan: grammar/contrast/form → primary; translate → hidden; how_to_say/orthography → secondary. */
export function cheatsheetVisibilityForAnswerKind(
  kind: TutorAnswerKind
): TutorCheatsheetChipVisibility {
  if (kind === 'grammar' || kind === 'contrast' || kind === 'form') return 'primary'
  if (kind === 'how_to_say' || kind === 'orthography') return 'secondary'
  return 'hidden'
}

export function isPrimaryCheatsheetAnswerKind(kind: TutorAnswerKind): boolean {
  return cheatsheetVisibilityForAnswerKind(kind) === 'primary'
}
