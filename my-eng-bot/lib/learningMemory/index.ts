export type {
  AttentionZone,
  LearningDetector,
  LearningSignal,
  LearningSource,
  SkillMasterySlice,
  SkillRecommendation,
} from '@/lib/learningMemory/types'
export {
  ATTENTION_WINDOW_MS,
  LEARNING_SIGNALS_KEY,
  MAX_ATTENTION_ZONES,
  MAX_LEARNING_SIGNALS,
  RESOLVE_COOLDOWN_MS,
  SKILL_MASTERY_KEY,
} from '@/lib/learningMemory/types'
export { mapLearningSource } from '@/lib/learningMemory/mapSource'
export { hashUtterance } from '@/lib/learningMemory/hash'
export { shouldSaveLanguageNoteSignal } from '@/lib/learningMemory/filter'
export {
  clearLearningSignals,
  clearSkillMasteryMap,
  clearSkillResolved,
  listLearningSignals,
  loadSkillMasteryMap,
  markSkillsResolved,
  saveLearningSignal,
  saveSkillMasteryMap,
} from '@/lib/learningMemory/storage'
export {
  getLearningMemoryStoragePort,
  resetLearningMemoryStoragePort,
  setLearningMemoryStoragePort,
  type LearningMemoryStoragePort,
} from '@/lib/learningMemory/port'
export {
  buildSkillMasteryFromSignals,
  detectModeGap,
  getAttentionZones,
  scoreSkill,
} from '@/lib/learningMemory/aggregate'
export { resolveRecommendation } from '@/lib/learningMemory/resolveRecommendation'
export {
  recordAssistantTurnLearningSignal,
  recordDialogueWrongSignal,
  recordLanguageNoteSignal,
  recordLessonOrPracticeResolved,
  recordPracticeWrongSignal,
  recordSilentAssessSignal,
  recordTeacherCorrectionSignal,
  recordTranslationErrorSignal,
} from '@/lib/learningMemory/record'
export { extractTranslationErrorBlocks } from '@/lib/learningMemory/translationErrors'
export { extractTeacherCorrection } from '@/lib/learningMemory/teacherCorrection'
export { isLearningMemoryDebugEnabled } from '@/lib/learningMemory/debug'
export {
  abortSilentAssessInFlight,
  requestSilentLanguageNote,
  scheduleSilentAssess,
  SILENT_ASSESS_TIMEOUT_MS,
} from '@/lib/learningMemory/silentAssess'
