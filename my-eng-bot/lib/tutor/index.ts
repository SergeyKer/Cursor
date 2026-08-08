export type {
  TutorAnswerKind,
  TutorAudience,
  TutorCheatsheetChipVisibility,
  TutorComposerChip,
  TutorCuriosityEntry,
  TutorCardSource,
  TutorCardViewModel,
  TutorExplainAnswer,
  TutorExplainResult,
  TutorExplainScope,
  TutorMicroItem,
  TutorMicroItemKind,
  TutorMicroPack,
  TutorMicroScoreBand,
  TutorTopicAnchor,
  TutorTopicContext,
  TutorTopicContextTurn,
  TutorTriageKind,
  TutorTriageResult,
} from '@/lib/tutor/types'
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
  TUTOR_MICRO_MID_MIN,
  TUTOR_MICRO_MIN_ITEMS,
  TUTOR_MICRO_MIN_OPTIONS,
  TUTOR_MICRO_STRONG_MIN,
  TUTOR_TOPIC_CONTEXT_MAX_TURNS,
  TUTOR_TRIAGE_MAX_CHIPS,
} from '@/lib/tutor/types'
export {
  cheatsheetVisibilityForAnswerKind,
  isPrimaryCheatsheetAnswerKind,
} from '@/lib/tutor/cheatsheetEligibility'
export { normalizeTutorTriage, chipsFromLabels } from '@/lib/tutor/normalizeTriage'
export { normalizeTutorExplain, normalizeTutorExplainResult } from '@/lib/tutor/normalizeExplain'
export type { NormalizeTutorExplainOptions } from '@/lib/tutor/normalizeExplain'
export { normalizeTutorMicroPack } from '@/lib/tutor/normalizeMicro'
export { normalizeTutorCuriosityEntry } from '@/lib/tutor/normalizeCuriosity'
export { buildOpenTutorAction, normalizeTutorCardViewModel } from '@/lib/tutor/tutorCardStub'
export { localTutorTriage, resolvePendingTriageFollowUp } from '@/lib/tutor/localTriage'
export type { PendingTriageFollowUp } from '@/lib/tutor/localTriage'
export { matchTutorGate } from '@/lib/tutor/tutorGate'
export type { TutorGateMatch, TutorGateReason } from '@/lib/tutor/tutorGate'
export { routeTutorTurn, isPendingAngleReply } from '@/lib/tutor/tutorTurnRouter'
export type { TutorTurnRoute } from '@/lib/tutor/tutorTurnRouter'
export {
  hasExplicitTutorIntent,
  hasExplicitTopicSwitch,
  hasTutorTopicMarker,
  isTutorNoise,
  isShortAsciiToken,
  normalizeTutorQuery,
} from '@/lib/tutor/tutorIntent'
export { normalizeTutorSchoolPhoto, buildTutorSchoolPhotoPrompt } from '@/lib/tutor/normalizeSchoolPhoto'
export type { TutorSchoolPhotoResult, TutorSchoolPhotoRejectReason } from '@/lib/tutor/normalizeSchoolPhoto'
export { bandFromMicroScore, tutorMicroScoreRatio } from '@/lib/tutor/microScore'
export { buildTutorTopicContext } from '@/lib/tutor/buildTopicContext'
export {
  buildTutorFollowUpPlaceholder,
  buildTutorFollowUpChip,
  compressSiblingToFollowUpHint,
  resolveFollowUpTopicKey,
  stripFollowUpPlaceholderPrefix,
  TUTOR_FOLLOW_UP_PLACEHOLDER_MAX,
  TUTOR_FOLLOW_UP_CHIP_MAX,
} from '@/lib/tutor/buildFollowUpPlaceholder'
export type {
  BuildTutorFollowUpPlaceholderParams,
  BuildTutorFollowUpChipParams,
} from '@/lib/tutor/buildFollowUpPlaceholder'
export { alignExplainTopicToFaq } from '@/lib/tutor/alignExplainTopicToFaq'
export type { AlignExplainTopicToFaqParams } from '@/lib/tutor/alignExplainTopicToFaq'
export {
  followUpLegacyFlags,
  initialFollowUpHopState,
  nextFollowUpHopState,
  resolveFollowUpHopFromSnapshot,
  visibleFollowUpHop,
} from '@/lib/tutor/followUpHop'
export type {
  FollowUpHop,
  FollowUpHopEvent,
  FollowUpHopState,
} from '@/lib/tutor/followUpHop'
export { buildTutorMicroPackFromExplain, inferContrastCorrectIndex } from '@/lib/tutor/buildMicroPack'
export {
  buildAgeChoiceItems,
  buildPhraseContrastChoiceItems,
  isPhraseContrastPair,
  matchAgeBeExample,
} from '@/lib/tutor/buildMicroChoiceItems'
export {
  canOfferTutorMicro,
  isJunkMicroPrompt,
  isMicroAnswerKindEligible,
  isTutorMicroPackEligible,
} from '@/lib/tutor/microEligible'
export {
  isWeakContinueAnswerKind,
  resolveContinueLastExplain,
  shouldRetainLastExplainOnDeepen,
} from '@/lib/tutor/resolveContinueLastExplain'
export { resolveTutorMicroPack } from '@/lib/tutor/resolveMicroPack'
export type { ResolveTutorMicroResult } from '@/lib/tutor/resolveMicroPack'
export { buildTutorMicroSystemPrompt, buildTutorMicroUserPrompt } from '@/lib/tutor/microPrompt'


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
export { needsTutorMicroSessionExitGuard } from '@/lib/tutor/needsTutorMicroSessionExitGuard'
export type { TutorMicroSessionExitPhase } from '@/lib/tutor/needsTutorMicroSessionExitGuard'
