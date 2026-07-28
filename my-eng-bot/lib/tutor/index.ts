export type { TutorAnswerKind, TutorAudience, TutorCheatsheetChipVisibility, TutorComposerChip, TutorCuriosityEntry, TutorCardSource, TutorCardViewModel, TutorExplainAnswer, TutorMicroItem, TutorMicroItemKind, TutorMicroPack, TutorTopicAnchor, TutorTriageKind, TutorTriageResult } from '@/lib/tutor/types'
export {
  TUTOR_EXPLAIN_ADULT_MAX_EXAMPLES,
  TUTOR_EXPLAIN_ADULT_MAX_PARAGRAPHS,
  TUTOR_EXPLAIN_ADULT_MIN_PARAGRAPHS,
  TUTOR_EXPLAIN_CHILD_MAX_EXAMPLES,
  TUTOR_EXPLAIN_CHILD_MAX_PARAGRAPHS,
  TUTOR_EXPLAIN_CHILD_MIN_EXAMPLES,
  TUTOR_EXPLAIN_CHILD_MIN_PARAGRAPHS,
  TUTOR_MICRO_MAX_ITEMS,
  TUTOR_MICRO_MAX_OPTIONS,
  TUTOR_MICRO_MIN_ITEMS,
  TUTOR_MICRO_MIN_OPTIONS,
  TUTOR_TRIAGE_MAX_CHIPS,
} from '@/lib/tutor/types'
export {
  cheatsheetVisibilityForAnswerKind,
  isPrimaryCheatsheetAnswerKind,
} from '@/lib/tutor/cheatsheetEligibility'
export { normalizeTutorTriage, chipsFromLabels } from '@/lib/tutor/normalizeTriage'
export { normalizeTutorExplain } from '@/lib/tutor/normalizeExplain'
export type { NormalizeTutorExplainOptions } from '@/lib/tutor/normalizeExplain'
export { normalizeTutorMicroPack } from '@/lib/tutor/normalizeMicro'
export { normalizeTutorCuriosityEntry } from '@/lib/tutor/normalizeCuriosity'
export { buildOpenTutorAction, normalizeTutorCardViewModel } from '@/lib/tutor/tutorCardStub'
export { localTutorTriage } from '@/lib/tutor/localTriage'
export { normalizeTutorSchoolPhoto, buildTutorSchoolPhotoPrompt } from '@/lib/tutor/normalizeSchoolPhoto'
export type { TutorSchoolPhotoResult, TutorSchoolPhotoRejectReason } from '@/lib/tutor/normalizeSchoolPhoto'

export {
  CHAT_INLINE_SPEAKER_BUTTON_CLASS,
  TUTOR_PAPERCLIP_BUTTON_CLASS,
} from '@/lib/tutor/composerContracts'
export {
  stashTutorReturnContext,
  peekTutorReturnContext,
  consumeTutorReturnContext,
  clearTutorReturnContext,
} from '@/lib/tutor/tutorReturnContext'
export type { TutorReturnContextSnapshot } from '@/lib/tutor/tutorReturnContext'
export {
  recordTutorCuriosity,
  listTutorCuriosity,
  clearTutorCuriosityForTests,
} from '@/lib/tutor/curiosityStore'
