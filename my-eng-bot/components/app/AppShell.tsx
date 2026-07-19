'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiChatPanel } from '@/lib/aiChatPanel'
import { getHomeMenuInstruction } from '@/lib/homeMenuInstruction'
import { featureFlags } from '@/lib/featureFlags'
import {
  clearOpenLessonIntent,
  consumeOpenLessonIntent,
  peekOpenLessonIntent,
  writeEntryContext,
} from '@/lib/quickTest/openLessonIntent'
import { QUICK_TEST_COPY } from '@/lib/uiCopy/quickTest'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import HomeEmptyBubble from '@/components/HomeEmptyBubble'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
import { HomeMenuInstructionBubble } from '@/components/HomeMenuInstructionBubble'
import { AppIconFrame } from '@/components/AppIconFrame'
import type {
  LessonMenuContext,
  LessonsPanel,
  LearningLessonMenuMeta,
  MenuView,
} from '@/components/branches/HubBranch'
import { useAppColumnBounds } from '@/hooks/useAppColumnBounds'
import { buildCompactGreeting } from '@/lib/homeGreeting'
import { consumeNextGreetingFactLine } from '@/lib/greetingFactRotation'
import { consumeNextHomeVoiceLine } from '@/lib/homeVoiceRotation'
import {
  loadState,
  saveState,
  getUsageCountToday,
  incrementUsageToday,
  DEFAULT_SETTINGS,
  loadFreeTalkTopicRotationState,
  normalizeOpenAiChatPreset,
  saveFreeTalkTopicRotationState,
} from '@/lib/storage'
import {
  appendFooterRewardSnapshot,
  createDefaultRewardsState,
  createFooterSsrPlaceholderRewardsState,
  loadRewardsState,
  reconcileModeGoalSessions,
  saveRewardsState,
  formatGlobalFooterStats,
  formatModeGoalFooter,
  type RewardsState,
  spendCoins,
  awardCoins,
  withDailyActivity,
  isLessonGoldCoinClaimed,
} from '@/lib/rewardsState'
import { applyRewardsEvent } from '@/lib/rewardsEvents'
import { resolveLessonCoinAward, type LessonCoinAward } from '@/lib/coinAwards'
import type { LessonCoinIntroContext } from '@/lib/lessonCoinIntroCopy'
import { COIN_ERROR_FORGIVENESS_COST, canSpendCoinsForForgiveness } from '@/lib/lessonCoinForgiveness'
import { getLessonCoinForgivenessCopy } from '@/lib/lessonCoinForgivenessCopy'
import {
  APP_SHELL_ERROR_COPY,
  APP_SHELL_HOME_COPY,
  getMenuGenerationFallbackMessage,
} from '@/lib/uiCopy/appShellCopy'
import {
  buildRewardPopupText,
  rewardReasonAllowsDynamicTickerOverride,
  rewardReasonShowsToast,
} from '@/lib/rewardsUiPolicy'
import { formatRewardTopLine, getSessionTransitionTopLine } from '@/lib/footerTopLinePhrases'
import {
  formatStreakFooterApplied,
  formatStreakFooterPreview,
  resolveStreakFooterOverlayLine,
} from '@/lib/streakFooterHint'
import { formatStreakHomeBannerText, shouldShowStreakHomeBanner } from '@/lib/streakHomeBanner'
import { formatStreakSessionHint } from '@/lib/streakSessionHint'
import { countDialogueFinalCorrectAnswers } from '@/lib/dialogueStats'
import { TOPICS, LEVELS, TENSES } from '@/lib/constants'
import { allowedTensesForAudience } from '@/lib/levelAllowedTenses'
import { detectCommunicationUserMessageLang, getExpectedCommunicationReplyLang } from '@/lib/communicationReplyLanguage'
import { detectTextLang } from '@/lib/detectTextLang'
import { extractExplicitTranslateTarget } from '@/lib/communicationMode'
import { pickFreeTalkTopicSuggestions } from '@/lib/freeTalkTopicSuggestions'
import {
  shouldRequestAllOpenAiWebSearchSources,
  shouldRequestOpenAiWebSearchSources,
} from '@/lib/openAiWebSearchShared'
import { predictWillFetchFromInternet } from '@/lib/predictCommunicationInternetFetch'
import type {
  AppMode,
  Audience,
  ChatMessage,
  CommunicationVoiceInputMode,
  SentenceType,
  Settings,
  TenseId,
  TopicId,
  UsageInfo,
} from '@/lib/types'
import {
  PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS,
  PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS,
  PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS,
  PAGE_HOME_START_PRIMARY_BUTTON_CLASS,
} from '@/lib/homeCtaStyles'
import { parseCorrection } from '@/lib/parseCorrection'
import { stripTranslationCanonicalRepeatRefLine } from '@/lib/translationPromptAndRef'
import {
  buildLessonFooterLive,
  formatLessonCompletionFooter,
  resolveLessonCardMedal,
  resolveLessonHeaderMedal,
} from '@/lib/lessonFooter'
import { buildLessonPageTitle, getAppHeaderTitleMaxWidthClass } from '@/lib/lessonPageTitle'
import MedalBadge from '@/components/MedalBadge'
import { resolveLessonFooterTopLine } from '@/lib/lessonFooterTopLine'
import { resolveGlobalLessonXpDelta } from '@/lib/lessonGlobalXpAward'
import {
  buildLessonReturnBriefingRunKey,
  resolveLessonReturnBriefing,
} from '@/lib/resolveLessonReturnBriefing'
import {
  formatLessonHeaderProgressAriaLabel,
  formatLessonHeaderProgressLabel,
} from '@/lib/lessonHeaderProgress'
import {
  beginLessonCycle1,
  capLessonMedalForRun,
  closeLessonCycle1,
  isLocalStructuredLessonRun,
  shouldCapGoldToSilver,
} from '@/lib/lessonAntiFarm'
import { buildLessonMedalRevealCopy } from '@/lib/lessonMedalRevealCopy'
import { computeCorePercent, resolveMedalFromCoreXp, type LessonMedalTierOrNull } from '@/lib/lessonScore'
import { getLessonBadgeDefinition, resolveLessonBadgeProgress } from '@/lib/lessonBadges'
import { mergeLessonProgressOnComplete, migrateUserLessonProgress } from '@/lib/lessonProgressMigration'
import { loadLessonProgress, loadLessonProgressMap, saveLessonProgress } from '@/lib/lessonProgressStorage'
import {
  listLearningSignals,
  recordAssistantTurnLearningSignal,
  recordLanguageNoteSignal,
  recordLessonOrPracticeResolved,
  recordTeacherCorrectionSignal,
  scheduleSilentAssess,
  extractTeacherCorrection,
} from '@/lib/learningMemory'
import { hasAnyLearningHistory, resolveReturningHomeMenuView, shouldOpenMyPlanHome } from '@/lib/myPlan/returningHome'
import {
  findStaticLessonByTopic,
  getLearningLessonActions,
  getLearningLessonById,
  getLearningLessonFollowupPlaceholder,
  registerRuntimeLearningLesson,
  type LearningLessonActionId,
} from '@/lib/learningLessons'
import { getStructuredLessonById, loadLessonById } from '@/lib/structuredLessons'
import {
  catalogLevelToLevelId,
  getLessonTopicById,
  getPracticeLessonById,
  pickQuickStartPracticeTopic,
} from '@/lib/lessonCatalog'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import { buildTutorStructuredLesson } from '@/lib/tutorStructuredLesson'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { LessonData, PostLessonAction } from '@/types/lesson'
import type {
  PracticeBuildConfig,
  PracticeEntrySource,
  PracticeExerciseType,
  PracticeMode,
  PracticeQuestion,
  PracticeSession,
  PracticeSource,
} from '@/types/practice'
import AppFooter from '@/components/AppFooter'
import FooterDetailSheet, { type FooterDetailSheetHandle } from '@/components/FooterDetailSheet'
import RewardPopup from '@/components/RewardPopup'
import type { LessonIntroDepth } from '@/components/branches/LessonBranch'
import type {
  LessonExtraTipsFooterStatus,
  LessonExtraTipsSavedState,
} from '@/components/branches/LessonBranch'
import { resolveLessonIntroBlocks } from '@/lib/lessonIntroBlocks'
import CenterMessageOverlay from '@/components/CenterMessageOverlay'
import { useLessonEngine } from '@/hooks/useLessonEngine'
import { useLessonPrepareProgress } from '@/hooks/useLessonPrepareProgress'
import { usePracticeSession } from '@/hooks/usePracticeSession'
import type { AccentFooterView } from '@/components/branches/AccentBranch'
import { getPracticeFooterView } from '@/lib/practice/practiceFooter'
import { isPracticeWrongLimitAdvance } from '@/lib/practice/practiceFooterCopy'
import type { PracticeChoiceCorrectionPhase } from '@/lib/practice/practiceChoiceCorrectionPhase'
import { buildPracticeFooterLive, mapPracticeFlowToFooterState } from '@/lib/practice/practiceFooterLive'
import { resolvePracticeCompletion } from '@/lib/practice/resolvePracticeCompletion'
import { resolveCanEarnRingToday } from '@/lib/practice/resolvePostPracticeActions'
import { pickBestPracticeRewardOpportunity } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import { buildPracticeFinaleChatSeed } from '@/lib/uiCopy/practiceCopy'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeRewardUi } from '@/lib/practice/practiceRewardUi'
import { claimPracticeEntryRewards } from '@/lib/practice/practiceEntryRewards'
import { spendAndApplyPracticeForgiveness } from '@/lib/practice/practiceCoinForgiveness'
import { getPracticeCoinForgivenessCopy } from '@/lib/practice/practiceCoinForgivenessCopy'
import { getPracticeEconomyDayKey } from '@/lib/practice/practiceEconomyRules'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { countWrongChoiceLikeBefore } from '@/lib/practice/engine/stepSpec'
import { resolvePracticeTargetQuestionCount } from '@/lib/practice/practiceSessionProgress'
import { buildSeenPracticeKeys } from '@/lib/practice/pickUniquePracticeQuestions'
import {
  buildPracticeGenerateDedupPayload,
  buildPracticeGenerateInitialDedupPayload,
} from '@/lib/practice/buildPracticeGenerateClientPayload'
import { buildActivePracticeMenuSnapshot } from '@/lib/practice/buildActivePracticeMenuSnapshot'
import {
  resolvePracticeQuestionsFromGenerateResponse,
  type PracticeGenerateApiResponse,
} from '@/lib/practice/practiceGenerateResponse'
import { resolveLocalReferencePracticeQuestions } from '@/lib/practice/resolveLocalReferencePracticeQuestions'
import { FOOTER_DYNAMIC_MAX_LENGTH, pickFooterVoice, type FooterVoiceCandidate } from '@/lib/footerVoice'
import {
  buildFooterSheetContext,
  buildLanguageNoteFooterSheetContext,
  shouldCloseFooterSheetOnRowPress,
  type FooterSheetContext,
  type FooterSheetSource,
} from '@/lib/footerSheet'
import { requestLanguageNote } from '@/lib/client/requestLanguageNote'
import { truncateLanguageNoteInput } from '@/lib/languageNote/eligibility'
import type { LanguageNote } from '@/lib/languageNote/types'
import { LANGUAGE_NOTE_COPY } from '@/lib/uiCopy/languageNote'
import type { AdaptiveFooterView } from '@/types/adaptiveRetention'
import { isIosChromeBrowser } from '@/lib/sttClient'
import { isIosSafariUserAgent, isIosWebKitBrowser } from '@/lib/iosSafariViewport'
import type { VocabularyFooterView } from '@/types/vocabulary'
import {
  buildEngvoInputAudioTranscriptionConfig,
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_PROVIDER,
  ENGVO_DEFAULT_VOICE,
  ENGVO_INACTIVITY_HANGUP_MS,
  ENGVO_MAX_CALL_DURATION_MS,
  ENGVO_REALTIME_MODEL,
  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_XAI_USER_COALESCE_WINDOW_MS,
  ENGVO_XAI_DEFAULT_VOICE,
  ENGVO_XAI_MODEL,
  ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE,
  clampEngvoRealtimeSpeed,
  engvoSpeechSpeedFromPreset,
  getEngvoDefaultSpeechSpeedPreset,
  type EngvoCefrLevel,
  type EngvoProvider,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
  type EngvoXaiCallVoice,
  type EngvoXaiVoiceRotationMode,
  ENGVO_CALL_FINISHED_ASSISTANT_TEXT,
  ENGVO_DIALING_ASSISTANT_TEXT,
} from '@/lib/engvo/constants'
import { formatEngvoVoiceDisplayName } from '@/lib/engvo/voiceDisplayName'
import {
  ensureBuiltInXaiVoiceForRotation,
  pickNextXaiVoice,
} from '@/lib/engvo/xaiVoiceRotation'
import type { EngvoRealtimeReplayItem } from '@/lib/engvo/realtimeReplay'
import {
  buildEngvoContinuationResponseInstructions,
  buildEngvoFirstTurnResponseInstructions,
  buildEngvoFreeCallLengthReclaimResponseInstructions,
  buildEngvoTeacherDrillReclaimResponseInstructions,
} from '@/lib/engvo/instructions'
import { isTooLongFreeCallAssistantTurn } from '@/lib/engvo/freeCallTurnCompleteness'
import { isIncompleteTeacherAssistantTurn } from '@/lib/engvo/teacherDrillCompleteness'
import {
  resolveTeacherDetectPhase,
  shouldAllowTeacherDrillReclaim,
} from '@/lib/engvo/teacherHandoffReclaim'
import { extractTeacherCallRepeatPrompt } from '@/lib/engvo/teacherRepeatAntiLoop'
import { buildEngvoRealtimeInstructionsClient } from '@/lib/engvo/instructionsClient'
import {
  ENGVO_XAI_WS_USER_MESSAGE,
  normalizeEngvoRealtimeUserMessage,
} from '@/lib/engvo/errors'
import {
  insertEngvoUserMessage,
  shouldCancelEngvoAssistantOnUserAudioCommitted,
  shouldInsertEngvoUserBeforeAssistant,
  updateLastEngvoUserMessage,
} from '@/lib/engvo/callMessageOrder'
import { isPartialUserTranscriptStatus } from '@/lib/engvo/userTranscriptStatus'
import { shouldCoalesceEngvoUserTranscript } from '@/lib/engvo/userTranscriptCoalesce'
import {
  buildEngvoClientSessionUpdate,
  buildEngvoXaiClientSessionUpdate,
} from '@/lib/engvo/realtimeSession'
import {
  buildEngvoSessionBootstrapSnapshot,
  isEngvoSessionBootstrapRedundantUpdate,
  type EngvoSessionBootstrapSnapshot,
} from '@/lib/engvo/sessionBootstrap'
import {
  createEngvoDebugTimingState,
  isEngvoFirstAudioDeltaEvent,
  logEngvoDebugFirstAudioDelta,
  logEngvoDebugTimingEvent,
  markEngvoDebugTimingOrigin,
  recordEngvoDebugSessionUpdate,
  resetEngvoDebugTimingState,
} from '@/lib/engvo/debugTiming'
import {
  connectEngvoXaiRealtime,
  getEngvoStopPlaybackEvents,
  type EngvoXaiTransport,
} from '@/lib/engvo/xaiRealtimeTransport'
import { resolveEngvoXaiTransportMode, type EngvoXaiTransportMode } from '@/lib/engvo/xaiTransportMode'
import { primeEngvoVoiceMeterAudio } from '@/components/EngvoVoiceMeter'
import {
  loadEngvoCefrLevel,
  loadEngvoProvider,
  loadEngvoRealtimeVoice,
  loadEngvoSessionKind,
  loadEngvoSpeechSpeedPreset,
  loadEngvoTeacherSentenceType,
  loadEngvoTeacherTense,
  loadEngvoXaiVoice,
  loadEngvoXaiVoiceRotationMode,
  loadEngvoXaiVoiceShuffleRemaining,
  resolveEngvoSpeechSpeedPreset,
  saveEngvoCefrLevel,
  saveEngvoProvider,
  saveEngvoRealtimeVoice,
  saveEngvoSessionKind,
  saveEngvoSpeechSpeedPreset,
  saveEngvoTeacherSentenceType,
  saveEngvoTeacherTense,
  saveEngvoXaiVoice,
  saveEngvoXaiVoiceRotationMode,
  saveEngvoXaiVoiceShuffleRemaining,
  clearEngvoXaiVoiceShuffleRemaining,
} from '@/lib/engvo/preferences'
import {
  ENGVO_DEFAULT_SESSION_KIND,
  ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE,
  ENGVO_DEFAULT_TEACHER_TENSE,
  resolveEngvoTeacherPhase,
  sanitizeEngvoTeacherTenseForAudience,
  type EngvoTeacherPhase,
  type EngvoVoiceSessionKind,
} from '@/lib/engvo/sessionKind'
import {
  loadPracticeTtsSpeedDefaultIndex,
  savePracticeTtsSpeedDefaultIndex,
} from '@/lib/practice/practiceTtsPreferences'
import {
  applyChatPatternState,
  getDefaultChatPatternTuning,
  loadChatPatternTuningMap,
  normalizeChatPatternTuning,
  resolveChatPatternTuning,
  saveChatPatternTuningMap,
  type ChatPatternTuning,
  type ChatPatternTuningMap,
  type TunableChatPatternId,
} from '@/lib/chatPatternTuning'
import {
  loadChatPattern,
  saveChatPattern,
  type ChatPatternId,
} from '@/lib/chatPattern'
import { getPracticeTtsRateByIndex } from '@/lib/practice/practiceTtsSpeedPresets'
import { requestPhraseTranslation } from '@/lib/client/requestPhraseTranslation'
import {
  canCommitEngvoAssistantMessage,
  getEngvoBootstrapServiceIndicatorText,
  getEngvoFooterView,
  hasEngvoAssistantChatBubble,
  hasEngvoDialingServiceLineInThread,
  type EngvoCallPhase,
} from '@/lib/engvo/state'
import { shouldAutoRequestFirstChatMessage } from '@/lib/engvo/guards'
import {
  cancelEngvoPendingInterrupt,
  createEngvoInterruptDebounceState,
  hasActiveEngvoAssistantResponse,
  markEngvoInterruptCommitted,
  markEngvoInterruptDebouncePending,
  resetEngvoInterruptDebounceState,
  shouldDebounceEngvoBargeIn,
  shouldIgnoreNoiseTranscriptDuringAssistantSpeech,
} from '@/lib/engvo/interruptDebounce'
import {
  engvoVoiceTranscriptIsLikelyNoise,
  engvoVoiceTranscriptIsLikelyNoiseForKind,
  shouldShowEngvoVoiceUserTranscript,
} from '@/lib/engvo/transcriptGuard'
import {
  buildEngvoTeacherKeyterms,
  getEngvoXaiInterruptDebounceMs,
} from '@/lib/engvo/xaiListenPolicy'
import { consumeNextEngvoWelcomeMessage, consumeNextEngvoTeacherWelcomeMessage } from '@/lib/engvo/welcomeMessageRotation'
import { applyCefrOutputGuardClient } from '@/lib/cefr/levelGuardClient'
import {
  extractRealtimeTextFromResponseDone,
  isEngvoOutputAudioTranscriptDeltaEvent,
  isEngvoOutputAudioTranscriptDoneEvent,
  resolveEngvoRealtimeResponseId,
} from '@/lib/engvo/realtimeAssistantText'
import {
  createRealtimeTranscriptState,
  getRealtimeTranscriptView,
  reduceRealtimeTranscriptEvent,
  type RealtimeTranscriptState,
} from '@/lib/realtimeStt'

import {
  LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT,
  fetchWithLessonProviderDeadline,
  lessonMenuGenerateClientTimeoutMs,
} from '@/lib/lessonProviderTimeouts'
import {
  AccentTrainer,
  Chat,
  LessonBriefingScreen,
  LessonExtraTipsScreen,
  LessonIntroScreen,
  LessonStepRenderer,
  ReferenceSheetScreen,
  MenuSectionPanels,
  PracticeScreen,
  VocabularyByLevelScreen,
  VocabularyWorldsScreen,
} from '@/lib/start/appBranchComponents'
import { shouldFinalizeTutorLessonOpen } from '@/lib/lessons/tutorLessonInflight'
import { buildReferenceSheetByLessonId } from '@/lib/reference/buildReferenceSheet'
import {
  consumeOpenReferenceLessonId,
  readReferenceLessonIdFromSearch,
} from '@/lib/reference/openReferenceIntent'

import SlideOutMenu from '@/components/SlideOutMenu'
type StructuredLessonRuntimeMode = 'generate' | 'repeat'
type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'
type PracticeOpenRequest = {
  lessonId?: string
  mode: PracticeMode
  entrySource: PracticeEntrySource
  customTopic?: string
  referenceExerciseType?: PracticeExerciseType
}
type PracticeGenerateResponse = PracticeGenerateApiResponse
type PracticeTopicResolutionResponse = {
  resolved?: boolean
  primaryTopic?: string
  suggestions?: string[]
  catalogLessonIds?: string[]
  intentOptions?: TutorLearningIntent[]
  error?: string
}
type LessonRepeatResponse = {
  lesson?: LessonData
  generated?: boolean
  fallback?: boolean
  fallbackReason?: LessonRepeatFallbackReason
  error?: string
}

function buildPracticeGenerateAdaptiveContext(session: PracticeSession): { choiceLikeWrongCountBefore?: number } {
  if (session.mode !== 'challenge') return {}
  return { choiceLikeWrongCountBefore: countWrongChoiceLikeBefore(session, 10) }
}

const PRACTICE_AI_INITIAL_BATCH_SIZE = 2
const PRACTICE_PREFETCH_BUFFER_TARGET = 1
const PRACTICE_PREFETCH_TIMEOUT_MS = 12_000
const PRACTICE_GENERATE_NEXT_TIMEOUT_MS = 16_000
const PRACTICE_PREFETCH_UNIQUE_RETRIES = 1
const PRACTICE_GENERATE_NEXT_UNIQUE_RETRIES = 2

function cloneStructuredLessonWithRunKey(lesson: LessonData): LessonData {
  const cloned = typeof structuredClone === 'function' ? structuredClone(lesson) : JSON.parse(JSON.stringify(lesson))
  return {
    ...cloned,
    runKey: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
}

function withLessonGenerationMeta(
  lesson: LessonData,
  meta: { generated: boolean; fallback: boolean }
): LessonData {
  return {
    ...lesson,
    generated: meta.generated,
    fallback: meta.fallback,
  }
}

function isAiGeneratedLessonRuntime(lesson: LessonData | null | undefined): boolean {
  if (!lesson) return false
  if (lesson.fallback === true || lesson.generated === false) return false
  return lesson.generated === true
}

function cloneLessonData<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function appendLessonVariantHistory(history: string[], variantId: string): string[] {
  if (!variantId) return history
  if (history[history.length - 1] === variantId) return history.slice(-10)
  return [...history, variantId].slice(-10)
}

function buildTutorFallbackBlueprint(topic: string): LessonBlueprint {
  const safeTopic = topic.trim() || 'Выбранная тема'
  return {
    title: safeTopic,
    intro: buildFallbackLessonIntro(safeTopic),
    theoryIntro:
      `**Урок:** ${safeTopic}\n` +
      '**Правило:**\n' +
      '1) Сравниваем значения и контексты использования.\n' +
      '2) Закрепляем через короткие фразы и мини-ситуации.\n' +
      '**Примеры:**\n' +
      `1) I like this idea. I love this song.\n` +
      `2) We use "${safeTopic}" in different contexts.\n` +
      '**Коротко:** выберите правильный вариант по смыслу и повторите вслух.\n' +
      '**Шаблоны:**\n' +
      '1) I like ... / I love ...\n' +
      '2) I use ... when ...',
    actions: [
      { id: 'examples', label: 'Посмотри примеры' },
      { id: 'fill_phrase', label: 'Подставь слово' },
      { id: 'repeat_translate', label: 'Переведи на английский' },
      { id: 'write_own_sentence', label: 'Напиши своё предложение' },
    ],
    followups: {
      examples:
        '**Примеры:**\n' +
        '1) I like music, but I love jazz.\n' +
        '2) I like this movie. I love this actor.\n' +
        '3) I like mornings, but I love weekends.',
      fill_phrase:
        '**Подставь слово:**\n' +
        '1) I ____ this song. (like / love)\n' +
        '2) We ____ this place. (like / love)\n' +
        'Выберите вариант по смыслу.',
      repeat_translate:
        '**Переведи на английский:**\n' +
        '1) Мне нравится эта идея.\n' +
        '2) Я люблю эту песню.\n' +
        '3) Мы используем это в разном контексте.',
      write_own_sentence:
        '**Напиши своё предложение:**\n' +
        `Тема: ${safeTopic}\n` +
        'Напиши 3 коротких примера по шаблону.',
    },
  }
}

/** Снимок настроек при открытии меню (для перезапуска чата без смены режима). */
type MenuOpenSnapshot = {
  mode: AppMode
  audience: Audience
  topic?: TopicId
  tensesKey?: string
  sentenceType?: SentenceType
}

type LessonOverlayState = {
  title: string
  lines: string[]
}

function tensesToKey(tenses: TenseId[]): string {
  return [...tenses].sort().join(',')
}

function normalizeSingleTense(tenses: TenseId[], allowedTenses: TenseId[], fallback: TenseId): Settings['tenses'] {
  const allowedSet = new Set<TenseId>(allowedTenses)
  const picked = tenses.find((tense) => allowedSet.has(tense)) ?? fallback
  return [picked]
}

function buildMenuOpenSnapshot(s: Settings): MenuOpenSnapshot {
  if (s.mode === 'communication') {
    return { mode: s.mode, audience: s.audience }
  }
  return {
    mode: s.mode,
    audience: s.audience,
    topic: s.topic,
    tensesKey: tensesToKey(s.tenses),
    sentenceType: s.sentenceType,
  }
}

/** Режим не менялся; нужен ли перезапуск из‑за темы/времён/типа/аудитории (без уровня). */
function menuSettingsRestartNeeded(snap: MenuOpenSnapshot, current: Settings): boolean {
  if (current.mode === 'communication') {
    return snap.audience !== current.audience
  }
  if (current.mode === 'dialogue' || current.mode === 'translation') {
    return (
      snap.topic !== current.topic ||
      snap.tensesKey !== tensesToKey(current.tenses) ||
      snap.sentenceType !== current.sentenceType ||
      snap.audience !== current.audience
    )
  }
  return false
}

function getCommunicationVoiceInputMode(settings: Settings): CommunicationVoiceInputMode {
  const fallback: Exclude<CommunicationVoiceInputMode, 'mix'> =
    settings.communicationInputExpectedLang === 'ru' ? 'ru' : 'en'
  if (!featureFlags.communicationMixVoiceInputV1) return fallback
  const stored = settings.communicationVoiceInputMode
  return stored === 'ru' || stored === 'en' || stored === 'mix' ? stored : fallback
}

/** Перевод в диалоге: актуальный assistant-пузырь после await. */
function findAssistantIndexByTranslationText(
  messages: ChatMessage[],
  requestedIndex: number,
  textToTranslate: string
): number {
  const needle = textToTranslate.trim()
  if (!needle) return requestedIndex

  const bodyMatchesNeedle = (content: string) => {
    const { rest } = parseCorrection(content)
    const r = (rest ?? content).trim()
    if (!r) return false
    if (r.includes(needle)) return true
    if (needle.length >= 6 && r.includes(needle.slice(0, Math.min(needle.length, 120)))) return true
    return false
  }

  if (messages[requestedIndex]?.role === 'assistant' && bodyMatchesNeedle(messages[requestedIndex].content ?? '')) {
    return requestedIndex
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    if (bodyMatchesNeedle(m.content ?? '')) return i
  }
  return requestedIndex
}

function createDialogSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readPublicLessonProviderTimeoutMs(): number {
  const raw =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LESSON_PROVIDER_FETCH_TIMEOUT_MS?.trim() ?? '' : ''
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return Math.min(Math.max(n, 5000), 300_000)
  }
  return LESSON_PROVIDER_FETCH_TIMEOUT_MS_DEFAULT
}

const API_TIMEOUT_MS = 60_000
const ENGVO_SDP_FETCH_TIMEOUT_MS = 25_000
const ENGVO_CONNECTION_TIMEOUT_MS = 20_000
const ENGVO_SESSION_ACK_TIMEOUT_MS = 15_000
const ENGVO_RESPONSE_DONE_FALLBACK_MS = 1_200
/** Меню «Сгенерировать урок» → `/api/lesson-repeat` с bypassCache; клиентский бюджет: `lessonMenuGenerateClientTimeoutMs` (попытки из `resolveLessonRepeatMenuBypassMaxAttempts`, см. `lib/lessonProviderTimeouts.ts`). */
const LESSON_MENU_GENERATE_TIMEOUT_MS = lessonMenuGenerateClientTimeoutMs(readPublicLessonProviderTimeoutMs())
const TUTOR_LESSON_GENERATE_TIMEOUT_MS = LESSON_MENU_GENERATE_TIMEOUT_MS
const STRUCTURED_LESSON_RUNTIME_TIMEOUT_MS = lessonMenuGenerateClientTimeoutMs(
  readPublicLessonProviderTimeoutMs()
)

const PREFETCH_BRANCH_IDS: BranchId[] = ['hub', 'lesson', 'chat']
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500
/** При 429 OpenRouter даёт 20 запросов в минуту - пауза должна увести попытку в следующую минуту. */
const RETRY_DELAY_RATE_LIMIT_MS = 20_000
const RETRY_DELAY_RATE_LIMIT_BASE_MS = 5_000
const {
  retryMessages: RETRY_MESSAGES,
  errorFirstMessage: ERROR_FIRST_MESSAGE,
  emptyResponseFallback: EMPTY_RESPONSE_FALLBACK,
} = APP_SHELL_ERROR_COPY
function normalizeForEchoCompare(text: string): string {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '').replace(/\s+/g, ' ')
}

const ENGVO_CALL_HALLUCINATION_PHRASES = new Set(['you'])

function isLikelyEngvoCallHallucination(text: string): boolean {
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.!?…]+$/g, '')
  if (normalized.length >= 4) return false
  return ENGVO_CALL_HALLUCINATION_PHRASES.has(normalized)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Убирает из текста буквальные \n (модель иногда выводит их как символы). */
function cleanNewlines(text: string): string {
  return text.replace(/\\n/g, '\n').trim()
}

function stripHiddenAssistantPayloadLines(content: string): string {
  return stripTranslationCanonicalRepeatRefLine(content)
}

/** Выделяет из ответа ИИ основной текст.
 * Перевод от ИИ для диалога больше не используем (только по кнопке /api/translate),
 * поэтому здесь просто чистим служебные строки вроде `RU:` если модель всё же их вернула.
 */
function parseContentWithTranslation(raw: string): { content: string; translation?: string } {
  const s = raw.trim()
  // Удаляем любую строку, начинающуюся с RU:/Russian:/Перевод:, если модель всё же её вывела.
  const lines = s.split(/\r?\n/)
  const filtered = lines.filter(
    (line) => !/^\s*(RU|Russian|Перевод)\s*:?/i.test(line.trim())
  )
  return { content: cleanNewlines(filtered.join('\n')) }
}

type EngvoRealtimeEvent = {
  type?: string
  response_id?: string
  item_id?: string
  delta?: string
  text?: string
  transcript?: string
  response?: unknown
  error?: { message?: string }
} & Record<string, unknown>

/** Попап XP чуть позже ответа ИИ, чтобы не сливались по времени с появлением сообщения. */
const REWARD_POPUP_DELAY_AFTER_MESSAGE_MS = 550
const REWARD_POPUP_VISIBLE_MS = 3200

type StructuredLessonRunOrigin = 'menu_reopen' | 'menu_generate' | 'post_lesson_repeat' | 'repeat_api'

import { AppShellProvider } from '@/components/app/AppShellContext'
import type { StartBridgeState } from '@/lib/start/startBridge'
import { resolveActiveBranch } from '@/lib/start/activeBranch'
import type { BranchId } from '@/lib/start/branchRegistry'
import { prefetchBranch } from '@/lib/start/branchRegistry'
import { useBranchLoader, usePrefetchBranchesOnIdle } from '@/hooks/useBranchLoader'
import type { AppShellProps } from '@/components/app/AppShell.types'

export type { AppShellProps } from '@/components/app/AppShell.types'

export default function AppShell({ entryBridge = null, onRuntimeReady }: AppShellProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [rewardsState, setRewardsState] = useState<RewardsState>(createDefaultRewardsState)
  /** После useLayoutEffect storage - иначе hydration mismatch (localStorage только на клиенте). */
  const [footerHydrated, setFooterHydrated] = useState(false)
  const [rewardPopupText, setRewardPopupText] = useState<string | null>(null)
  const [lessonReturnBriefingAckRunKey, setLessonReturnBriefingAckRunKey] = useState<string | null>(null)
  const [lastStructuredLessonGlobalDelta, setLastStructuredLessonGlobalDelta] = useState(0)
  const [footerSessionContextNonce, setFooterSessionContextNonce] = useState(0)
  const [streakHintConsumedForMode, setStreakHintConsumedForMode] = useState<string | null>(null)
  const [footerTransitionText, setFooterTransitionText] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [footerSheetContext, setFooterSheetContext] = useState<FooterSheetContext | null>(null)
  const footerSheetRef = React.useRef<FooterDetailSheetHandle>(null)
  const languageNoteAbortRef = React.useRef<AbortController | null>(null)
  const languageNoteRequestIdRef = React.useRef(0)
  const [communicationVoiceDropdownOpen, setCommunicationVoiceDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [homeMenuView, setHomeMenuView] = useState<MenuView>('root')
  const [homeAiChatPanel, setHomeAiChatPanel] = useState<AiChatPanel>('summary')
  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)
  const { ensureBranchMounted, isBranchMounted } = useBranchLoader()
  usePrefetchBranchesOnIdle(PREFETCH_BRANCH_IDS)
  /** На стартовом экране при выходе из чата домой сбрасывается в false. */
  const [welcomeCompact, setWelcomeCompact] = useState(false)
  /** Смена «сессии» старта: новый факт и фраза футера (в т.ч. после выхода из чата домой). */
  const [greetingNonce, setGreetingNonce] = useState(0)
  const [welcomeFactLine, setWelcomeFactLine] = useState<string | null>(null)
  const [homeVoiceLine, setHomeVoiceLine] = useState<string | null>(null)
  /** Кэш на greetingNonce: без повторного consume при remount (React Strict Mode). */
  const welcomeFactByNonceRef = React.useRef<Map<number, string>>(new Map())
  const homeVoiceByNonceRef = React.useRef<Map<number, string>>(new Map())
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [loadingTranslationIndex, setLoadingTranslationIndex] = useState<number | null>(null)
  const [loadingEngvoCallTranslationIndex, setLoadingEngvoCallTranslationIndex] = useState<number | null>(null)
  const [engvoCallTranslationPrefetchText, setEngvoCallTranslationPrefetchText] = useState<string | null>(null)
  const [forceNextMicLang, setForceNextMicLang] = useState<'ru' | 'en' | null>(null)
  const [searchingInternet, setSearchingInternet] = useState(false)
  const [searchingInternetLang, setSearchingInternetLang] = useState<'ru' | 'en'>('ru')
  /** Увеличение сбрасывает поле ввода/голос (меню «Начать …»). */
  const [composerSessionKey, setComposerSessionKey] = useState(0)
  const [lessonMenuContext, setLessonMenuContext] = useState<LessonMenuContext | null>(null)
  /** Откуда запущен урок: боковое меню или встроенный блок на главной. */
  const lessonMenuLaunchSurfaceRef = React.useRef<'slide' | 'home'>('home')
  /** Session from My Plan: return to myPlan after exit. */
  const openedFromMyPlanRef = React.useRef(false)
  const markOpenedFromMyPlan = React.useCallback(() => {
    openedFromMyPlanRef.current = true
  }, [])
  /** Одноразовое восстановление панели уроков в боковом меню после «Назад». */
  const restoreLessonMenuOnNextOpenRef = React.useRef(false)
  /** Одноразовое восстановление встроенного меню уроков на главной после «Назад». */
  const [pendingHomeLessonMenuRestore, setPendingHomeLessonMenuRestore] = useState(false)
  const [activeLearningLessonId, setActiveLearningLessonId] = useState<string | null>(null)
  const [activeStructuredLessonRuntime, setActiveStructuredLessonRuntime] = useState<LessonData | null>(null)
  const [structuredLessonLoadingId, setStructuredLessonLoadingId] = useState<string | null>(null)
  /** Ошибка фоновой генерации варианта урока (меню «Сгенерировать урок»); урок уже открыт со статическим клоном. */
  const [menuLessonBgError, setMenuLessonBgError] = useState<string | null>(null)
  /** Фоновая генерация варианта structured-урока на intro/tips/briefing. */
  const [structuredLessonVariantRegenerating, setStructuredLessonVariantRegenerating] = useState(false)
  const variantGenerateLaunchRef = React.useRef<'menu' | 'briefing'>('menu')
  const [pendingTutorLessonTitle, setPendingTutorLessonTitle] = useState<string | null>(null)
  const [activeLessonVariantNumber, setActiveLessonVariantNumber] = useState(1)
  const structuredLessonRunOriginRef = React.useRef<StructuredLessonRunOrigin>('menu_reopen')
  /** Если у урока нет runKey, порядок вариантов fill_choice зависит от nonce на каждый новый вход. */
  const [structuredLessonShuffleNonce, setStructuredLessonShuffleNonce] = useState(0)
  const [postLessonBusy, setPostLessonBusy] = useState(false)
  const [selectedPostLessonAction, setSelectedPostLessonAction] = useState<PostLessonAction | null>(null)
  const [postLessonMenuResetKey, setPostLessonMenuResetKey] = useState(0)
  const [lessonOverlay, setLessonOverlay] = useState<LessonOverlayState | null>(null)
  const [coinForgivenessHelpOverlay, setCoinForgivenessHelpOverlay] = useState<LessonOverlayState | null>(
    null
  )
  const [lessonViewStage, setLessonViewStage] = useState<'intro' | 'tips' | 'briefing' | 'lesson' | 'reference'>('intro')
  const [lessonTipsReturnStage, setLessonTipsReturnStage] = useState<'intro' | 'lesson'>('intro')
  const [lessonIntroDepth, setLessonIntroDepth] = useState<LessonIntroDepth>('quick')
  /** Счётчик входа на intro: сбрасывает stagger без remount (key остаётся lessonId). */
  const [lessonIntroRevealSession, setLessonIntroRevealSession] = useState(0)
  const bumpLessonIntroRevealSession = useCallback(() => {
    setLessonIntroRevealSession((session) => session + 1)
  }, [])
  const [lessonExtraTipsStatus, setLessonExtraTipsStatus] = useState<LessonExtraTipsFooterStatus>('idle')
  const [lessonExtraTipsState, setLessonExtraTipsState] = useState<LessonExtraTipsSavedState | null>(null)
  const variantPrepareLabelProfile =
    lessonViewStage === 'briefing' || variantGenerateLaunchRef.current === 'briefing' ? 'briefing' : 'intro'
  const variantPrepare = useLessonPrepareProgress({
    active: structuredLessonVariantRegenerating,
    expectedDurationMs: LESSON_MENU_GENERATE_TIMEOUT_MS,
    labelProfile: variantPrepareLabelProfile,
  })
  const reportPrepareMilestoneRef = React.useRef(variantPrepare.reportMilestone)
  const resetVariantPrepareRef = React.useRef(variantPrepare.reset)
  const completePrepareProgressRef = React.useRef(variantPrepare.completePrepareProgress)
  const acknowledgeLessonReturnBriefingRef = React.useRef<(lesson?: LessonData) => void>(() => {})
  React.useEffect(() => {
    reportPrepareMilestoneRef.current = variantPrepare.reportMilestone
    resetVariantPrepareRef.current = variantPrepare.reset
    completePrepareProgressRef.current = variantPrepare.completePrepareProgress
  })
  // DEBUG: удалить после редактирования урока
  const debugFinalePendingRef = React.useRef<string | null>(null)
  const debugSkipToFinaleAfterResetRef = React.useRef(false)
  const debugPracticeFinalePendingRef = React.useRef<PracticeOpenRequest | null>(null)
  const activeStructuredLesson =
    activeStructuredLessonRuntime ??
    (structuredLessonLoadingId ? null : activeLearningLessonId ? getStructuredLessonById(activeLearningLessonId) : null)
  const {
    step: activeStructuredLessonStep,
    timeline: activeStructuredLessonTimeline,
    status: activeStructuredLessonStatus,
    feedback: activeStructuredLessonFeedback,
    footerDynamicText: activeStructuredLessonFooterDynamicText,
    footerStaticText: activeStructuredLessonFooterStaticText,
    footerVariantProgress: activeStructuredLessonFooterVariantProgress,
    footerTypingKey: activeStructuredLessonFooterTypingKey,
    footerVoiceTone: activeStructuredLessonFooterVoiceTone,
    footerVoiceEmphasis: activeStructuredLessonFooterVoiceEmphasis,
    handleAnswer: handleStructuredLessonAnswer,
    completeCurrentStep: completeStructuredLessonStep,
    awardPuzzleSubStep: awardStructuredLessonPuzzleSub,
    recordPuzzleAttempt: recordStructuredLessonPuzzleAttempt,
    clearPuzzleAttemptFeedback: clearStructuredLessonPuzzleAttemptFeedback,
    puzzleProgress: activeStructuredLessonPuzzleProgress,
    puzzleSubAdvanceToken: activeStructuredLessonPuzzleSubAdvanceToken,
    onPuzzleProgressChange: handleStructuredLessonPuzzleProgressChange,
    xp: activeStructuredLessonXp,
    coreXp: activeStructuredLessonCoreXp,
    comboXp: activeStructuredLessonComboXp,
    maxCoreXp: activeStructuredLessonMaxCoreXp,
    maxCombo: activeStructuredLessonMaxCombo,
    combo: activeStructuredLessonCombo,
    exerciseErrors: activeStructuredLessonExerciseErrors,
    mistakes: activeStructuredLessonMistakes,
    completedSteps: activeStructuredLessonCompletedSteps,
    currentStep: activeStructuredLessonCurrentStep,
    currentVariantIndex: activeStructuredLessonCurrentVariantIndex,
    totalSteps: activeStructuredLessonTotalSteps,
    isFinale: activeStructuredLessonIsFinale,
    lastCoreDelta: activeStructuredLessonLastCoreDelta,
    lastComboDelta: activeStructuredLessonLastComboDelta,
    lastXpAward: activeStructuredLessonLastXpAward,
    isAdvancingToNextStep: activeStructuredLessonIsAdvancingToNextStep,
    isAdvancingToNextVariant: activeStructuredLessonIsAdvancingToNextVariant,
    goToFinale: goToStructuredLessonFinale,
    firstTryCount: activeStructuredLessonFirstTryCount,
    totalScoredUnits: activeStructuredLessonTotalScoredUnits,
    forgivenessUsedThisRun: activeStructuredLessonForgivenessUsedThisRun,
    forgivenessConfirmPending: activeStructuredLessonForgivenessConfirmPending,
    forgivenessAppliedAckActive: activeStructuredLessonForgivenessAppliedAckActive,
    forgivenessPendingCorrectAnswer: activeStructuredLessonForgivenessPendingCorrectAnswer,
    forgivenessAppliedBalanceAfter: activeStructuredLessonForgivenessAppliedBalanceAfter,
    puzzleAttemptForgivenessToken: activeStructuredLessonPuzzleAttemptForgivenessToken,
    forgivenessAutofillAnswer: activeStructuredLessonForgivenessAutofillAnswer,
    forgivenessAutofillChoice: activeStructuredLessonForgivenessAutofillChoice,
    forgivenessAutofillNonce: activeStructuredLessonForgivenessAutofillNonce,
    requestCoinForgiveness: requestStructuredLessonCoinForgiveness,
    declineForgivenessOfferThisRun: declineStructuredLessonForgivenessOffer,
    cancelCoinForgivenessConfirm: cancelStructuredLessonCoinForgivenessConfirm,
    applyCoinErrorForgiveness: applyStructuredLessonCoinForgiveness,
    continueCoinForgivenessAfterSpend: continueStructuredLessonCoinForgiveness,
  } = useLessonEngine(activeStructuredLesson, {
    debugSkipToFinaleAfterResetRef,
  })
  const handleStructuredLessonConfirmCoinForgiveness = React.useCallback((): boolean => {
    if (!canSpendCoinsForForgiveness(rewardsState.currencies.coins)) {
      // TODO: monetization flow when balance < COIN_ERROR_FORGIVENESS_COST
      return false
    }

    const spent = spendCoins(rewardsState, COIN_ERROR_FORGIVENESS_COST)
    if (!spent.ok) return false

    const applied = applyStructuredLessonCoinForgiveness(spent.state.currencies.coins)
    if (!applied) return false

    setRewardsState(
      applyRewardsEvent(spent.state, {
        type: 'coins_spent',
        amount: COIN_ERROR_FORGIVENESS_COST,
        reason: 'lesson_error_forgiveness',
      })
    )
    return true
  }, [applyStructuredLessonCoinForgiveness, rewardsState])
  const handleStructuredLessonContinueCoinForgiveness = React.useCallback(() => {
    continueStructuredLessonCoinForgiveness()
  }, [continueStructuredLessonCoinForgiveness])
  const handleStructuredLessonZeroBalanceForgivenessHelp = React.useCallback(() => {
    const copy = getLessonCoinForgivenessCopy()
    setCoinForgivenessHelpOverlay((current) =>
      current
        ? current
        : {
            title: copy.zeroBalanceHelpTitle,
            lines: [copy.zeroBalanceHelpMessage],
          }
    )
  }, [])
  const isStructuredLessonRepeatRun =
    activeLessonVariantNumber > 1 ||
    structuredLessonRunOriginRef.current === 'post_lesson_repeat' ||
    structuredLessonRunOriginRef.current === 'repeat_api'
  const [structuredLessonFinaleContext, setStructuredLessonFinaleContext] = React.useState<{
    runKey: string
    previousCorePercent: number | null
    profileMedal: LessonMedalTierOrNull
  } | null>(null)

  React.useEffect(() => {
    if (activeStructuredLessonStatus !== 'completed' || !activeStructuredLesson) {
      setStructuredLessonFinaleContext(null)
      return
    }
    const runKey = activeStructuredLesson.runKey ?? 'static'
    setStructuredLessonFinaleContext((prev) => {
      if (prev?.runKey === runKey) return prev
      const previous = loadLessonProgress(activeStructuredLesson.id)
      return {
        runKey,
        previousCorePercent: previous?.lessonCompleted === true ? previous.corePercent : null,
        profileMedal: previous?.medal ?? null,
      }
    })
  }, [activeStructuredLessonStatus, activeStructuredLesson])
  const lessonFirstAnswerTrackedRef = React.useRef(false)
  const lessonCycle1ActiveSessionRef = React.useRef(false)
  const finalizeLessonCycle1OnLeaveRef = React.useRef<() => void>(() => {})

  const practiceSession = usePracticeSession({ audience: settings.audience })
  const { abandonSession: abandonPracticeSession, startSession: startPracticeSession } = practiceSession
  const [choiceCorrectionPhase, setChoiceCorrectionPhase] =
    React.useState<PracticeChoiceCorrectionPhase>('idle')
  React.useEffect(() => {
    setChoiceCorrectionPhase('idle')
  }, [practiceSession.session?.id])
  const [accentTrainerActive, setAccentTrainerActive] = useState(false)
  const [activeAccentLessonId, setActiveAccentLessonId] = useState<string | null>(null)
  const [accentLessonRequestKey, setAccentLessonRequestKey] = useState(0)
  const [accentFooterView, setAccentFooterView] = useState<AccentFooterView | null>(null)
  const [vocabularyWorldsActive, setVocabularyWorldsActive] = useState(false)
  const [vocabularyByLevelActive, setVocabularyByLevelActive] = useState(false)
  const [vocabularyFooterView, setVocabularyFooterView] = useState<VocabularyFooterView | null>(null)
  const [adaptiveFooterView, setAdaptiveFooterView] = useState<AdaptiveFooterView | null>(null)
  const [engvoVoiceMode, setEngvoVoiceMode] = useState(false)
  const [engvoProvider, setEngvoProvider] = useState<EngvoProvider>(ENGVO_DEFAULT_PROVIDER)
  const [engvoRealtimeVoice, setEngvoRealtimeVoice] = useState<EngvoRealtimeVoice>(ENGVO_DEFAULT_VOICE)
  const [engvoXaiVoice, setEngvoXaiVoice] = useState<EngvoXaiCallVoice>(ENGVO_XAI_DEFAULT_VOICE)
  const [engvoXaiVoiceRotationMode, setEngvoXaiVoiceRotationMode] =
    useState<EngvoXaiVoiceRotationMode>(ENGVO_DEFAULT_XAI_VOICE_ROTATION_MODE)
  const engvoActiveProviderRef = React.useRef<EngvoProvider>(ENGVO_DEFAULT_PROVIDER)
  const engvoXaiTransportRef = React.useRef<EngvoXaiTransport | null>(null)
  const engvoXaiAudioContextRef = React.useRef<AudioContext | null>(null)
  const [engvoCefrLevel, setEngvoCefrLevel] = useState<EngvoCefrLevel>(ENGVO_DEFAULT_LEVEL)
  const [engvoSpeechSpeedPreset, setEngvoSpeechSpeedPreset] =
    useState<EngvoSpeechSpeedPresetId>('conversational')
  const [engvoSessionKind, setEngvoSessionKind] =
    useState<EngvoVoiceSessionKind>(ENGVO_DEFAULT_SESSION_KIND)
  const [engvoTeacherTense, setEngvoTeacherTense] = useState<TenseId>(ENGVO_DEFAULT_TEACHER_TENSE)
  const [engvoTeacherSentenceType, setEngvoTeacherSentenceType] = useState<SentenceType>(
    ENGVO_DEFAULT_TEACHER_SENTENCE_TYPE
  )
  const engvoTeacherPhaseRef = React.useRef<EngvoTeacherPhase | null>(null)
  const engvoTeacherUserFinalCountRef = React.useRef(0)
  const engvoTeacherAwaitingFirstDrillRef = React.useRef(false)
  const engvoTeacherReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoTeacherReclaimAttemptsThisUserTurnRef = React.useRef(0)
  const engvoTeacherReclaimInFlightRef = React.useRef(false)
  const engvoFreeCallUserFinalCountRef = React.useRef(0)
  const engvoFreeCallReclaimUsedThisUserTurnRef = React.useRef(false)
  const engvoFreeCallReclaimInFlightRef = React.useRef(false)
  const maybeReclaimTeacherDrillRef = React.useRef<(rawText: string) => boolean>(() => false)
  const maybeReclaimFreeCallLengthRef = React.useRef<(rawText: string) => boolean>(() => false)
  const engvoSessionKindRef = React.useRef<EngvoVoiceSessionKind>(ENGVO_DEFAULT_SESSION_KIND)
  engvoSessionKindRef.current = engvoSessionKind
  const [practiceTtsSpeedDefaultIndex, setPracticeTtsSpeedDefaultIndex] = useState(0)
  const [chatPatternId, setChatPatternId] = useState<ChatPatternId>('none')
  const [chatPatternTuningMap, setChatPatternTuningMap] = useState<ChatPatternTuningMap>({})
  const chatPatternTuningMapRef = React.useRef(chatPatternTuningMap)
  chatPatternTuningMapRef.current = chatPatternTuningMap
  const [engvoCallPhase, setEngvoCallPhase] = useState<EngvoCallPhase>('idle')
  const [engvoErrorText, setEngvoErrorText] = useState<string | null>(null)
  const [engvoUserInterimText, setEngvoUserInterimText] = useState('')
  const [engvoAssistantPendingText, setEngvoAssistantPendingText] = useState('')
  const [engvoSessionUpdateTick, setEngvoSessionUpdateTick] = useState(0)
  const [engvoBootstrapServiceStatusVisible, setEngvoBootstrapServiceStatusVisible] = useState(false)
  const [engvoLocalAudioStream, setEngvoLocalAudioStream] = useState<MediaStream | null>(null)
  const [engvoRemoteAudioStream, setEngvoRemoteAudioStream] = useState<MediaStream | null>(null)
  /** Пока `<audio>` реально играет удалённый WebRTC-поток - метер в чате должен смотреть на remote, даже если фаза уже `listening` (эхо/VAD). */
  const [engvoRemotePlaybackActive, setEngvoRemotePlaybackActive] = useState(false)
  const [engvoCallStartedAt, setEngvoCallStartedAt] = useState<number | null>(null)
  const structuredLessonChoiceShuffleSeed =
    activeStructuredLesson == null
      ? undefined
      : (activeStructuredLesson.runKey ??
          `static-${activeStructuredLesson.id}-${activeStructuredLesson.variantId ?? ''}-${structuredLessonShuffleNonce}`)
  const dialogueCorrectAnswers = React.useMemo(() => countDialogueFinalCorrectAnswers(messages), [messages])
  const rewardedPracticeSessionRef = React.useRef<string | null>(null)
  const practicePopupSeenRef = React.useRef<string | null>(null)
  const [practiceRewardUi, setPracticeRewardUi] = React.useState<PracticeRewardUi | null>(null)
  const [practiceCompletionMeta, setPracticeCompletionMeta] = React.useState<{
    tier: 0 | 1 | 2
    globalAmount: number
    globalReason: PracticeRewardUi['globalReason']
    ringCount: number
    ringIncremented: boolean
    canEarnRingToday: boolean
    coinsAwarded: number
    cupAwarded: number
    pendingPracticeCoins: number
    pendingCup: boolean
    baseBadgeAwarded: boolean
    baseBadgeClaimed: boolean
    badgeLine: string
    badgeRankAwarded: 0 | 1 | 2 | 3 | null
    masteryScore: number
    effectiveMasteryScore: number
    correctedCount: number
    plannedLength: number
    forgivenessUsed: boolean
    gemsPending: boolean
    cupClaimed: boolean
  } | null>(null)
  const [practiceProgressRevision, setPracticeProgressRevision] = React.useState(0)
  const handlePracticeConfirmCoinForgiveness = React.useCallback((): boolean => {
    const copy = getPracticeCoinForgivenessCopy()
    if (rewardsState.currencies.coins < 1) {
      setCoinForgivenessHelpOverlay({ title: copy.helpTitle, lines: [copy.helpMessage] })
      return false
    }
    const result = spendAndApplyPracticeForgiveness({
      rewardsState,
      apply: practiceSession.applyCoinForgiveness,
    })
    if (!result.ok && !result.rolledBack) {
      setRewardsState(result.state)
      return false
    }
    setRewardsState(
      applyRewardsEvent(result.state, {
        type: result.ok ? 'coins_spent' : 'coins_earned',
        amount: 1,
        reason: result.ok ? 'practice_error_forgiveness' : 'practice_forgiveness_rollback',
        ticker: result.ok ? copy.appliedFooter : copy.rollback,
      })
    )
    return result.ok
  }, [practiceSession.applyCoinForgiveness, rewardsState])
  const finalizeLessonCycle1OnLeave = useCallback(() => {
    const lessonId = activeStructuredLesson?.id ?? activeLearningLessonId
    if (!lessonId || !lessonCycle1ActiveSessionRef.current) return
    if (activeStructuredLessonStatus === 'completed') {
      lessonCycle1ActiveSessionRef.current = false
      return
    }
    closeLessonCycle1(lessonId)
    lessonCycle1ActiveSessionRef.current = false
    setPracticeProgressRevision((n) => n + 1)
  }, [
    activeStructuredLesson?.id,
    activeLearningLessonId,
    activeStructuredLessonStatus,
  ])
  finalizeLessonCycle1OnLeaveRef.current = finalizeLessonCycle1OnLeave
  const structuredLessonSilverCap = React.useMemo(() => {
    if (!activeStructuredLesson) return isStructuredLessonRepeatRun
    const progress = loadLessonProgress(activeStructuredLesson.id)
    const isLocalLesson =
      !isAiGeneratedLessonRuntime(activeStructuredLesson) ||
      isLocalStructuredLessonRun(structuredLessonRunOriginRef.current, activeLessonVariantNumber)
    return shouldCapGoldToSilver({
      isLocalLesson,
      cycle1Closed: progress?.cycle1Closed === true,
      isRepeatRun: isStructuredLessonRepeatRun,
    })
  }, [activeStructuredLesson, activeLessonVariantNumber, isStructuredLessonRepeatRun])
  const processedLessonXpAwardNonceRef = React.useRef(0)
  const processedLessonXpAwardKeyRef = React.useRef<string | null>(null)
  const processedLessonCoinAwardKeyRef = React.useRef<string | null>(null)
  const globalLessonXpAwardedThisRunRef = React.useRef(0)
  const [lessonFinaleCoinAward, setLessonFinaleCoinAward] = React.useState<LessonCoinAward | null>(null)
  const rewardPopupSeenRef = React.useRef<string | null>(null)
  const footerContextSignatureRef = React.useRef<string | null>(null)
  const footerTransitionTimeoutRef = React.useRef<number | null>(null)
  /** Настройки на момент последней отправки сообщения; для баннера «настройки изменены». */
  const [settingsAtLastSend, setSettingsAtLastSend] = useState<Settings | null>(null)
  const initialLoadDoneRef = React.useRef(false)
  const rewardsPersistReadyRef = React.useRef(false)
  const usageRequestStartedRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)
  /** Не запускать второй запрос первого сообщения, пока первый в полёте (защита от двойного вызова из эффекта). */
  const firstMessageInFlightRef = React.useRef(false)
  const ensureFirstMessageRef = React.useRef<(() => Promise<void>) | null>(null)
  const dialogSeedRef = React.useRef(createDialogSeed())
  /** Актуальный язык ожидаемого ввода в общении - для тела fetch без гонки замыкания sendToApi/setTimeout. */
  const communicationInputExpectedLangRef = React.useRef(settings.communicationInputExpectedLang)
  communicationInputExpectedLangRef.current = settings.communicationInputExpectedLang
  const communicationVoiceInputMode = getCommunicationVoiceInputMode(settings)
  const communicationVoiceDropdownRef = React.useRef<HTMLDivElement | null>(null)
  const appColumnRef = React.useRef<HTMLDivElement | null>(null)
  const homeColumnRef = React.useRef<HTMLDivElement | null>(null)
  const chatGlassRef = React.useRef<HTMLDivElement>(null)
  const footerSheetOpen = Boolean(footerSheetContext)
  const headerColumnBounds = useAppColumnBounds(appColumnRef, {
    remeasureWhen: menuOpen || footerSheetOpen,
  })
  const homeColumnBounds = useAppColumnBounds(homeColumnRef, {
    remeasureWhen: menuOpen || footerSheetOpen,
  })
  const chatColumnBounds = useAppColumnBounds(chatGlassRef, {
    remeasureWhen: menuOpen || footerSheetOpen,
  })
  const appColumnBounds = React.useMemo(() => {
    const primary =
      dialogStarted && chatColumnBounds ? chatColumnBounds : headerColumnBounds
    if (!primary || !headerColumnBounds) return primary
    const contentLeft = !dialogStarted && homeColumnBounds
      ? Math.min(primary.left, headerColumnBounds.left, homeColumnBounds.left)
      : Math.min(primary.left, headerColumnBounds.left)
    return {
      ...primary,
      left: contentLeft,
      width: primary.width,
      shellLeft: Math.min(primary.shellLeft, headerColumnBounds.shellLeft),
      shellRight: Math.max(primary.shellRight, headerColumnBounds.shellRight),
      isFullBleed: primary.isFullBleed,
    }
  }, [dialogStarted, chatColumnBounds, headerColumnBounds, homeColumnBounds])
  /** Настройки при открытии меню: режим + поля для сравнения при закрытии (без уровня). */
  const menuOpenSnapshotRef = React.useRef<MenuOpenSnapshot | null>(null)
  const prevMenuOpenForSnapshotRef = React.useRef(false)
  /** Не показывать баннер «настройки изменены» сразу после автоперезапуска из меню (до синхронизации с отправкой). */
  const suppressSettingsChangeBannerRef = React.useRef(false)
  const structuredLessonVariantHistoryRef = React.useRef<Record<string, string[]>>({})
  const prefetchedStructuredLessonRuntimeRef = React.useRef<Record<string, LessonData | null>>({})
  const structuredLessonRuntimeInFlightRef = React.useRef<Record<string, Promise<LessonData | null>>>({})
  const lessonOpenRequestIdRef = React.useRef(0)
  const engvoPeerConnectionRef = React.useRef<RTCPeerConnection | null>(null)
  const engvoDataChannelRef = React.useRef<RTCDataChannel | null>(null)
  const engvoRemoteAudioElRef = React.useRef<HTMLAudioElement | null>(null)
  const engvoMediaStreamRef = React.useRef<MediaStream | null>(null)
  const engvoPlaybackPendingCountRef = React.useRef(0)
  const engvoAssistantResponseIdRef = React.useRef<string | null>(null)
  const engvoAssistantResponseDoneRef = React.useRef(false)
  const engvoCommittedResponseIdsRef = React.useRef<Set<string>>(new Set())
  const engvoCommittedUserItemIdsRef = React.useRef<Set<string>>(new Set())
  const engvoPendingUserItemIdRef = React.useRef<string | null>(null)
  const engvoAssistantCommittedBeforeUserItemIdsRef = React.useRef<Set<string>>(new Set())
  const engvoIgnoredResponseIdsRef = React.useRef<Set<string>>(new Set())
  const engvoFinalAssistantTextRef = React.useRef('')
  const engvoStreamingAssistantIndexRef = React.useRef<number | null>(null)
  const engvoSessionStartedRef = React.useRef(false)
  const engvoSessionBootstrapRef = React.useRef<EngvoSessionBootstrapSnapshot | null>(null)
  const engvoDebugTimingRef = React.useRef(createEngvoDebugTimingState())
  const engvoGreetingTriggeredRef = React.useRef(false)
  /** После таймера/трубки: следующий `startEngvoCall` сбрасывает чат и показывает только строку набора. */
  const engvoRedialWithoutWelcomeRef = React.useRef(false)
  const engvoCallTranslationInflightRef = React.useRef<Map<string, Promise<void>>>(new Map())
  const engvoPendingTranslationByResponseIdRef = React.useRef<
    Map<string, { translation?: string; translationError?: string }>
  >(new Map())
  const prefetchEngvoCallTranslationRef = React.useRef<(text: string, responseId: string | null) => void>(
    () => {}
  )
  const engvoPendingRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | EngvoXaiCallVoice | null>(null)
  const engvoPendingRealtimeSpeedRef = React.useRef<number | null>(null)
  const engvoLastAppliedRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | EngvoXaiCallVoice | null>(null)
  const engvoLastAppliedRealtimeSpeedRef = React.useRef<number | null>(null)
  const engvoApplyingRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | EngvoXaiCallVoice | null>(null)
  const engvoApplyingRealtimeSpeedRef = React.useRef<number | null>(null)
  const engvoSessionUpdateInFlightRef = React.useRef(false)
  const engvoSessionUpdateRetryTimeoutRef = React.useRef<number | null>(null)
  const engvoTranscriptStateRef = React.useRef<RealtimeTranscriptState>(createRealtimeTranscriptState())
  const engvoPcConnectTimeoutRef = React.useRef<number | null>(null)
  const engvoDcOpenTimeoutRef = React.useRef<number | null>(null)
  const engvoSessionAckTimeoutRef = React.useRef<number | null>(null)
  const engvoDisconnectTimeoutRef = React.useRef<number | null>(null)
  const engvoResponseDoneFallbackTimeoutRef = React.useRef<number | null>(null)
  const engvoInterruptDebounceTimeoutRef = React.useRef<number | null>(null)
  const engvoInterruptDebounceStateRef = React.useRef(createEngvoInterruptDebounceState())
  const engvoInactivityTimeoutRef = React.useRef<number | null>(null)
  const engvoMaxCallDurationTimeoutRef = React.useRef<number | null>(null)
  const engvoListenArmedRef = React.useRef(false)
  const engvoXaiUplinkDropCountRef = React.useRef(0)
  const engvoLastAssistantTextForKeytermsRef = React.useRef('')
  const engvoLastMeaningfulActivityAtRef = React.useRef<number>(0)
  const engvoLastFinalUserAtRef = React.useRef<number>(0)
  const engvoLastUserCoalescedAtRef = React.useRef<number>(0)
  const engvoLastFinalUserTranscriptRef = React.useRef<string>('')
  const engvoGotAssistantForCurrentUserTurnRef = React.useRef(false)
  /** Снимок истории для передачи в новую Realtime-сессию после разрыва звонка; опустошается в `session.created`. */
  const engvoRealtimeReplayItemsRef = React.useRef<EngvoRealtimeReplayItem[] | null>(null)
  const resetStructuredLessonSessionRef = React.useRef<((options?: { keepLessonMenuContext?: boolean }) => void) | null>(null)
  /** Отмена предыдущего «Сгенерировать урок», чтобы не было параллельных POST и залипания loading. */
  const menuLessonGenerateCleanupRef = React.useRef<(() => void) | null>(null)
  /** Инкремент при каждом новом фоновом запросе variant; finally сравнивает эпоху, чтобы не сбросить флаг чужого завершения. */
  const menuLessonBgFetchEpochRef = React.useRef(0)
  const practicePrefetchInFlightRef = React.useRef(false)
  const practicePrefetchAbortRef = React.useRef<AbortController | null>(null)
  /** Предыдущий экран меню на главной: для сброса модели при возврате на корень (root). */
  const prevHomeMenuViewForModelResetRef = React.useRef<MenuView | null>(null)
  const prevFooterModeActivityRef = React.useRef({
    lesson: false,
    practice: false,
    accent: false,
  })
  const prevFooterAudienceRef = React.useRef<Audience>(settings.audience)
  const bumpFooterSessionContext = useCallback(() => {
    setFooterSessionContextNonce((prev) => prev + 1)
  }, [])
  const bumpCommunicationGoal = useCallback(() => {
    setRewardsState((prev) => applyRewardsEvent(prev, { type: 'communication_turn_completed' }))
  }, [])
  const bumpEngvoGoal = useCallback(() => {
    setRewardsState((prev) => applyRewardsEvent(prev, { type: 'engvo_turn_completed' }))
  }, [])
  const handleAccentSessionCompleted = useCallback(() => {
    setRewardsState((prev) => applyRewardsEvent(prev, { type: 'accent_session_completed' }))
  }, [])
  /** iPhone / iPad / iPod и iPadOS с десктопным UA (Macintosh + Mobile). */
  const isIosClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) return true
    return /Macintosh/i.test(ua) && /Mobile/i.test(ua)
  }, [])
  /** Только iOS Safari (без CriOS/Firefox/Edge на iOS). */
  const isIosSafariClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return isIosSafariUserAgent(navigator.userAgent)
  }, [])
  /** iOS Safari + Chrome (CriOS) - общая WebKit-ветка dialog layout. */
  const isIosWebKitClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return isIosWebKitBrowser(navigator.userAgent)
  }, [])
  const isAndroidMobileClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /Android/i.test(navigator.userAgent)
  }, [])

  function normalizeSettingsForAudience(s: Settings): Settings {
    const openAiChatPreset = normalizeOpenAiChatPreset(s.openAiChatPreset)
    const normalizedLevel: Settings['level'] = s.level === 'starter' ? 'a1' : s.level
    const normalizedTopic = s.topic

    if (s.audience !== 'child') {
      return {
        ...s,
        openAiChatPreset,
        level: normalizedLevel,
        topic: normalizedTopic,
        tenses: normalizeSingleTense(
          s.tenses,
          allowedTensesForAudience(normalizedLevel, 'adult'),
          'present_simple'
        ),
      }
    }
    const allowed = new Set<Settings['level']>(['all', 'a1', 'a2'])
    const topicIds = new Set(TOPICS.map((t) => t.id))
    const safeChildTopic = topicIds.has(s.topic) ? s.topic : 'free_talk'
    const childLevel = allowed.has(normalizedLevel) ? normalizedLevel : 'all'

    return {
      ...s,
      openAiChatPreset,
      level: childLevel,
      topic: normalizedTopic === 'free_talk' ? 'free_talk' : safeChildTopic,
      tenses: normalizeSingleTense(
        s.tenses,
        allowedTensesForAudience(childLevel, 'child'),
        'present_simple'
      ),
    }
  }

  React.useEffect(() => {
    if (!dialogStarted || typeof window === 'undefined') return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [dialogStarted])

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-audience', settings.audience)
    document.body?.setAttribute('data-audience', settings.audience)
    return () => {
      document.documentElement.removeAttribute('data-audience')
      document.body?.removeAttribute('data-audience')
    }
  }, [settings.audience])

  React.useEffect(() => {
    if (prevFooterAudienceRef.current === settings.audience) return
    prevFooterAudienceRef.current = settings.audience
    setFooterTransitionText(null)
    bumpFooterSessionContext()
  }, [bumpFooterSessionContext, settings.audience])

  React.useEffect(() => {
    return () => {
      if (footerTransitionTimeoutRef.current !== null) {
        window.clearTimeout(footerTransitionTimeoutRef.current)
        footerTransitionTimeoutRef.current = null
      }
    }
  }, [])

  React.useLayoutEffect(() => {
    if (dialogStarted) return

    const cachedFact = welcomeFactByNonceRef.current.get(greetingNonce)
    if (cachedFact) {
      setWelcomeFactLine(cachedFact)
    } else {
      try {
        const line = consumeNextGreetingFactLine()
        welcomeFactByNonceRef.current.set(greetingNonce, line)
        setWelcomeFactLine(line)
      } catch {
        const fallback = 'Интересный факт скоро появится.'
        welcomeFactByNonceRef.current.set(greetingNonce, fallback)
        setWelcomeFactLine(fallback)
      }
    }

    const cachedVoice = homeVoiceByNonceRef.current.get(greetingNonce)
    if (cachedVoice) {
      setHomeVoiceLine(cachedVoice)
    } else {
      try {
        const line = consumeNextHomeVoiceLine()
        homeVoiceByNonceRef.current.set(greetingNonce, line)
        setHomeVoiceLine(line)
      } catch {
        const fallback = 'Я снова здесь. Продолжим?'
        homeVoiceByNonceRef.current.set(greetingNonce, fallback)
        setHomeVoiceLine(fallback)
      }
    }

  }, [dialogStarted, greetingNonce])

  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      if (v !== homeMenuView) {
        setFooterTransitionText(null)
        bumpFooterSessionContext()
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted, bumpFooterSessionContext]
  )

  React.useEffect(() => {
    const prev = prevHomeMenuViewForModelResetRef.current
    prevHomeMenuViewForModelResetRef.current = homeMenuView
    if (dialogStarted) return
    if (prev === null) return
    if (prev === 'root' || homeMenuView !== 'root') return
    setSettings((s) =>
      normalizeSettingsForAudience({ ...s, openAiChatPreset: 'gpt-4o-mini' })
    )
  }, [homeMenuView, dialogStarted])

  React.useEffect(() => {
    if (homeMenuView !== 'aiChat') setHomeAiChatPanel('summary')
  }, [homeMenuView])

  /** Ограничение лимитов отключено: отправка и перевод всегда доступны. */
  const atLimit = false

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      const data = (await res.json()) as UsageInfo
      const limit = data.limit ?? 50
      const used = getUsageCountToday()
      setUsage({ used, limit })
    } catch {
      setUsage((prev) => ({ ...prev, used: getUsageCountToday() }))
    }
  }, [])
  const maybeFetchUsage = useCallback(() => {
    if (usageRequestStartedRef.current) return
    usageRequestStartedRef.current = true
    void fetchUsage()
  }, [fetchUsage])

  const resetEngvoAssistantTurn = useCallback((options?: { markIgnored?: boolean }) => {
    const responseId = engvoAssistantResponseIdRef.current
    if (options?.markIgnored && responseId) {
      engvoIgnoredResponseIdsRef.current.add(responseId)
    }
    engvoAssistantResponseIdRef.current = null
    engvoAssistantResponseDoneRef.current = false
    engvoFinalAssistantTextRef.current = ''
    engvoStreamingAssistantIndexRef.current = null
    setEngvoAssistantPendingText('')
  }, [])

  const guardEngvoAssistantContent = useCallback(
    (text: string): string => {
      const guarded = applyCefrOutputGuardClient({
        mode: 'communication',
        content: text,
        level: engvoCefrLevel,
        audience: settings.audience,
        communicationTargetLang: 'en',
      })
      if (guarded.leaked) {
        console.warn('[engvo][cefr-guard] residual violations', guarded.violations)
      }
      return guarded.content
    },
    [engvoCefrLevel, settings.audience]
  )

  const markEngvoAssistantAheadOfPendingUserTranscript = useCallback(() => {
    const pendingUserItemId = engvoPendingUserItemIdRef.current
    if (!pendingUserItemId) return
    if (engvoCommittedUserItemIdsRef.current.has(pendingUserItemId)) return
    engvoAssistantCommittedBeforeUserItemIdsRef.current.add(pendingUserItemId)
  }, [])

  const maybeCommitEngvoAssistantMessage = useCallback(() => {
    const responseId = engvoAssistantResponseIdRef.current
    const rawText = cleanNewlines(engvoFinalAssistantTextRef.current)
    const finalText = guardEngvoAssistantContent(rawText)
    if (
      !canCommitEngvoAssistantMessage({
        responseDone: engvoAssistantResponseDoneRef.current,
        playbackPendingCount: engvoPlaybackPendingCountRef.current,
        finalText,
        alreadyCommittedResponseIds: engvoCommittedResponseIdsRef.current,
        responseId,
      })
    ) {
      return
    }

    engvoCommittedResponseIdsRef.current.add(responseId as string)
    markEngvoAssistantAheadOfPendingUserTranscript()
    setMessages((prev) => {
      const withoutDial = prev.filter((m) => !m.engvoServiceLine)
      const pending = responseId ? engvoPendingTranslationByResponseIdRef.current.get(responseId) : undefined
      if (responseId && pending) {
        engvoPendingTranslationByResponseIdRef.current.delete(responseId)
      }
      const msg: ChatMessage = {
        role: 'assistant',
        content: finalText,
        ...(pending ? { translation: pending.translation, translationError: pending.translationError } : {}),
      }
      return [...withoutDial, msg]
    })
    resetEngvoAssistantTurn()
    const reclaimStarted =
      maybeReclaimTeacherDrillRef.current(rawText) ||
      maybeReclaimFreeCallLengthRef.current(rawText)
    if (!reclaimStarted) {
      setEngvoCallPhase('listening')
    }
    setEngvoErrorText(null)
  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])

  const commitEngvoAssistantText = useCallback(
    (text: string, responseId?: string | null): boolean => {
      const rawText = cleanNewlines(text)
      const cleanText = guardEngvoAssistantContent(rawText)
      if (!cleanText) return false
      const id = responseId ?? engvoAssistantResponseIdRef.current
      if (id) {
        if (engvoCommittedResponseIdsRef.current.has(id)) return false
        engvoCommittedResponseIdsRef.current.add(id)
      }

      if (
        engvoSessionKindRef.current === 'teacher' &&
        engvoTeacherPhaseRef.current === 'drill'
      ) {
        const extracted = extractTeacherCorrection(rawText || cleanText)
        if (extracted.corrected) {
          const userText = engvoLastFinalUserTranscriptRef.current.trim()
          if (userText) {
            recordTeacherCorrectionSignal({
              userText,
              corrected: extracted.corrected,
            })
          }
        }
      }

      markEngvoAssistantAheadOfPendingUserTranscript()
      engvoLastMeaningfulActivityAtRef.current = Date.now()
      engvoGotAssistantForCurrentUserTurnRef.current = true
      engvoLastAssistantTextForKeytermsRef.current = cleanText
      setMessages((prev) => {
        const withoutDial = prev.filter((m) => !m.engvoServiceLine)
        const streamingIndex = engvoStreamingAssistantIndexRef.current
        if (streamingIndex !== null && streamingIndex >= 0 && streamingIndex < withoutDial.length) {
          const candidate = withoutDial[streamingIndex]
          if (candidate?.role === 'assistant') {
            const updated = [...withoutDial]
            let patched = {
              ...candidate,
              content: cleanText,
              engvoServiceLine: undefined,
            }
            if (id) {
              const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
              if (pending) {
                engvoPendingTranslationByResponseIdRef.current.delete(id)
                patched = {
                  ...patched,
                  translation: pending.translation,
                  translationError: pending.translationError,
                }
              }
            }
            updated[streamingIndex] = patched
            return updated
          }
        }
        const last = withoutDial[withoutDial.length - 1]
        const lastNormalized = normalizeForEchoCompare(last?.content ?? '')
        const nextNormalized = normalizeForEchoCompare(cleanText)
        if (
          last?.role === 'assistant' &&
          last.engvoLocalWelcome !== true &&
          !last.engvoServiceLine &&
          last.content.trim() !== ENGVO_CALL_FINISHED_ASSISTANT_TEXT &&
          lastNormalized === nextNormalized
        ) {
          return withoutDial
        }
        const assistantMsg: ChatMessage = { role: 'assistant', content: cleanText }
        const nextMessages = [...withoutDial, assistantMsg]
        if (id) {
          const pending = engvoPendingTranslationByResponseIdRef.current.get(id)
          if (pending) {
            engvoPendingTranslationByResponseIdRef.current.delete(id)
            const idx = findAssistantIndexByTranslationText(nextMessages, nextMessages.length - 1, cleanText)
            if (nextMessages[idx]?.role === 'assistant') {
              const patched = [...nextMessages]
              patched[idx] = {
                ...patched[idx],
                translation: pending.translation,
                translationError: pending.translationError,
              }
              return patched
            }
          }
        }
        return nextMessages
      })
      resetEngvoAssistantTurn()
      const reclaimStarted =
        maybeReclaimTeacherDrillRef.current(rawText) ||
        maybeReclaimFreeCallLengthRef.current(rawText)
      if (!reclaimStarted) {
        setEngvoCallPhase('listening')
      }
      setEngvoErrorText(null)
      return reclaimStarted
    },
    [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn]
  )

  const clearEngvoTimeout = useCallback((timeoutRef: React.MutableRefObject<number | null>) => {
    const timeoutId = timeoutRef.current
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutRef.current = null
    }
  }, [])

  const clearEngvoInactivityTimeout = useCallback(() => {
    const timeoutId = engvoInactivityTimeoutRef.current
    if (timeoutId !== null) {
      window.clearInterval(timeoutId)
      window.clearTimeout(timeoutId)
      engvoInactivityTimeoutRef.current = null
    }
  }, [])

  const clearEngvoMaxCallDurationTimeout = useCallback(() => {
    clearEngvoTimeout(engvoMaxCallDurationTimeoutRef)
  }, [clearEngvoTimeout])

  const markEngvoMeaningfulActivity = useCallback(() => {
    engvoLastMeaningfulActivityAtRef.current = Date.now()
  }, [])

  const appendEngvoCallFinishedMessage = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant' && last.content.trim() === ENGVO_CALL_FINISHED_ASSISTANT_TEXT) return prev
      return [...prev, { role: 'assistant', content: ENGVO_CALL_FINISHED_ASSISTANT_TEXT }]
    })
  }, [])

  const stopEngvoPlayback = useCallback(
    (markIgnoredCurrent = false) => {
      const hasActiveAssistantResponse =
        !!engvoAssistantResponseIdRef.current && !engvoAssistantResponseDoneRef.current
      if (markIgnoredCurrent) {
        resetEngvoAssistantTurn({ markIgnored: true })
      }
      engvoPlaybackPendingCountRef.current = 0
      const provider = engvoActiveProviderRef.current
      const stopEvents = getEngvoStopPlaybackEvents(provider)
      if (hasActiveAssistantResponse) {
        for (const event of stopEvents) {
          if (provider === 'xai') {
            engvoXaiTransportRef.current?.send(event)
          } else {
            const dataChannel = engvoDataChannelRef.current
            if (dataChannel?.readyState === 'open') {
              try {
                dataChannel.send(JSON.stringify(event))
              } catch {
                // ignore
              }
            }
          }
        }
      }
      if (provider === 'xai') {
        engvoXaiTransportRef.current?.clearLocalPlayback()
      }
    },
    [resetEngvoAssistantTurn]
  )

  const scheduleEngvoSessionUpdateRetry = useCallback(() => {
    if (engvoSessionUpdateRetryTimeoutRef.current !== null) return
    engvoSessionUpdateRetryTimeoutRef.current = window.setTimeout(() => {
      engvoSessionUpdateRetryTimeoutRef.current = null
      setEngvoSessionUpdateTick((prev) => prev + 1)
    }, 300)
  }, [])

  const clearEngvoSessionUpdateRetry = useCallback(() => {
    if (engvoSessionUpdateRetryTimeoutRef.current === null) return
    window.clearTimeout(engvoSessionUpdateRetryTimeoutRef.current)
    engvoSessionUpdateRetryTimeoutRef.current = null
  }, [])

  const cleanupEngvoRuntime = useCallback(
    (options?: { markIgnoredCurrent?: boolean }) => {
      clearEngvoInactivityTimeout()
      clearEngvoMaxCallDurationTimeout()
      engvoListenArmedRef.current = false
      engvoXaiUplinkDropCountRef.current = 0
      engvoLastMeaningfulActivityAtRef.current = 0
      engvoLastFinalUserAtRef.current = 0
      engvoLastUserCoalescedAtRef.current = 0
      engvoGotAssistantForCurrentUserTurnRef.current = false
      stopEngvoPlayback(options?.markIgnoredCurrent ?? true)

      clearEngvoTimeout(engvoPcConnectTimeoutRef)
      clearEngvoTimeout(engvoDcOpenTimeoutRef)
      clearEngvoTimeout(engvoSessionAckTimeoutRef)
      clearEngvoTimeout(engvoDisconnectTimeoutRef)
      clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
      clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
      resetEngvoInterruptDebounceState(engvoInterruptDebounceStateRef.current)

      const peerConnection = engvoPeerConnectionRef.current
      const dataChannel = engvoDataChannelRef.current
      const remoteAudioEl = engvoRemoteAudioElRef.current
      const mediaStream = engvoMediaStreamRef.current

      const xaiTransport = engvoXaiTransportRef.current
      engvoXaiTransportRef.current = null
      if (xaiTransport) {
        console.info('[engvo] uplink-drop', { count: engvoXaiUplinkDropCountRef.current })
        try {
          xaiTransport.disconnect()
        } catch {
          // ignore
        }
      }
      const xaiAudioContext = engvoXaiAudioContextRef.current
      engvoXaiAudioContextRef.current = null
      if (xaiAudioContext) {
        try {
          void xaiAudioContext.close().catch(() => {})
        } catch {
          // ignore
        }
      }

      engvoPeerConnectionRef.current = null
      engvoDataChannelRef.current = null
      engvoRemoteAudioElRef.current = null
      engvoMediaStreamRef.current = null
      setEngvoLocalAudioStream(null)
      setEngvoRemoteAudioStream(null)
      setEngvoRemotePlaybackActive(false)
      setEngvoCallStartedAt(null)

      if (mediaStream) {
        for (const track of mediaStream.getTracks()) track.stop()
      }
      if (remoteAudioEl) {
        try {
          remoteAudioEl.pause()
          remoteAudioEl.srcObject = null
        } catch {
          // ignore
        }
      }
      if (dataChannel) {
        try {
          dataChannel.onmessage = null
          dataChannel.onopen = null
          dataChannel.onerror = null
          dataChannel.onclose = null
          dataChannel.close()
        } catch {
          // ignore
        }
      }
      if (peerConnection) {
        try {
          peerConnection.ontrack = null
          peerConnection.onconnectionstatechange = null
          peerConnection.oniceconnectionstatechange = null
          peerConnection.close()
        } catch {
          // ignore
        }
      }

      engvoTranscriptStateRef.current = createRealtimeTranscriptState()
      engvoGreetingTriggeredRef.current = false
      engvoSessionStartedRef.current = false
      engvoSessionBootstrapRef.current = null
      resetEngvoDebugTimingState(engvoDebugTimingRef.current)
      engvoPendingRealtimeVoiceRef.current = null
      engvoPendingRealtimeSpeedRef.current = null
      engvoLastAppliedRealtimeVoiceRef.current = null
      engvoLastAppliedRealtimeSpeedRef.current = null
      engvoApplyingRealtimeVoiceRef.current = null
      engvoApplyingRealtimeSpeedRef.current = null
      engvoSessionUpdateInFlightRef.current = false
      clearEngvoSessionUpdateRetry()
      engvoCommittedResponseIdsRef.current.clear()
      engvoCommittedUserItemIdsRef.current.clear()
      engvoPendingUserItemIdRef.current = null
      engvoAssistantCommittedBeforeUserItemIdsRef.current.clear()
      engvoIgnoredResponseIdsRef.current.clear()
      engvoCallTranslationInflightRef.current.clear()
      engvoPendingTranslationByResponseIdRef.current.clear()
      setEngvoUserInterimText('')
      setEngvoAssistantPendingText('')
      setEngvoCallTranslationPrefetchText(null)
      setLoadingEngvoCallTranslationIndex(null)
    },
    [
      clearEngvoInactivityTimeout,
      clearEngvoMaxCallDurationTimeout,
      clearEngvoSessionUpdateRetry,
      clearEngvoTimeout,
      stopEngvoPlayback,
    ]
  )

  React.useEffect(() => {
    const resumeXaiAudioContext = () => {
      const ctx = engvoXaiAudioContextRef.current
      if (!ctx || ctx.state !== 'suspended') return
      void ctx.resume().catch(() => {})
    }
    document.addEventListener('visibilitychange', resumeXaiAudioContext)
    window.addEventListener('pageshow', resumeXaiAudioContext)
    return () => {
      document.removeEventListener('visibilitychange', resumeXaiAudioContext)
      window.removeEventListener('pageshow', resumeXaiAudioContext)
    }
  }, [])

  const finishEngvoCall = useCallback(() => {
    if (process.env.NODE_ENV !== 'production' && engvoActiveProviderRef.current === 'xai') {
      const drops =
        engvoXaiTransportRef.current?.getUplinkDropCount?.() ?? engvoXaiUplinkDropCountRef.current
      console.info('[engvo] call-end uplink-drops', { drops })
    }
    engvoRedialWithoutWelcomeRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    engvoTeacherPhaseRef.current = resolveEngvoTeacherPhase({ kind: engvoSessionKindRef.current })
    engvoTeacherUserFinalCountRef.current = 0
    engvoTeacherAwaitingFirstDrillRef.current = engvoTeacherPhaseRef.current === 'drill'
    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false
    engvoLastFinalUserTranscriptRef.current = ''
    setEngvoCallPhase('ended')
    setEngvoErrorText(null)
    setEngvoBootstrapServiceStatusVisible(false)
    appendEngvoCallFinishedMessage()
  }, [appendEngvoCallFinishedMessage, cleanupEngvoRuntime])

  const setEngvoSessionError = useCallback(
    (message: string) => {
      cleanupEngvoRuntime({ markIgnoredCurrent: true })
      setMessages((prev) => {
        const base = prev.filter((m) => !m.engvoServiceLine)
        const trimmed = normalizeEngvoRealtimeUserMessage(message)
        if (!trimmed) return base
        const last = base[base.length - 1]
        if (last?.role === 'assistant' && last.content.trim() === trimmed) {
          return base
        }
        return [...base, { role: 'assistant', content: trimmed }]
      })
      setEngvoErrorText(null)
      setEngvoCallPhase('ended')
      setEngvoBootstrapServiceStatusVisible(false)
    },
    [cleanupEngvoRuntime]
  )

  const buildCurrentEngvoSessionBootstrapSnapshot = useCallback((): EngvoSessionBootstrapSnapshot => {
    const provider = engvoActiveProviderRef.current
    return buildEngvoSessionBootstrapSnapshot({
      level: engvoCefrLevel,
      audience: settings.audience,
      topic: settings.topic,
      voice: provider === 'xai' ? engvoXaiVoice : engvoRealtimeVoice,
      speed: clampEngvoRealtimeSpeed(
        engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, provider),
        provider
      ),
      provider,
      kind: engvoSessionKind,
      teacherTense: engvoSessionKind === 'teacher' ? engvoTeacherTense : undefined,
      teacherSentenceType: engvoSessionKind === 'teacher' ? engvoTeacherSentenceType : undefined,
    })
  }, [
    engvoCefrLevel,
    engvoRealtimeVoice,
    engvoSessionKind,
    engvoSpeechSpeedPreset,
    engvoTeacherSentenceType,
    engvoTeacherTense,
    engvoXaiVoice,
    settings.audience,
    settings.topic,
  ])

  const buildEngvoLiveInstructions = useCallback(
    (speechSpeed: number) =>
      buildEngvoRealtimeInstructionsClient({
        audience: settings.audience,
        level: engvoCefrLevel,
        topic: settings.topic,
        speechSpeed,
        kind: engvoSessionKind,
        tense: engvoTeacherTense,
        sentenceType: engvoTeacherSentenceType,
      }),
    [
      engvoCefrLevel,
      engvoSessionKind,
      engvoTeacherSentenceType,
      engvoTeacherTense,
      settings.audience,
      settings.topic,
    ]
  )

  const refreshEngvoSessionBootstrapRef = useCallback(() => {
    engvoSessionBootstrapRef.current = buildCurrentEngvoSessionBootstrapSnapshot()
  }, [buildCurrentEngvoSessionBootstrapSnapshot])

  const sendEngvoRealtimeEvent = useCallback((payload: Record<string, unknown>): boolean => {
    if (engvoActiveProviderRef.current === 'xai') {
      const sent = engvoXaiTransportRef.current?.send(payload) ?? false
      if (sent && payload.type === 'session.update') {
        recordEngvoDebugSessionUpdate(engvoDebugTimingRef.current)
      }
      return sent
    }
    const dataChannel = engvoDataChannelRef.current
    if (!dataChannel || dataChannel.readyState !== 'open') return false
    try {
      dataChannel.send(JSON.stringify(payload))
      if (payload.type === 'session.update') {
        recordEngvoDebugSessionUpdate(engvoDebugTimingRef.current)
      }
      return true
    } catch {
      return false
    }
  }, [])

  const maybeReclaimTeacherDrill = useCallback(
    (rawText: string): boolean => {
      if (engvoSessionKindRef.current !== 'teacher') return false

      const wasReclaimResponse = engvoTeacherReclaimInFlightRef.current
      if (wasReclaimResponse) {
        engvoTeacherReclaimInFlightRef.current = false
      }

      const detectPhase = resolveTeacherDetectPhase({
        phase: engvoTeacherPhaseRef.current,
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
      })
      if (
        detectPhase === 'drill' &&
        engvoTeacherPhaseRef.current !== 'drill' &&
        engvoTeacherAwaitingFirstDrillRef.current
      ) {
        engvoTeacherPhaseRef.current = 'drill'
      }

      const result = isIncompleteTeacherAssistantTurn({
        text: rawText,
        phase: detectPhase,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
      })

      if (result.isCompleteDrill) {
        engvoTeacherAwaitingFirstDrillRef.current = false
      }

      if (!result.incomplete) return false

      if (engvoTeacherUserFinalCountRef.current < 1) {
        console.info('[engvo] teacher-reclaim', {
          skip: 'greeting',
          reason: result.reason,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      const allow = shouldAllowTeacherDrillReclaim({
        userFinalCount: engvoTeacherUserFinalCountRef.current,
        awaitingFirstDrill: engvoTeacherAwaitingFirstDrillRef.current,
        attemptsThisUserTurn: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
        usedThisUserTurn: engvoTeacherReclaimUsedThisUserTurnRef.current,
      })
      if (!allow) {
        console.info('[engvo] teacher-reclaim', {
          skip: engvoTeacherAwaitingFirstDrillRef.current ? 'reclaim_failed' : 'reclaim_budget',
          reason: result.reason,
          attempts: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      engvoTeacherReclaimAttemptsThisUserTurnRef.current += 1
      engvoTeacherReclaimUsedThisUserTurnRef.current = true
      engvoTeacherReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
        engvoListenArmedRef.current = false
        sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            voice: engvoXaiVoice,
            speed: clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'), 'xai'),
            kind: engvoSessionKindRef.current,
            teacherPhase: engvoTeacherPhaseRef.current,
            createResponse: false,
          })
        )
      }
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoTeacherDrillReclaimResponseInstructions({
            level: engvoCefrLevel,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
          }),
        },
      })
      console.info('[engvo] teacher-reclaim', {
        reason: result.reason,
        attempt: engvoTeacherReclaimAttemptsThisUserTurnRef.current,
        preview: rawText.slice(0, 80),
        sent,
      })
      if (!sent) {
        engvoTeacherReclaimInFlightRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [engvoCefrLevel, engvoTeacherSentenceType, engvoTeacherTense, engvoSpeechSpeedPreset, engvoXaiVoice, sendEngvoRealtimeEvent]
  )
  maybeReclaimTeacherDrillRef.current = maybeReclaimTeacherDrill

  const maybeReclaimFreeCallLength = useCallback(
    (rawText: string): boolean => {
      if (engvoSessionKindRef.current !== 'free_call') return false

      const wasReclaimResponse = engvoFreeCallReclaimInFlightRef.current
      if (wasReclaimResponse) {
        engvoFreeCallReclaimInFlightRef.current = false
      }

      const result = isTooLongFreeCallAssistantTurn({
        text: rawText,
        level: engvoCefrLevel,
        userFinalCount: engvoFreeCallUserFinalCountRef.current,
      })
      if (!result.tooLong) return false

      if (wasReclaimResponse || engvoFreeCallReclaimUsedThisUserTurnRef.current) {
        console.info('[engvo] free-reclaim', {
          skip: 'reclaim_budget',
          reason: result.reason,
          preview: rawText.slice(0, 80),
        })
        return false
      }

      engvoFreeCallReclaimUsedThisUserTurnRef.current = true
      engvoFreeCallReclaimInFlightRef.current = true
      if (engvoActiveProviderRef.current === 'xai') {
        engvoListenArmedRef.current = false
        sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            voice: engvoXaiVoice,
            speed: clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'), 'xai'),
            kind: engvoSessionKindRef.current,
            createResponse: false,
          })
        )
      }
      setEngvoCallPhase('assistantPending')
      const sent = sendEngvoRealtimeEvent({
        type: 'response.create',
        response: {
          instructions: buildEngvoFreeCallLengthReclaimResponseInstructions({
            level: engvoCefrLevel,
          }),
        },
      })
      console.info('[engvo] free-reclaim', {
        reason: result.reason,
        preview: rawText.slice(0, 80),
        sent,
      })
      if (!sent) {
        engvoFreeCallReclaimInFlightRef.current = false
        setEngvoCallPhase('listening')
        return false
      }
      return true
    },
    [engvoCefrLevel, engvoSpeechSpeedPreset, engvoXaiVoice, sendEngvoRealtimeEvent]
  )
  maybeReclaimFreeCallLengthRef.current = maybeReclaimFreeCallLength

  const buildCurrentXaiSessionUpdate = useCallback(
    (options?: { createResponse?: boolean; keyterms?: string[] }) => {
      const speechSpeed = clampEngvoRealtimeSpeed(
        engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, 'xai'),
        'xai'
      )
      const createResponse = options?.createResponse ?? engvoListenArmedRef.current
      return buildEngvoXaiClientSessionUpdate({
        voice: engvoXaiVoice,
        speed: speechSpeed,
        kind: engvoSessionKindRef.current,
        teacherPhase: engvoTeacherPhaseRef.current,
        createResponse,
        ...(options?.keyterms && options.keyterms.length > 0
          ? { keyterms: options.keyterms }
          : {}),
      })
    },
    [engvoSpeechSpeedPreset, engvoXaiVoice]
  )

  const armEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoXaiTransportRef.current?.startMicCapture()
    sendEngvoRealtimeEvent({ type: 'input_audio_buffer.clear' })
    const repeat = extractTeacherCallRepeatPrompt(engvoLastAssistantTextForKeytermsRef.current)
    const keyterms =
      engvoSessionKindRef.current === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
        ? buildEngvoTeacherKeyterms({ canonicalEnglish: repeat?.repeatText ?? null })
        : undefined
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: true, keyterms }))
    engvoListenArmedRef.current = true
    console.info('[engvo] listen-armed', { drops: engvoXaiUplinkDropCountRef.current })
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  const disarmEngvoXaiListen = useCallback(() => {
    if (engvoActiveProviderRef.current !== 'xai') return
    engvoListenArmedRef.current = false
    sendEngvoRealtimeEvent(buildCurrentXaiSessionUpdate({ createResponse: false }))
    console.info('[engvo] listen-disarmed')
  }, [buildCurrentXaiSessionUpdate, sendEngvoRealtimeEvent])

  const updateEngvoRealtimeSession = useCallback(
    (payload: {
      voice?: EngvoRealtimeVoice | EngvoXaiCallVoice
      level?: EngvoCefrLevel
      speed?: number
    }): boolean => {
      const provider = engvoActiveProviderRef.current
      const speechSpeed = clampEngvoRealtimeSpeed(
        payload.speed ?? engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset, provider),
        provider
      )
      // Voice/speed-only: omit instructions so OpenAI keeps SDP/server safety text.
      const policyUpdate = payload.level != null
      const instructions = policyUpdate
        ? buildEngvoRealtimeInstructionsClient({
            audience: settings.audience,
            level: payload.level ?? engvoCefrLevel,
            topic: settings.topic,
            speechSpeed,
            kind: engvoSessionKind,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
          })
        : undefined
      if (provider === 'xai') {
        const voice = (payload.voice as EngvoXaiCallVoice | undefined) ?? engvoXaiVoice
        const keyterms =
          engvoSessionKindRef.current === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
            ? buildEngvoTeacherKeyterms({
                canonicalEnglish:
                  extractTeacherCallRepeatPrompt(engvoLastAssistantTextForKeytermsRef.current)
                    ?.repeatText ?? null,
              })
            : undefined
        return sendEngvoRealtimeEvent(
          buildEngvoXaiClientSessionUpdate({
            ...(instructions ? { instructions } : {}),
            voice,
            speed: speechSpeed,
            kind: engvoSessionKindRef.current,
            teacherPhase: engvoTeacherPhaseRef.current,
            createResponse: engvoListenArmedRef.current,
            ...(keyterms && keyterms.length > 0 ? { keyterms } : {}),
          })
        )
      }
      return sendEngvoRealtimeEvent({
        type: 'session.update',
        session: buildEngvoClientSessionUpdate({
          model: ENGVO_REALTIME_MODEL,
          voice: (payload.voice as EngvoRealtimeVoice | undefined) ?? engvoRealtimeVoice,
          speed: speechSpeed,
          ...(instructions ? { instructions } : {}),
          inputAudioTranscription: {
            ...buildEngvoInputAudioTranscriptionConfig(),
            ...(engvoSessionKind === 'teacher' ? {} : { language: 'ru' }),
          },
        }),
      })
    },
    [
      engvoCefrLevel,
      engvoRealtimeVoice,
      engvoSessionKind,
      engvoSpeechSpeedPreset,
      engvoTeacherSentenceType,
      engvoTeacherTense,
      engvoXaiVoice,
      sendEngvoRealtimeEvent,
      settings.audience,
      settings.topic,
    ]
  )

  const isEngvoSafeForSessionUpdate = useCallback(
    (options?: { speedOnly?: boolean }): boolean => {
      if (!engvoVoiceMode) return false
      if (!engvoSessionStartedRef.current) return false
      const speedOnly = options?.speedOnly === true
      if (speedOnly) {
        if (engvoCallPhase !== 'listening' && engvoCallPhase !== 'userFinalizing') return false
      } else if (engvoCallPhase !== 'listening') {
        return false
      }
      if (engvoRemotePlaybackActive) return false
      const dataChannel = engvoDataChannelRef.current
      if (!dataChannel || dataChannel.readyState !== 'open') return false
      const hasActiveAssistantTurn =
        !!engvoAssistantResponseIdRef.current && !engvoAssistantResponseDoneRef.current
      return !hasActiveAssistantTurn
    },
    [engvoCallPhase, engvoRemotePlaybackActive, engvoVoiceMode]
  )

  const flushEngvoPendingRealtimeSessionUpdates = useCallback(() => {
    const pendingVoice = engvoPendingRealtimeVoiceRef.current
    const pendingSpeed = engvoPendingRealtimeSpeedRef.current

    const voiceToSend =
      pendingVoice && pendingVoice !== engvoLastAppliedRealtimeVoiceRef.current ? pendingVoice : undefined
    const speedToSend =
      typeof pendingSpeed === 'number' && pendingSpeed !== engvoLastAppliedRealtimeSpeedRef.current
        ? pendingSpeed
        : undefined

    if (!voiceToSend && typeof speedToSend !== 'number') return

    const speedOnly = !voiceToSend && typeof speedToSend === 'number'
    if (!isEngvoSafeForSessionUpdate({ speedOnly })) {
      scheduleEngvoSessionUpdateRetry()
      return
    }
    if (engvoSessionUpdateInFlightRef.current) {
      scheduleEngvoSessionUpdateRetry()
      return
    }

    const sent = updateEngvoRealtimeSession({
      ...(voiceToSend ? { voice: voiceToSend } : {}),
      ...(typeof speedToSend === 'number' ? { speed: speedToSend } : {}),
    })

    if (!sent) {
      scheduleEngvoSessionUpdateRetry()
      return
    }

    engvoSessionUpdateInFlightRef.current = true
    engvoApplyingRealtimeVoiceRef.current = voiceToSend ?? null
    engvoApplyingRealtimeSpeedRef.current = typeof speedToSend === 'number' ? speedToSend : null
  }, [isEngvoSafeForSessionUpdate, scheduleEngvoSessionUpdateRetry, updateEngvoRealtimeSession])

  const markEngvoSessionUpdateAck = useCallback(() => {
    const appliedVoice = engvoApplyingRealtimeVoiceRef.current
    const appliedSpeed = engvoApplyingRealtimeSpeedRef.current
    engvoSessionUpdateInFlightRef.current = false
    engvoApplyingRealtimeVoiceRef.current = null
    engvoApplyingRealtimeSpeedRef.current = null
    clearEngvoSessionUpdateRetry()

    if (appliedVoice) {
      engvoLastAppliedRealtimeVoiceRef.current = appliedVoice
      if (engvoPendingRealtimeVoiceRef.current === appliedVoice) {
        engvoPendingRealtimeVoiceRef.current = null
      }
    }
    if (typeof appliedSpeed === 'number') {
      engvoLastAppliedRealtimeSpeedRef.current = appliedSpeed
      if (engvoPendingRealtimeSpeedRef.current === appliedSpeed) {
        engvoPendingRealtimeSpeedRef.current = null
      }
    }
  }, [clearEngvoSessionUpdateRetry])

  const isEngvoDeferredSessionUpdateConflict = useCallback((normalizedError: string): boolean => {
    if (!normalizedError.includes('cannot update')) return false
    if (!normalizedError.includes('audio')) return false
    return (
      normalizedError.includes('voice') ||
      normalizedError.includes('speed') ||
      normalizedError.includes('session')
    )
  }, [])

  const handleEngvoRealtimeMessage = useCallback(
    async (raw: string) => {
      if (!raw) return

      let parsed: EngvoRealtimeEvent | null = null
      try {
        parsed = JSON.parse(raw) as EngvoRealtimeEvent
      } catch {
        return
      }
      if (!parsed?.type) return

      if (isEngvoFirstAudioDeltaEvent(parsed.type)) {
        logEngvoDebugFirstAudioDelta(engvoDebugTimingRef.current)
      }

      const responseId = resolveEngvoRealtimeResponseId(parsed)
      if (responseId && engvoIgnoredResponseIdsRef.current.has(responseId)) return
      const activeResponseId = engvoAssistantResponseIdRef.current
      const hasActiveAssistantTurn = !!activeResponseId && !engvoAssistantResponseDoneRef.current

      if (parsed.type === 'error') {
        const errorMessage = parsed.error?.message ?? 'Ошибка Realtime-сессии'
        const normalized = errorMessage.toLowerCase()
        if (normalized.includes('cancellation failed') && normalized.includes('no active response found')) {
          return
        }
        if (normalized.includes('audio content') && normalized.includes('already shorter than')) {
          console.warn('[engvo] ignorable realtime audio duration race', errorMessage)
          resetEngvoAssistantTurn({ markIgnored: true })
          setEngvoCallPhase('listening')
          return
        }
        if (isEngvoDeferredSessionUpdateConflict(normalized)) {
          console.warn('[engvo] deferred session.update conflict, retrying', errorMessage)
          engvoSessionUpdateInFlightRef.current = false
          engvoApplyingRealtimeVoiceRef.current = null
          engvoApplyingRealtimeSpeedRef.current = null
          scheduleEngvoSessionUpdateRetry()
          return
        }
        setEngvoSessionError(normalizeEngvoRealtimeUserMessage(errorMessage))
        return
      }

      if (
        parsed.type === 'session.created' ||
        parsed.type === 'conversation.created' ||
        parsed.type === 'session.updated' ||
        parsed.type === 'session.update.acknowledged'
      ) {
        // xAI: greet ONLY after session.updated (session.created is too early — response.create
        // is ignored and UI hangs on «Engvo говорит…»). OpenAI can greet on session.created.
        // Early xAI events must NOT clear the ack timeout — otherwise dialing hangs forever when
        // session.update never goes out (prod: upstream ack without client_session_update_forwarded).
        const isXaiProvider = engvoActiveProviderRef.current === 'xai'
        const isEarlyXaiAck =
          isXaiProvider &&
          (parsed.type === 'session.created' || parsed.type === 'conversation.created')
        const shouldTriggerGreetingOrReplay = isXaiProvider
          ? parsed.type === 'session.updated' || parsed.type === 'session.update.acknowledged'
          : parsed.type === 'session.created' ||
            parsed.type === 'session.updated' ||
            parsed.type === 'session.update.acknowledged'
        if (!isEarlyXaiAck) {
          markEngvoSessionUpdateAck()
          clearEngvoTimeout(engvoSessionAckTimeoutRef)
          engvoSessionStartedRef.current = true
          setEngvoErrorText(null)
          setEngvoSessionUpdateTick((prev) => prev + 1)
        }
        logEngvoDebugTimingEvent(
          engvoDebugTimingRef.current,
          parsed.type === 'session.created' || parsed.type === 'conversation.created'
            ? 'session.created'
            : parsed.type
        )
        refreshEngvoSessionBootstrapRef()
        console.info('[engvo] session-ack', parsed.type)
        if (shouldTriggerGreetingOrReplay) {
          const replayItems = engvoRealtimeReplayItemsRef.current
          engvoRealtimeReplayItemsRef.current = null

          if (replayItems && replayItems.length > 0) {
            for (const item of replayItems) {
              sendEngvoRealtimeEvent({
                type: 'conversation.item.create',
                item,
              })
            }
            const continuationSent = sendEngvoRealtimeEvent({
              type: 'response.create',
              response: {
                instructions: buildEngvoContinuationResponseInstructions({
                  audience: settings.audience,
                  level: engvoCefrLevel,
                  topic: settings.topic,
                }),
              },
            })
            if (continuationSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              if (isXaiProvider) engvoXaiTransportRef.current?.startMicCapture()
            } else {
              setEngvoCallPhase('listening')
              engvoXaiTransportRef.current?.startMicCapture()
              armEngvoXaiListen()
            }
            setMessages((prev) => prev.filter((m) => !m.engvoServiceLine))
          } else if (!engvoGreetingTriggeredRef.current) {
            // xAI docs: seed a user item, then response.create.
            if (isXaiProvider) {
              sendEngvoRealtimeEvent({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{ type: 'input_text', text: 'Hi' }],
                },
              })
            }
            const greetingSent = sendEngvoRealtimeEvent({
              type: 'response.create',
              response: {
                instructions: buildEngvoFirstTurnResponseInstructions({
                  audience: settings.audience,
                  level: engvoCefrLevel,
                  topic: settings.topic,
                  kind: engvoSessionKind,
                  tense: engvoTeacherTense,
                  sentenceType: engvoTeacherSentenceType,
                }),
              },
            })
            if (greetingSent) {
              engvoGreetingTriggeredRef.current = true
              setEngvoCallPhase('assistantPending')
              if (isXaiProvider) engvoXaiTransportRef.current?.startMicCapture()
              console.info('[engvo] greeting-sent', parsed.type)
            } else {
              setEngvoCallPhase('listening')
              engvoXaiTransportRef.current?.startMicCapture()
              armEngvoXaiListen()
            }
          }
        } else if (
          (parsed.type === 'conversation.created' ||
            (isXaiProvider && parsed.type === 'session.created')) &&
          !engvoGreetingTriggeredRef.current
        ) {
          // Wait for session.updated — keep dialing UI.
          setEngvoCallPhase('connecting')
        } else if (!engvoGreetingTriggeredRef.current) {
          setEngvoCallPhase('listening')
        }

        if (engvoActiveProviderRef.current !== 'xai') {
          // OpenAI uses WebRTC mic tracks already attached.
        } else if (engvoGreetingTriggeredRef.current) {
          // Mic already started early; arm listen on response.done.
        } else if (
          parsed.type !== 'conversation.created' &&
          parsed.type !== 'session.created'
        ) {
          engvoXaiTransportRef.current?.startMicCapture()
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_started') {
        if (engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current) {
          return
        }
        if (engvoTeacherReclaimInFlightRef.current) {
          engvoTeacherReclaimInFlightRef.current = false
        }
        if (engvoFreeCallReclaimInFlightRef.current) {
          engvoFreeCallReclaimInFlightRef.current = false
        }
        const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
          responseId: engvoAssistantResponseIdRef.current,
          responseDone: engvoAssistantResponseDoneRef.current,
        })
        const debounceInterrupt = shouldDebounceEngvoBargeIn({
          callPhase: engvoCallPhase,
          hasActiveAssistantResponse,
        })
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        const interruptMs =
          engvoActiveProviderRef.current === 'xai'
            ? getEngvoXaiInterruptDebounceMs(engvoSessionKindRef.current)
            : ENGVO_INTERRUPT_DEBOUNCE_MS
        if (debounceInterrupt) {
          markEngvoInterruptDebouncePending(engvoInterruptDebounceStateRef.current)
          engvoInterruptDebounceTimeoutRef.current = window.setTimeout(() => {
            engvoInterruptDebounceTimeoutRef.current = null
            markEngvoInterruptCommitted(engvoInterruptDebounceStateRef.current)
            stopEngvoPlayback(true)
            setEngvoCallPhase('listening')
          }, interruptMs)
        } else {
          resetEngvoInterruptDebounceState(engvoInterruptDebounceStateRef.current)
          stopEngvoPlayback(true)
          setEngvoCallPhase('listening')
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_stopped') {
        if (engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current) {
          return
        }
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        if (cancelEngvoPendingInterrupt(engvoInterruptDebounceStateRef.current)) {
          return
        }
        setEngvoCallPhase('userFinalizing')
        return
      }

      if (
        parsed.type === 'input_audio_buffer.committed' ||
        parsed.type === 'conversation.item.input_audio_transcription.delta' ||
        parsed.type === 'conversation.item.input_audio_transcription.updated' ||
        parsed.type === 'conversation.item.input_audio_transcription.completed'
      ) {
        engvoTranscriptStateRef.current = reduceRealtimeTranscriptEvent(
          engvoTranscriptStateRef.current,
          parsed as never
        )
        if (parsed.type === 'input_audio_buffer.committed' && typeof parsed.item_id === 'string') {
          engvoPendingUserItemIdRef.current = parsed.item_id
          const hasActiveAssistantResponseOnCommit = hasActiveEngvoAssistantResponse({
            responseId: engvoAssistantResponseIdRef.current,
            responseDone: engvoAssistantResponseDoneRef.current,
          })
          if (shouldCancelEngvoAssistantOnUserAudioCommitted(hasActiveAssistantResponseOnCommit)) {
            resetEngvoAssistantTurn({ markIgnored: true })
          }
        }
        const transcriptView = getRealtimeTranscriptView(engvoTranscriptStateRef.current)
        setEngvoUserInterimText(transcriptView.interimText)

        if (
          parsed.type === 'conversation.item.input_audio_transcription.completed' &&
          typeof parsed.item_id === 'string'
        ) {
          const itemId = parsed.item_id
          const isXaiUnarmed =
            engvoActiveProviderRef.current === 'xai' && !engvoListenArmedRef.current
          if (isPartialUserTranscriptStatus((parsed as { status?: unknown }).status)) {
            const interim =
              (typeof parsed.transcript === 'string' ? parsed.transcript : '').trim() ||
              transcriptView.interimText
            if (interim) setEngvoUserInterimText(interim)
            return
          }

          const itemFromState = engvoTranscriptStateRef.current.items[itemId]
          const transcript =
            (parsed.transcript ?? '').trim() || itemFromState?.completedText?.trim() || ''

          const isXai = engvoActiveProviderRef.current === 'xai'
          const transcriptKind = engvoSessionKindRef.current === 'teacher' ? 'teacher' : 'free_call'
          if (engvoCommittedUserItemIdsRef.current.has(itemId)) {
            if (transcript) {
              setEngvoUserInterimText('')
              setMessages((prev) =>
                updateLastEngvoUserMessage(prev, transcript, { requireReplaceGate: isXai })
              )
            }
            return
          }

          setEngvoUserInterimText('')
          const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
            responseId: engvoAssistantResponseIdRef.current,
            responseDone: engvoAssistantResponseDoneRef.current,
          })
          const interruptCommitted = engvoInterruptDebounceStateRef.current.committed
          const isLikelyNoise =
            !transcript ||
            (isXai
              ? engvoVoiceTranscriptIsLikelyNoiseForKind(transcript, transcriptKind)
              : engvoVoiceTranscriptIsLikelyNoise(transcript))
          if (
            shouldIgnoreNoiseTranscriptDuringAssistantSpeech({
              isLikelyNoise,
              hasActiveAssistantResponse,
              interruptCommitted,
            })
          ) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            return
          }
          const restorePhaseAfterNoiseReject = (phase: EngvoCallPhase) => {
            if (hasActiveAssistantResponse && !interruptCommitted) return
            setEngvoCallPhase(phase)
          }
          const normalizedTranscript = normalizeForEchoCompare(transcript)
          const normalizedAssistantPending = normalizeForEchoCompare(engvoAssistantPendingText)
          const lastMessage = messages[messages.length - 1]
          const normalizedLastAssistant =
            lastMessage?.role === 'assistant' ? normalizeForEchoCompare(lastMessage.content) : ''
          const looksLikeAssistantEcho =
            !!normalizedTranscript &&
            (isXai
              ? (engvoRemotePlaybackActive ||
                  engvoCallPhase === 'assistantSpeaking' ||
                  engvoCallPhase === 'assistantPending') &&
                (normalizedTranscript === normalizedAssistantPending ||
                  normalizedTranscript === normalizedLastAssistant)
              : normalizedTranscript === normalizedAssistantPending ||
                normalizedTranscript === normalizedLastAssistant)
          if (looksLikeAssistantEcho) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (isLikelyEngvoCallHallucination(transcript)) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (transcript && !shouldShowEngvoVoiceUserTranscript(transcript, isXai ? transcriptKind : 'free_call')) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          if (isXaiUnarmed) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            if (transcript) {
              console.info('[engvo] unarmed-user-bubble', { preview: transcript.slice(0, 80) })
              setEngvoUserInterimText('')
              setMessages((prev) =>
                insertEngvoUserMessage(prev, transcript, false)
              )
            }
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {
            const now = Date.now()
            const isXai = engvoActiveProviderRef.current === 'xai'
            const lastUser = [...messages].reverse().find((m) => m.role === 'user')
            const shouldCoalesce =
              isXai &&
              shouldCoalesceEngvoUserTranscript({
                previousUserText: lastUser?.content ?? null,
                nextUserText: transcript,
                elapsedMsSincePreviousUser: now - engvoLastFinalUserAtRef.current,
                windowMs: ENGVO_XAI_USER_COALESCE_WINDOW_MS,
              })
            if (shouldCoalesce) {
              engvoLastUserCoalescedAtRef.current = now
              engvoLastFinalUserAtRef.current = now
              markEngvoMeaningfulActivity()
              setMessages((prev) => updateLastEngvoUserMessage(prev, transcript, { requireReplaceGate: isXai }))
              if (engvoPendingUserItemIdRef.current === itemId) {
                engvoPendingUserItemIdRef.current = null
              }
              engvoAssistantCommittedBeforeUserItemIdsRef.current.delete(itemId)
            } else {
              engvoLastFinalUserAtRef.current = now
              engvoLastUserCoalescedAtRef.current = 0
              engvoGotAssistantForCurrentUserTurnRef.current = false
              markEngvoMeaningfulActivity()
              setMessages((prev) => {
                const insertBeforeAssistant = shouldInsertEngvoUserBeforeAssistant({
                  assistantCommittedBeforeUser:
                    engvoAssistantCommittedBeforeUserItemIdsRef.current.has(itemId),
                })
                engvoAssistantCommittedBeforeUserItemIdsRef.current.delete(itemId)
                if (engvoPendingUserItemIdRef.current === itemId) {
                  engvoPendingUserItemIdRef.current = null
                }
                return insertEngvoUserMessage(prev, transcript, insertBeforeAssistant)
              })
              bumpEngvoGoal()
              engvoLastFinalUserTranscriptRef.current = transcript
              if (engvoSessionKindRef.current === 'free_call') {
                engvoFreeCallUserFinalCountRef.current += 1
                engvoFreeCallReclaimUsedThisUserTurnRef.current = false
              }
              if (engvoSessionKindRef.current === 'teacher') {
                engvoTeacherUserFinalCountRef.current += 1
                engvoTeacherReclaimUsedThisUserTurnRef.current = false
                engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
                if (
                  engvoTeacherPhaseRef.current === 'topic_choice' &&
                  engvoTeacherUserFinalCountRef.current >= 1
                ) {
                  // After topic naming, next assistant turn is drill; corrections only after that.
                  engvoTeacherPhaseRef.current = 'drill'
                  engvoTeacherAwaitingFirstDrillRef.current = true
                  if (isXai) {
                    const repeat = extractTeacherCallRepeatPrompt(
                      engvoLastAssistantTextForKeytermsRef.current
                    )
                    const keyterms = buildEngvoTeacherKeyterms({
                      canonicalEnglish: repeat?.repeatText ?? null,
                    })
                    sendEngvoRealtimeEvent(
                      buildCurrentXaiSessionUpdate({
                        createResponse: engvoListenArmedRef.current,
                        keyterms,
                      })
                    )
                  }
                }
              }
              // Final coalesced user turn only — never on partials / near-duplicate coalesce.
              if (engvoSessionKindRef.current === 'free_call') {
                scheduleSilentAssess({
                  text: transcript,
                  provider: settings.provider === 'openai' ? 'openai' : 'openrouter',
                  openAiChatPreset: settings.openAiChatPreset,
                  audience: settings.audience,
                  mode: 'engvo',
                  source: 'call',
                  recentAssistantText:
                    [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? null,
                })
              }
            }
          }
          setEngvoCallPhase('assistantPending')
        }
        return
      }

      if (parsed.type === 'response.created') {
        logEngvoDebugTimingEvent(engvoDebugTimingRef.current, 'response.created')
        clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
        const coalescedRecently =
          engvoLastUserCoalescedAtRef.current > 0 &&
          Date.now() - engvoLastUserCoalescedAtRef.current < ENGVO_XAI_USER_COALESCE_WINDOW_MS
        // Cancel only a *second* response after coalesce (active or already committed for this turn).
        // Teacher drill reclaim is an intentional second response.create — never cancel it.
        const reclaimInFlight =
          engvoTeacherReclaimInFlightRef.current || engvoFreeCallReclaimInFlightRef.current
        if (
          !reclaimInFlight &&
          coalescedRecently &&
          responseId &&
          responseId !== engvoAssistantResponseIdRef.current &&
          (hasActiveAssistantTurn || engvoGotAssistantForCurrentUserTurnRef.current)
        ) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          sendEngvoRealtimeEvent({ type: 'response.cancel' })
          return
        }
        if (
          !reclaimInFlight &&
          hasActiveAssistantTurn &&
          responseId &&
          responseId !== activeResponseId
        ) {
          engvoIgnoredResponseIdsRef.current.add(responseId)
          return
        }
        if (hasActiveAssistantTurn && !responseId) {
          return
        }
        if (responseId) {
          engvoAssistantResponseIdRef.current = responseId
          engvoAssistantResponseDoneRef.current = false
          engvoFinalAssistantTextRef.current = ''
          engvoStreamingAssistantIndexRef.current = null
          setEngvoAssistantPendingText('')
        }
        setEngvoCallPhase('assistantPending')
        // xAI mic starts on response.done — opening mic here lets VAD kill greeting audio.
        return
      }

      if (parsed.type === 'response.output_text.delta') {
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) return
        if (typeof parsed.delta === 'string' && parsed.delta.length > 0) {
          setEngvoCallPhase('assistantSpeaking')
          const chunk = parsed.delta
          setEngvoAssistantPendingText((prev) => `${prev}${chunk}`)
        }
        return
      }

      if (parsed.type === 'response.output_text.done') {
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) return
        const finalText = typeof parsed.text === 'string' && parsed.text.trim() ? parsed.text : parsed.delta ?? ''
        if (finalText.trim()) {
          const cleanFinalText = finalText.trim()
          engvoFinalAssistantTextRef.current = cleanFinalText
          setEngvoAssistantPendingText(cleanFinalText)
          prefetchEngvoCallTranslationRef.current(cleanFinalText, responseId)
          clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
          engvoResponseDoneFallbackTimeoutRef.current = window.setTimeout(() => {
            const id = responseId ?? engvoAssistantResponseIdRef.current
            if (id && engvoCommittedResponseIdsRef.current.has(id)) return
            if (engvoAssistantResponseDoneRef.current) return
            const fallbackText = engvoFinalAssistantTextRef.current || cleanFinalText
            if (!fallbackText.trim()) return
            engvoAssistantResponseDoneRef.current = true
            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current &&
              !engvoFreeCallReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDeltaEvent(parsed.type)) {
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) return
        if (typeof parsed.delta === 'string' && parsed.delta.length > 0) {
          setEngvoCallPhase('assistantSpeaking')
          const chunk = parsed.delta
          setEngvoAssistantPendingText((prev) => `${prev}${chunk}`)
        }
        return
      }

      if (isEngvoOutputAudioTranscriptDoneEvent(parsed.type)) {
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) return
        const finalTranscript =
          typeof parsed.transcript === 'string' && parsed.transcript.trim() ? parsed.transcript : ''
        if (finalTranscript) {
          engvoFinalAssistantTextRef.current = finalTranscript
          setEngvoAssistantPendingText(finalTranscript)
          prefetchEngvoCallTranslationRef.current(finalTranscript, responseId)
          clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
          engvoResponseDoneFallbackTimeoutRef.current = window.setTimeout(() => {
            const id = responseId ?? engvoAssistantResponseIdRef.current
            if (id && engvoCommittedResponseIdsRef.current.has(id)) return
            if (engvoAssistantResponseDoneRef.current) return
            const fallbackText = engvoFinalAssistantTextRef.current || finalTranscript
            if (!fallbackText.trim()) return
            engvoAssistantResponseDoneRef.current = true
            commitEngvoAssistantText(fallbackText, id)
            if (
              engvoActiveProviderRef.current === 'xai' &&
              !engvoTeacherReclaimInFlightRef.current &&
              !engvoFreeCallReclaimInFlightRef.current
            ) {
              armEngvoXaiListen()
            }
          }, ENGVO_RESPONSE_DONE_FALLBACK_MS)
        }
        return
      }

      if (parsed.type === 'response.done') {
        clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) {
          return
        }
        if (responseId && !engvoAssistantResponseIdRef.current) {
          engvoAssistantResponseIdRef.current = responseId
        }
        const extracted = extractRealtimeTextFromResponseDone(parsed)
        if (extracted) {
          engvoFinalAssistantTextRef.current = extracted
          setEngvoAssistantPendingText(extracted)
          prefetchEngvoCallTranslationRef.current(extracted, responseId)
        }
        engvoAssistantResponseDoneRef.current = true
        const fallbackText = extracted || engvoFinalAssistantTextRef.current || engvoAssistantPendingText
        const reclaimStarted = commitEngvoAssistantText(fallbackText, responseId)
        if (
          engvoActiveProviderRef.current === 'xai' &&
          !reclaimStarted &&
          !engvoTeacherReclaimInFlightRef.current &&
          !engvoFreeCallReclaimInFlightRef.current
        ) {
          armEngvoXaiListen()
        }
      }
    },
    [
      clearEngvoTimeout,
      markEngvoMeaningfulActivity,
      sendEngvoRealtimeEvent,
      armEngvoXaiListen,
      buildCurrentXaiSessionUpdate,
      commitEngvoAssistantText,
      engvoCefrLevel,
      messages,
      engvoAssistantPendingText,
      resetEngvoAssistantTurn,
      setEngvoSessionError,
      isEngvoDeferredSessionUpdateConflict,
      markEngvoSessionUpdateAck,
      refreshEngvoSessionBootstrapRef,
      bumpEngvoGoal,
      settings.audience,
      settings.topic,
      settings.provider,
      settings.openAiChatPreset,
      scheduleEngvoSessionUpdateRetry,
      stopEngvoPlayback,
      engvoCallPhase,
      engvoRemotePlaybackActive,
    ]
  )

  const startEngvoCall = useCallback(async () => {
    if (!featureFlags.engvoVoiceV1) return
    if (engvoCallPhase === 'connecting' || engvoCallPhase === 'listening' || engvoCallPhase === 'assistantPending' || engvoCallPhase === 'assistantSpeaking' || engvoCallPhase === 'userFinalizing') {
      return
    }

    suppressSettingsChangeBannerRef.current = true
    if (engvoRedialWithoutWelcomeRef.current) {
      engvoRedialWithoutWelcomeRef.current = false
      setMessages([
        { role: 'assistant', content: ENGVO_DIALING_ASSISTANT_TEXT, engvoServiceLine: true },
      ])
    } else {
      setMessages((prev) =>
        prev.filter(
          (m) =>
            !m.engvoServiceLine &&
            !(m.role === 'assistant' && m.content.trim() === ENGVO_CALL_FINISHED_ASSISTANT_TEXT)
        )
      )
    }
    engvoRealtimeReplayItemsRef.current = null

    const presetForCall = resolveEngvoSpeechSpeedPreset({
      audience: settings.audience,
      level: engvoCefrLevel,
    })
    if (presetForCall !== engvoSpeechSpeedPreset) {
      setEngvoSpeechSpeedPreset(presetForCall)
    }

    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    resetStructuredLessonSessionRef.current?.()
    setDialogStarted(true)
    setEngvoVoiceMode(true)
    setEngvoBootstrapServiceStatusVisible(true)
    engvoTeacherPhaseRef.current = resolveEngvoTeacherPhase({ kind: engvoSessionKind })
    engvoTeacherUserFinalCountRef.current = 0
    engvoTeacherAwaitingFirstDrillRef.current = engvoTeacherPhaseRef.current === 'drill'
    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false
    engvoLastFinalUserTranscriptRef.current = ''
    setEngvoCallPhase('connecting')
    setEngvoErrorText(null)
    setRetryMessage(null)
    setLoading(false)
    setSearchingInternet(false)
    setLoadingTranslationIndex(null)
    clearEngvoSessionUpdateRetry()
    engvoSessionUpdateInFlightRef.current = false
    engvoApplyingRealtimeVoiceRef.current = null
    engvoApplyingRealtimeSpeedRef.current = null
    engvoPendingRealtimeVoiceRef.current = null
    engvoPendingRealtimeSpeedRef.current = null
    engvoActiveProviderRef.current = engvoProvider

    let callXaiVoice = engvoXaiVoice
    if (engvoProvider === 'xai' && engvoXaiVoiceRotationMode !== 'none') {
      const picked = pickNextXaiVoice({
        mode: engvoXaiVoiceRotationMode,
        lastVoice: engvoXaiVoice,
        shuffleRemaining: loadEngvoXaiVoiceShuffleRemaining(),
      })
      callXaiVoice = picked.voice
      setEngvoXaiVoice(picked.voice)
      saveEngvoXaiVoice(picked.voice)
      if (engvoXaiVoiceRotationMode === 'shuffle') {
        saveEngvoXaiVoiceShuffleRemaining(picked.shuffleRemaining)
      } else {
        clearEngvoXaiVoiceShuffleRemaining()
      }
    }

    engvoLastAppliedRealtimeVoiceRef.current =
      engvoProvider === 'xai' ? callXaiVoice : engvoRealtimeVoice
    const speechSpeedForCall = engvoSpeechSpeedFromPreset(presetForCall, engvoProvider)
    engvoLastAppliedRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(
      speechSpeedForCall,
      engvoProvider
    )

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      engvoMediaStreamRef.current = mediaStream
      setEngvoLocalAudioStream(mediaStream)
      // Prime shared meter AudioContext in the same gesture (Android/iOS otherwise keep user EQ flat).
      await primeEngvoVoiceMeterAudio()

      if (engvoProvider === 'xai') {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextCtor) {
          throw new Error('Web Audio API недоступен в этом браузере.')
        }
        const audioContext = new AudioContextCtor()
        await audioContext.resume().catch(() => {})
        if (audioContext.state !== 'running') {
          try {
            await audioContext.close()
          } catch {
            // ignore
          }
          throw new Error('Не удалось активировать аудио. Нажмите трубку ещё раз.')
        }
        engvoXaiAudioContextRef.current = audioContext

        const speechSpeed = clampEngvoRealtimeSpeed(speechSpeedForCall, 'xai')
        let xaiTransportMode: EngvoXaiTransportMode = resolveEngvoXaiTransportMode()
        try {
          const modeResponse = await fetch('/api/realtime-session/xai-transport-mode')
          if (modeResponse.ok) {
            const modeData = (await modeResponse.json().catch(() => ({}))) as {
              mode?: EngvoXaiTransportMode
            }
            if (modeData.mode === 'relay' || modeData.mode === 'direct') {
              xaiTransportMode = modeData.mode
            }
          }
        } catch {
          // keep client fallback
        }
        let xaiToken: string | undefined
        if (xaiTransportMode === 'direct') {
          const tokenController = new AbortController()
          const tokenTimeoutId = window.setTimeout(
            () => tokenController.abort(),
            ENGVO_SDP_FETCH_TIMEOUT_MS
          )
          const tokenResponse = await fetch('/api/realtime-session/xai-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audience: settings.audience,
              topic: settings.topic,
              voice: callXaiVoice,
              level: engvoCefrLevel,
              speed: speechSpeed,
            }),
            signal: tokenController.signal,
          }).finally(() => {
            window.clearTimeout(tokenTimeoutId)
          })
          const tokenData = (await tokenResponse.json().catch(() => ({}))) as {
            token?: string
            model?: string
            error?: string
            userMessage?: string
          }
          if (!tokenResponse.ok || !tokenData.token) {
            throw new Error(
              tokenData.userMessage ||
                normalizeEngvoRealtimeUserMessage(tokenData.error ?? '') ||
                'Failed to mint Grok token.'
            )
          }
          xaiToken = tokenData.token
        }
        const transport = connectEngvoXaiRealtime({
          transport: xaiTransportMode,
          token: xaiToken,
          model: ENGVO_XAI_MODEL,
          mediaStream,
          audioContext,
          relayBootstrap: {
            audience: settings.audience,
            level: engvoCefrLevel,
            topic: settings.topic,
            kind: engvoSessionKind,
            tense: engvoTeacherTense,
            sentenceType: engvoTeacherSentenceType,
            speed: speechSpeedForCall,
          },
          handlers: {
            onEvent: (raw) => {
              void handleEngvoRealtimeMessage(raw)
            },
            onOpen: () => {
              markEngvoDebugTimingOrigin(engvoDebugTimingRef.current)
              logEngvoDebugTimingEvent(engvoDebugTimingRef.current, 'ws_open')
              clearEngvoTimeout(engvoPcConnectTimeoutRef)
              const initialKeyterms =
                engvoSessionKind === 'teacher' && engvoTeacherPhaseRef.current === 'drill'
                  ? buildEngvoTeacherKeyterms({ canonicalEnglish: null })
                  : undefined
              const sent = sendEngvoRealtimeEvent(
                buildEngvoXaiClientSessionUpdate({
                  instructions: buildEngvoLiveInstructions(speechSpeed),
                  voice: callXaiVoice,
                  speed: speechSpeed,
                  kind: engvoSessionKind,
                  teacherPhase: engvoTeacherPhaseRef.current,
                  createResponse: false,
                  ...(initialKeyterms && initialKeyterms.length > 0
                    ? { keyterms: initialKeyterms }
                    : {}),
                })
              )
              if (!sent) {
                setEngvoSessionError('Не удалось отправить параметры Grok-сессии.')
                return
              }
              engvoSessionBootstrapRef.current = buildCurrentEngvoSessionBootstrapSnapshot()
              clearEngvoTimeout(engvoSessionAckTimeoutRef)
              if (!engvoSessionStartedRef.current) {
                engvoSessionAckTimeoutRef.current = window.setTimeout(() => {
                  console.warn('[engvo] session-ack-timeout', { transport: xaiTransportMode })
                  setEngvoSessionError(
                    `Grok не подтвердил Realtime-сессию (${xaiTransportMode}). Попробуйте ещё раз.`
                  )
                }, ENGVO_SESSION_ACK_TIMEOUT_MS)
              }
            },
            onUplinkDrop: (n) => {
              engvoXaiUplinkDropCountRef.current = n
            },
            onError: () => {
              setEngvoSessionError(ENGVO_XAI_WS_USER_MESSAGE)
            },
            onPlaybackActiveChange: (active) => {
              setEngvoRemotePlaybackActive(active)
              if (active) setEngvoCallPhase('assistantSpeaking')
            },
            onRemoteStream: (stream) => {
              setEngvoRemoteAudioStream(stream)
            },
          },
        })
        engvoXaiTransportRef.current = transport
        // Early mic while create_response stays false until arm on response.done.
        transport.startMicCapture()
        clearEngvoTimeout(engvoPcConnectTimeoutRef)
        engvoPcConnectTimeoutRef.current = window.setTimeout(() => {
          setEngvoSessionError(ENGVO_XAI_WS_USER_MESSAGE)
        }, ENGVO_CONNECTION_TIMEOUT_MS)
        return
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      const dataChannel = peerConnection.createDataChannel('oai-events')
      const remoteAudioEl = document.createElement('audio')
      remoteAudioEl.autoplay = true

      engvoPeerConnectionRef.current = peerConnection
      engvoDataChannelRef.current = dataChannel
      engvoRemoteAudioElRef.current = remoteAudioEl
      engvoGreetingTriggeredRef.current = false

      for (const track of mediaStream.getTracks()) {
        peerConnection.addTrack(track, mediaStream)
      }

      peerConnection.ontrack = (event) => {
        const stream = event.streams[0]
        if (stream) {
          setEngvoRemoteAudioStream(stream)
          remoteAudioEl.srcObject = stream
          void remoteAudioEl.play().catch(() => {})
          console.info('[engvo] track-received')
        }
      }

      remoteAudioEl.onplaying = () => {
        setEngvoRemotePlaybackActive(true)
        setEngvoCallPhase('assistantSpeaking')
      }
      remoteAudioEl.onpause = () => {
        setEngvoRemotePlaybackActive(false)
      }
      remoteAudioEl.onended = () => {
        setEngvoRemotePlaybackActive(false)
        maybeCommitEngvoAssistantMessage()
      }
      remoteAudioEl.onemptied = () => {
        setEngvoRemotePlaybackActive(false)
      }

      peerConnection.oniceconnectionstatechange = () => {
        console.info('[engvo] ice-state', peerConnection.iceConnectionState)
      }

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.info('[engvo] pc-state', state)
        if (state === 'connected') {
          clearEngvoTimeout(engvoPcConnectTimeoutRef)
          clearEngvoTimeout(engvoDisconnectTimeoutRef)
          if (dataChannel.readyState !== 'open' && engvoDcOpenTimeoutRef.current === null) {
            engvoDcOpenTimeoutRef.current = window.setTimeout(() => {
              setEngvoSessionError('Канал управления Realtime не открылся. Проверьте сеть/VPN.')
            }, ENGVO_SESSION_ACK_TIMEOUT_MS)
          }
        } else if (state === 'disconnected') {
          clearEngvoTimeout(engvoDisconnectTimeoutRef)
          engvoDisconnectTimeoutRef.current = window.setTimeout(() => {
            setEngvoSessionError('Соединение Engvo прервалось. Попробуйте снова.')
          }, 5_000)
        } else if (state === 'failed' || state === 'closed') {
          setEngvoSessionError('Не удалось установить медиа-соединение. Проверьте сеть/VPN.')
        }
      }

      dataChannel.onopen = () => {
        markEngvoDebugTimingOrigin(engvoDebugTimingRef.current)
        logEngvoDebugTimingEvent(engvoDebugTimingRef.current, 'dc_open')
        clearEngvoTimeout(engvoDcOpenTimeoutRef)
        console.info('[engvo] dc-open')
        const speechSpeed = clampEngvoRealtimeSpeed(speechSpeedForCall, 'openai')
        const sent = sendEngvoRealtimeEvent({
          type: 'session.update',
          session: buildEngvoClientSessionUpdate({
            model: ENGVO_REALTIME_MODEL,
            voice: engvoRealtimeVoice,
            speed: speechSpeed,
            instructions: buildEngvoLiveInstructions(speechSpeed),
            inputAudioTranscription: {
              ...buildEngvoInputAudioTranscriptionConfig(),
              ...(engvoSessionKind === 'teacher' ? {} : { language: 'ru' }),
            },
          }),
        })
        if (!sent) {
          setEngvoSessionError('Не удалось отправить параметры Realtime-сессии.')
          return
        }
        engvoSessionBootstrapRef.current = buildCurrentEngvoSessionBootstrapSnapshot()
        clearEngvoTimeout(engvoSessionAckTimeoutRef)
        engvoSessionAckTimeoutRef.current = window.setTimeout(() => {
          setEngvoSessionError('OpenAI не подтвердил Realtime-сессию. Проверьте сеть/VPN.')
        }, ENGVO_SESSION_ACK_TIMEOUT_MS)
      }

      dataChannel.onmessage = (event) => {
        void handleEngvoRealtimeMessage(typeof event.data === 'string' ? event.data : '')
      }
      dataChannel.onerror = () => {
        console.error('[engvo] data-channel-error', { readyState: dataChannel.readyState })
      }
      dataChannel.onclose = () => {
        console.warn('[engvo] data-channel-closed')
      }

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      console.info('[engvo] offer-created')

      const localSdp = peerConnection.localDescription?.sdp
      if (!localSdp) {
        throw new Error('Не удалось подготовить SDP offer.')
      }

      const sdpController = new AbortController()
      const sdpTimeoutId = window.setTimeout(() => sdpController.abort(), ENGVO_SDP_FETCH_TIMEOUT_MS)
      const sessionResponse = await fetch('/api/realtime-session/sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: localSdp,
          audience: settings.audience,
          topic: settings.topic,
          voice: engvoRealtimeVoice,
          level: engvoCefrLevel,
          speed: clampEngvoRealtimeSpeed(speechSpeedForCall, 'openai'),
          kind: engvoSessionKind,
          tense: engvoTeacherTense,
          sentenceType: engvoTeacherSentenceType,
        }),
        signal: sdpController.signal,
      }).finally(() => {
        window.clearTimeout(sdpTimeoutId)
      })

      const sessionData = (await sessionResponse.json().catch(() => ({}))) as {
        sdp?: string
        error?: string
        userMessage?: string
        diagnostics?: { openAiStatus?: number }
      }
      if (!sessionResponse.ok || !sessionData.sdp) {
        const fallback =
          sessionData.userMessage ??
          normalizeEngvoRealtimeUserMessage(
            sessionData.error ?? '',
            sessionData.diagnostics?.openAiStatus ?? sessionResponse.status
          )
        throw new Error(fallback || 'Не удалось получить SDP answer от сервера.')
      }
      console.info('[engvo] sdp-answer-received')
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: sessionData.sdp,
      })

      clearEngvoTimeout(engvoPcConnectTimeoutRef)
      engvoPcConnectTimeoutRef.current = window.setTimeout(() => {
        setEngvoSessionError('Не удалось установить медиа-соединение. Проверьте сеть/VPN.')
      }, ENGVO_CONNECTION_TIMEOUT_MS)
    } catch (error) {
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
        setEngvoSessionError('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.')
        return
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        setEngvoSessionError('Не удалось получить ответ от сервера. Проверьте сеть/VPN.')
        return
      }
      setEngvoSessionError(
        normalizeEngvoRealtimeUserMessage(
          error instanceof Error ? error.message : 'Не удалось начать звонок Engvo'
        )
      )
    } finally {
      suppressSettingsChangeBannerRef.current = false
    }
  }, [
    clearEngvoTimeout,
    cleanupEngvoRuntime,
    engvoCallPhase,
    engvoCefrLevel,
    engvoProvider,
    engvoRealtimeVoice,
    engvoSpeechSpeedPreset,
    engvoXaiVoice,
    engvoXaiVoiceRotationMode,
    handleEngvoRealtimeMessage,
    maybeCommitEngvoAssistantMessage,
    sendEngvoRealtimeEvent,
    clearEngvoSessionUpdateRetry,
    setEngvoSessionError,
    settings.audience,
    settings.topic,
  ])

  const hangUpEngvoCall = useCallback(() => {
    finishEngvoCall()
  }, [finishEngvoCall])

  useEffect(() => {
    if (engvoCallPhase === 'listening' && engvoCallStartedAt === null) {
      const startedAt = Date.now()
      setEngvoCallStartedAt(startedAt)
      markEngvoMeaningfulActivity()
      clearEngvoMaxCallDurationTimeout()
      engvoMaxCallDurationTimeoutRef.current = window.setTimeout(() => {
        engvoMaxCallDurationTimeoutRef.current = null
        finishEngvoCall()
      }, ENGVO_MAX_CALL_DURATION_MS)
    }
  }, [
    clearEngvoMaxCallDurationTimeout,
    engvoCallPhase,
    engvoCallStartedAt,
    finishEngvoCall,
    markEngvoMeaningfulActivity,
  ])

  useEffect(() => {
    if (!engvoVoiceMode || engvoCallStartedAt === null) {
      clearEngvoInactivityTimeout()
      return
    }
    if (engvoCallPhase === 'assistantPending' || engvoCallPhase === 'assistantSpeaking') {
      clearEngvoInactivityTimeout()
      return
    }
    if (
      engvoCallPhase !== 'listening' &&
      engvoCallPhase !== 'userFinalizing' &&
      engvoCallPhase !== 'connecting'
    ) {
      clearEngvoInactivityTimeout()
      return
    }
    const tick = () => {
      const last = engvoLastMeaningfulActivityAtRef.current || engvoCallStartedAt
      if (Date.now() - last >= ENGVO_INACTIVITY_HANGUP_MS) {
        finishEngvoCall()
      }
    }
    clearEngvoInactivityTimeout()
    engvoInactivityTimeoutRef.current = window.setInterval(tick, 1_000) as unknown as number
    tick()
    return clearEngvoInactivityTimeout
  }, [
    clearEngvoInactivityTimeout,
    engvoCallPhase,
    engvoCallStartedAt,
    engvoVoiceMode,
    finishEngvoCall,
  ])

  useEffect(() => {
    if (!engvoVoiceMode) {
      setEngvoBootstrapServiceStatusVisible(false)
    }
  }, [engvoVoiceMode])

  const handleEngvoProviderChange = useCallback(
    (provider: EngvoProvider) => {
      setEngvoProvider(provider)
      saveEngvoProvider(provider)
      // Mid-call provider switch is deferred: prefs only; transport stays until next call.
    },
    []
  )

  const handleEngvoVoiceChange = useCallback(
    (voice: EngvoRealtimeVoice) => {
      setEngvoRealtimeVoice(voice)
      saveEngvoRealtimeVoice(voice)
      if (engvoVoiceMode && engvoActiveProviderRef.current === 'openai') {
        engvoPendingRealtimeVoiceRef.current = voice
        setEngvoSessionUpdateTick((prev) => prev + 1)
      }
    },
    [engvoVoiceMode]
  )

  const handleEngvoXaiVoiceChange = useCallback(
    (voice: EngvoXaiCallVoice) => {
      setEngvoXaiVoice(voice)
      saveEngvoXaiVoice(voice)
      setEngvoXaiVoiceRotationMode('none')
      saveEngvoXaiVoiceRotationMode('none')
      clearEngvoXaiVoiceShuffleRemaining()
      if (engvoVoiceMode && engvoActiveProviderRef.current === 'xai') {
        engvoPendingRealtimeVoiceRef.current = voice
        setEngvoSessionUpdateTick((prev) => prev + 1)
      }
    },
    [engvoVoiceMode]
  )

  const handleEngvoXaiVoiceRotationModeChange = useCallback(
    (mode: EngvoXaiVoiceRotationMode) => {
      setEngvoXaiVoiceRotationMode(mode)
      saveEngvoXaiVoiceRotationMode(mode)
      if (mode !== 'shuffle') {
        clearEngvoXaiVoiceShuffleRemaining()
      }
      if (mode !== 'none') {
        const fallback = ensureBuiltInXaiVoiceForRotation(engvoXaiVoice)
        if (fallback) {
          setEngvoXaiVoice(fallback)
          saveEngvoXaiVoice(fallback)
        }
      }
    },
    [engvoXaiVoice]
  )

  const handleEngvoLevelChange = useCallback(
    (level: EngvoCefrLevel) => {
      setEngvoCefrLevel(level)
      if (!loadEngvoSpeechSpeedPreset()) {
        const nextPreset = getEngvoDefaultSpeechSpeedPreset(settings.audience, level)
        setEngvoSpeechSpeedPreset(nextPreset)
        if (engvoVoiceMode) {
          engvoPendingRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(
            engvoSpeechSpeedFromPreset(nextPreset, engvoActiveProviderRef.current),
            engvoActiveProviderRef.current
          )
          setEngvoSessionUpdateTick((prev) => prev + 1)
        }
      }
      if (engvoVoiceMode) {
        updateEngvoRealtimeSession({ level })
      }
    },
    [engvoVoiceMode, settings.audience, updateEngvoRealtimeSession]
  )

  const handleEngvoSpeechSpeedChange = useCallback(
    (preset: EngvoSpeechSpeedPresetId) => {
      setEngvoSpeechSpeedPreset(preset)
      saveEngvoSpeechSpeedPreset(preset)
      if (engvoVoiceMode) {
        engvoPendingRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(
          engvoSpeechSpeedFromPreset(preset, engvoActiveProviderRef.current),
          engvoActiveProviderRef.current
        )
        setEngvoSessionUpdateTick((prev) => prev + 1)
      }
    },
    [engvoVoiceMode]
  )

  const handleEngvoSessionKindChange = useCallback((kind: EngvoVoiceSessionKind) => {
    setEngvoSessionKind(kind)
    saveEngvoSessionKind(kind)
    engvoSessionKindRef.current = kind
    engvoTeacherPhaseRef.current = resolveEngvoTeacherPhase({ kind })
    engvoTeacherUserFinalCountRef.current = 0
    engvoTeacherAwaitingFirstDrillRef.current = engvoTeacherPhaseRef.current === 'drill'
    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false
  }, [])

  const handleEngvoTeacherTenseChange = useCallback(
    (tense: TenseId) => {
      const next = sanitizeEngvoTeacherTenseForAudience(tense, settings.audience)
      setEngvoTeacherTense(next)
      saveEngvoTeacherTense(next)
    },
    [settings.audience]
  )

  const handleEngvoTeacherSentenceTypeChange = useCallback((sentenceType: SentenceType) => {
    setEngvoTeacherSentenceType(sentenceType)
    saveEngvoTeacherSentenceType(sentenceType)
  }, [])

  const handlePracticeTtsSpeedDefaultChange = useCallback((index: number) => {
    setPracticeTtsSpeedDefaultIndex(index)
    savePracticeTtsSpeedDefaultIndex(index)
  }, [])

  const handleChatPatternChange = useCallback((id: ChatPatternId) => {
    setChatPatternId(id)
    saveChatPattern(id)
    applyChatPatternState(id, chatPatternTuningMapRef.current)
  }, [])

  const handleChatPatternTuningChange = useCallback(
    (id: TunableChatPatternId, patch: Partial<ChatPatternTuning>) => {
      setChatPatternTuningMap((prev) => {
        const resolved = resolveChatPatternTuning(prev, id)
        const nextTuning = normalizeChatPatternTuning(
          { ...resolved, ...patch },
          getDefaultChatPatternTuning(id)
        )
        const next: ChatPatternTuningMap = { ...prev, [id]: nextTuning }
        saveChatPatternTuningMap(next)
        if (chatPatternId === id) {
          applyChatPatternState(id, next)
        }
        return next
      })
    },
    [chatPatternId]
  )

  const handleChatPatternTuningReset = useCallback(
    (id: TunableChatPatternId) => {
      setChatPatternTuningMap((prev) => {
        const next = { ...prev }
        delete next[id]
        saveChatPatternTuningMap(next)
        if (chatPatternId === id) {
          applyChatPatternState(id, next)
        }
        return next
      })
    },
    [chatPatternId]
  )

  const defaultTtsSpeechRate = React.useMemo(
    () => getPracticeTtsRateByIndex(practiceTtsSpeedDefaultIndex),
    [practiceTtsSpeedDefaultIndex]
  )

  useEffect(() => {
    if (!engvoVoiceMode || !engvoSessionStartedRef.current) return
    const next = buildCurrentEngvoSessionBootstrapSnapshot()
    if (isEngvoSessionBootstrapRedundantUpdate(engvoSessionBootstrapRef.current, next)) return
    updateEngvoRealtimeSession({ level: engvoCefrLevel })
  }, [
    engvoVoiceMode,
    engvoCefrLevel,
    settings.audience,
    settings.topic,
    buildCurrentEngvoSessionBootstrapSnapshot,
    updateEngvoRealtimeSession,
  ])

  useEffect(() => {
    if (!engvoVoiceMode) return
    flushEngvoPendingRealtimeSessionUpdates()
  }, [
    engvoVoiceMode,
    engvoCallPhase,
    engvoRemotePlaybackActive,
    engvoSessionUpdateTick,
    flushEngvoPendingRealtimeSessionUpdates,
  ])

  function getCommunicationInputExpectedFromText(
    text: string,
    current: Settings['communicationInputExpectedLang'],
    voiceInputMode?: CommunicationVoiceInputMode
  ) {
    const hasCyr = /[А-Яа-яЁё]/.test(text)
    const hasLat = /[A-Za-z]/.test(text)
    // В режиме Mix смешанный ввод трактуем как попытку говорить по-английски с русскими вставками.
    if (voiceInputMode === 'mix' && hasCyr && hasLat) return 'en'
    return detectCommunicationUserMessageLang(text, current) as Settings['communicationInputExpectedLang']
  }

  function isRetryableError(message: string): boolean {
    return (
      message.startsWith('Превышен лимит') ||
      message.startsWith('Модель вернула пустой ответ') ||
      message.startsWith('ИИ не отвечает') ||
      message.startsWith('Ответ занял слишком много времени') ||
      message.startsWith('Загрузка занимает слишком много времени') ||
      message.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
      message.startsWith('Сейчас ИИ недоступен') ||
      message.startsWith('Нет связи с сервером')
    )
  }

  const sendToApi = useCallback(
    async (
      apiMessages: ChatMessage[],
      options?: { onRetryStatus?: (message: string | null) => void }
    ): Promise<{
      content: string
      dialogueCorrect: boolean
      webSearchSources?: ChatMessage['webSearchSources']
      webSearchSourcesRequested?: boolean
      webSearchSourcesHiddenCount?: number
      webSearchTriggered?: boolean
    }> => {
      const onRetryStatus = options?.onRetryStatus
      let lastError: Error | null = null
      const isFirstDialogueFreeTalkTurn =
        settings.mode === 'dialogue' && apiMessages.length === 0 && settings.topic === 'free_talk'
      const freeTalkTopicSelection = isFirstDialogueFreeTalkTurn
        ? pickFreeTalkTopicSuggestions({
            audience: settings.audience,
            state: loadFreeTalkTopicRotationState(),
          })
        : null
      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
          try {
            // Полный снимок урока на каждый запрос (без серверной сессии): tenses, sentenceType, topic, level и т.д.
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: apiMessages.map((m) => ({
                  role: m.role,
                  content:
                    m.role === 'assistant' && settings.mode !== 'translation'
                      ? stripHiddenAssistantPayloadLines(m.content)
                      : m.content,
                  ...(m.role === 'assistant' && m.webSearchTriggered ? { webSearchTriggered: true } : {}),
                  ...(m.role === 'assistant' && Array.isArray(m.webSearchSources) && m.webSearchSources.length > 0
                    ? {
                        webSearchSources: m.webSearchSources
                          .slice(0, 10)
                          .map((s) => ({
                            url: typeof s.url === 'string' ? s.url : '',
                            ...(typeof s.title === 'string' ? { title: s.title } : {}),
                          }))
                          .filter((s) => s.url),
                      }
                    : {}),
                })),
                provider: settings.provider,
                openAiChatPreset: settings.openAiChatPreset,
                topic: settings.mode === 'communication' ? 'free_talk' : settings.topic,
                level: settings.level,
                tenses: settings.tenses,
                mode: settings.mode,
                sentenceType: settings.sentenceType,
                audience: settings.audience,
                dialogSeed: dialogSeedRef.current,
                ...(freeTalkTopicSelection ? { freeTalkTopicSuggestions: freeTalkTopicSelection.topics } : {}),
                ...(settings.mode === 'communication'
                  ? {
                      communicationInputExpectedLang:
                        communicationInputExpectedLangRef.current === 'en' ||
                        communicationInputExpectedLangRef.current === 'ru'
                          ? communicationInputExpectedLangRef.current
                          : 'ru',
                      communicationVoiceInputMode:
                        communicationVoiceInputMode === 'ru' ||
                        communicationVoiceInputMode === 'en' ||
                        communicationVoiceInputMode === 'mix'
                          ? communicationVoiceInputMode
                          : 'en',
                    }
                  : {}),
              }),
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
            let data: {
              content?: string
              error?: string
              errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
              provider?: 'openrouter' | 'openai'
              dialogueCorrect?: boolean
              webSearchSources?: ChatMessage['webSearchSources']
              webSearchSourcesRequested?: boolean
              webSearchSourcesHiddenCount?: number
              webSearchTriggered?: boolean
            }
            try {
              data = (await res.json()) as {
                content?: string
                error?: string
                errorCode?: 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error'
                provider?: 'openrouter' | 'openai'
                dialogueCorrect?: boolean
                webSearchSources?: ChatMessage['webSearchSources']
                webSearchSourcesRequested?: boolean
                webSearchSourcesHiddenCount?: number
                webSearchTriggered?: boolean
              }
            } catch {
              throw new Error(res.ok ? 'Неверный ответ сервера.' : `Ошибка ${res.status}: ${res.statusText}`)
            }
            const text = (data.content ?? '').trim()
            const dialogueCorrect = Boolean(data.dialogueCorrect)
            if (!res.ok) {
              const errMsg = data.error || res.statusText
              const errorCode = data.errorCode
              const providerFromServer = data.provider ?? settings.provider

              // 429: ретраим только для OpenRouter (как было), для OpenAI - без ретраев.
              if (
                errorCode === 'rate_limit' &&
                providerFromServer === 'openrouter' &&
                attempt < MAX_ATTEMPTS - 1
              ) {
                lastError = new Error(errMsg)
                onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
                await sleep(150)
                const backoffMs = RETRY_DELAY_RATE_LIMIT_BASE_MS * Math.pow(2, attempt)
                await sleep(Math.min(RETRY_DELAY_RATE_LIMIT_MS, backoffMs))
                continue
              }

              throw new Error(errMsg)
            }
            if (data.error && !text) {
              throw new Error(data.error)
            }
            if (text) {
              if (freeTalkTopicSelection) {
                saveFreeTalkTopicRotationState(freeTalkTopicSelection.nextState)
              }
              return {
                content: text,
                dialogueCorrect,
                webSearchSources: data.webSearchSources,
                webSearchSourcesRequested: data.webSearchSourcesRequested,
                webSearchSourcesHiddenCount: data.webSearchSourcesHiddenCount,
                webSearchTriggered: data.webSearchTriggered,
              }
            }
            lastError = new Error(EMPTY_RESPONSE_FALLBACK)
            const canRetryEmpty =
              attempt < MAX_ATTEMPTS - 1 && isRetryableError(lastError.message)
            if (!canRetryEmpty) throw lastError
            onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
            await sleep(150)
            await sleep(lastError.message.startsWith('Превышен лимит') ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS)
            continue
          } catch (e) {
            clearTimeout(timeoutId)
            const err =
              e instanceof Error
                ? e
                : new Error(typeof e === 'string' ? e : 'Unknown error')
            if (err.name === 'AbortError') {
              lastError = new Error('Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.')
            } else if (
              err.name === 'TypeError' ||
              err.message === 'Failed to fetch' ||
              /^fetch\s*failed$/i.test(err.message)
            ) {
              lastError = new Error('Нет связи с сервером. Проверьте интернет и ключ в меню.')
            } else {
              lastError = err
            }
            const canRetry =
              attempt < MAX_ATTEMPTS - 1 && isRetryableError(lastError.message)
            if (!canRetry) throw lastError
            onRetryStatus?.(RETRY_MESSAGES[attempt] ?? RETRY_MESSAGES[0])
            await sleep(150)
            const delayMs = lastError.message.startsWith('Превышен лимит') ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
            await sleep(delayMs)
          }
        }
        throw lastError ?? new Error('Не удалось получить ответ.')
      } finally {
        onRetryStatus?.(null)
      }
    },
    [settings, communicationVoiceInputMode]
  )

  const isErrorMessage = useCallback((content: string) => {
    return (
      content === ERROR_FIRST_MESSAGE ||
      content.startsWith('ИИ не отвечает') ||
      content.startsWith('Модель вернула некорректный ответ') ||
      content.startsWith('Модель вернула пустой ответ') ||
      content.startsWith('Диалог слишком длинный') ||
      content.startsWith('Ответ занял слишком много времени') ||
      content.startsWith('Загрузка занимает слишком много времени') ||
      content.startsWith('Не удалось получить ответ') ||
      content.includes('OPENROUTER_API_KEY') ||
      content.startsWith('Неверный ключ') ||
      content.startsWith('Превышен лимит') ||
      content.startsWith('Сервис ИИ временно') ||
      content.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»') ||
      content.startsWith('Слишком много запросов к ИИ') ||
      content.startsWith('Сейчас ИИ недоступен')
    )
  }, [])

  const lastMessageIsError =
    messages.length >= 1 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    isErrorMessage(messages[messages.length - 1].content)

  const retryLastMessage = useCallback(async () => {
    // Если это самый первый экран и вместо первого вопроса пришла ошибка
    // «Слишком много запросов к ИИ…», то «Повторить» должен запустить
    // новый диалог без старого контекста.
    if (
      messages.length === 1 &&
      messages[0]?.role === 'assistant' &&
      messages[0].content.startsWith('Слишком много запросов к ИИ')
    ) {
      newDialogRef.current = true
      setMessages([])
      setSettingsAtLastSend(null)
      setTimeout(() => {
        void ensureFirstMessageRef.current?.()
      }, 50)
      return
    }

    const toSend = messages.slice(0, -1)
    setMessages(toSend)
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi(toSend, { onRetryStatus: setRetryMessage })
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(response.content)
      setMessages((prev) => [...prev, { role: 'assistant', content: main, translation, dialogueCorrect: response.dialogueCorrect }])
      const lastUser = [...toSend].reverse().find((m) => m.role === 'user')
      if (lastUser?.content) {
        recordAssistantTurnLearningSignal({
          mode: settings.mode,
          engvoVoiceMode,
          tenses: settings.tenses,
          topic: settings.topic,
          lastUserText: lastUser.content,
          assistantContent: main,
          dialogueCorrect: response.dialogueCorrect,
        })
      }
      void fetchUsage()
    } catch (e) {
      console.error(e)
      const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
      if (
        errText.startsWith('Диалог слишком длинный') ||
        errText.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»')
      ) {
        // Если диалог перерос лимит или модель перегружена, автоматически
        // начинаем новый диалог и запрашиваем первый вопрос, но остаёмся
        // в экране диалога (без возврата к стартовому меню).
        newDialogRef.current = true
        setMessages([])
        setSettingsAtLastSend(null)
        setTimeout(() => {
          void ensureFirstMessageRef.current?.()
        }, 50)
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
      }
    } finally {
      setLoading(false)
      setRetryMessage(null)
    }
  }, [messages, sendToApi, fetchUsage, settings.mode, settings.tenses, settings.topic, engvoVoiceMode])

  const ensureFirstMessage = useCallback(async () => {
    if (firstMessageInFlightRef.current) return
    firstMessageInFlightRef.current = true
    const requestId = ++firstMessageRequestIdRef.current
    const isNewDialog = newDialogRef.current
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const firstContent = (response.content ?? '').trim() || EMPTY_RESPONSE_FALLBACK
      const { content: main, translation } = parseContentWithTranslation(firstContent)
      setMessages([
        {
          role: 'assistant',
          content: main,
          translation,
          dialogueCorrect: response.dialogueCorrect,
          webSearchSources: response.webSearchSources,
          webSearchSourcesRequested: response.webSearchSourcesRequested,
          webSearchSourcesHiddenCount: response.webSearchSourcesHiddenCount,
          webSearchTriggered: response.webSearchTriggered,
        },
      ])
      // Базовая "точка отсчёта" для баннера «Настройки изменены».
      // Иначе при смене темы/времени после первого вопроса (до первой отправки пользователя)
      // нечего сравнивать и предупреждение не показывается.
      setSettingsAtLastSend(settings)
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
      void fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
      setDialogStarted(true)
      if (isNewDialog) newDialogRef.current = false
    } finally {
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = false
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
    }
  }, [sendToApi, fetchUsage, settings])
  ensureFirstMessageRef.current = ensureFirstMessage

  const resetStructuredLessonSession = useCallback((options?: { keepLessonMenuContext?: boolean }) => {
    finalizeLessonCycle1OnLeaveRef.current()
    menuLessonGenerateCleanupRef.current?.()
    menuLessonBgFetchEpochRef.current += 1
    setStructuredLessonVariantRegenerating(false)
    resetVariantPrepareRef.current()
    lessonOpenRequestIdRef.current += 1
    abandonPracticeSession()
    setAccentTrainerActive(false)
    setActiveAccentLessonId(null)
    setAccentLessonRequestKey((value) => value + 1)
    setAccentFooterView(null)
    setVocabularyWorldsActive(false)
    setVocabularyByLevelActive(false)
    setVocabularyFooterView(null)
    setAdaptiveFooterView(null)
    if (!options?.keepLessonMenuContext) {
      setLessonMenuContext(null)
    }
    setActiveLearningLessonId(null)
    setActiveStructuredLessonRuntime(null)
    setStructuredLessonLoadingId(null)
    setMenuLessonBgError(null)
    setPendingTutorLessonTitle(null)
    setActiveLessonVariantNumber(1)
    setSelectedPostLessonAction(null)
    setPostLessonBusy(false)
    setLessonOverlay(null)
    setLessonReturnBriefingAckRunKey(null)
    setLessonViewStage('intro')
    setLessonTipsReturnStage('intro')
    setLessonIntroDepth('quick')
    setLessonIntroRevealSession(0)
    setLessonExtraTipsStatus('idle')
    setLessonExtraTipsState(null)
    lessonFirstAnswerTrackedRef.current = false
    lessonCycle1ActiveSessionRef.current = false
  }, [abandonPracticeSession])
  resetStructuredLessonSessionRef.current = resetStructuredLessonSession

  const restartChatForNewModeFromMenu = useCallback(() => {
    suppressSettingsChangeBannerRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = true
    setMessages([])
    setSettingsAtLastSend(null)
    setTimeout(() => {
      ensureFirstMessage()
    }, 50)
  }, [cleanupEngvoRuntime, ensureFirstMessage, resetStructuredLessonSession])

  const handleStartChatFromMenu = useCallback(() => {
    setComposerSessionKey((k) => k + 1)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    if (!dialogStarted) {
      resetStructuredLessonSession()
      setDialogStarted(true)
      setMenuOpen(false)
      return
    }
    resetStructuredLessonSession()
    restartChatForNewModeFromMenu()
    setMenuOpen(false)
  }, [cleanupEngvoRuntime, dialogStarted, restartChatForNewModeFromMenu, resetStructuredLessonSession])

  const handleStartChatFromHome = useCallback(() => {
    setComposerSessionKey((k) => k + 1)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    setDialogStarted(true)
  }, [cleanupEngvoRuntime, resetStructuredLessonSession])

  const handleOpenEngvoVoiceChat = useCallback(() => {
    engvoRedialWithoutWelcomeRef.current = false
    setComposerSessionKey((k) => k + 1)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    resetStructuredLessonSession()
    setMessages([
      {
        role: 'assistant',
        content:
          engvoSessionKind === 'teacher'
            ? consumeNextEngvoTeacherWelcomeMessage(settings.audience, engvoCefrLevel)
            : consumeNextEngvoWelcomeMessage(settings.audience, engvoCefrLevel),
        engvoLocalWelcome: true,
      },
    ])
    engvoTeacherPhaseRef.current = resolveEngvoTeacherPhase({ kind: engvoSessionKind })
    engvoTeacherUserFinalCountRef.current = 0
    engvoTeacherAwaitingFirstDrillRef.current = engvoTeacherPhaseRef.current === 'drill'
    engvoTeacherReclaimUsedThisUserTurnRef.current = false
    engvoTeacherReclaimAttemptsThisUserTurnRef.current = 0
    engvoTeacherReclaimInFlightRef.current = false
    engvoFreeCallUserFinalCountRef.current = 0
    engvoFreeCallReclaimUsedThisUserTurnRef.current = false
    engvoFreeCallReclaimInFlightRef.current = false
    engvoLastFinalUserTranscriptRef.current = ''
    setLoading(false)
    setSearchingInternet(false)
    setLoadingTranslationIndex(null)
    setRetryMessage(null)
    setSettingsAtLastSend(null)
    setEngvoBootstrapServiceStatusVisible(false)
    setDialogStarted(true)
    setEngvoVoiceMode(true)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    setMenuOpen(false)
  }, [
    cleanupEngvoRuntime,
    engvoCefrLevel,
    engvoSessionKind,
    resetStructuredLessonSession,
    settings.audience,
  ])

  const buildStructuredLessonRuntimeRequestKey = useCallback(
    (lessonId: string, mode: StructuredLessonRuntimeMode = 'generate') => {
      const recentVariantIds = structuredLessonVariantHistoryRef.current[lessonId] ?? []
      return [
        mode,
        lessonId,
        settings.provider,
        settings.openAiChatPreset,
        settings.audience,
        recentVariantIds.join('|'),
      ].join('::')
    },
    [settings.provider, settings.openAiChatPreset, settings.audience]
  )

  const loadStructuredLessonRuntime = useCallback(
    async (
      lessonId: string,
      mode: StructuredLessonRuntimeMode,
      options?: { cacheResult?: boolean }
    ): Promise<LessonData | null> => {
      const fallbackLesson = getStructuredLessonById(lessonId)
      if (!fallbackLesson) return null
      const requestKey = buildStructuredLessonRuntimeRequestKey(lessonId, mode)
      const prefetched = prefetchedStructuredLessonRuntimeRef.current[requestKey]
      if (prefetched) {
        delete prefetchedStructuredLessonRuntimeRef.current[requestKey]
        if (prefetched.variantId) {
          const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, prefetched.variantId)
        }
        return cloneLessonData(prefetched)
      }
      const existingInFlight = structuredLessonRuntimeInFlightRef.current[requestKey]
      if (existingInFlight) {
        const shared = await existingInFlight
        if (shared?.variantId) {
          const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, shared.variantId)
        }
        return shared ? cloneLessonData(shared) : null
      }

      const requestPromise = (async () => {
        const fetchStartedAt = Date.now()
        try {
          const recentVariantIds = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          const response = await fetchWithLessonProviderDeadline(
            (signal) =>
              fetch(mode === 'repeat' ? '/api/lesson-repeat' : '/api/structured-lesson-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: settings.provider,
                  openAiChatPreset: settings.openAiChatPreset,
                  audience: settings.audience,
                  lessonId,
                  recentVariantIds,
                  generationNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                }),
                signal,
              }),
            { deadlineMs: STRUCTURED_LESSON_RUNTIME_TIMEOUT_MS }
          )
          const data = (await response.json()) as {
            lesson?: LessonData
            generated?: boolean
            fallback?: boolean
          }
          if (response.ok && data.lesson) {
            const runtimeLesson = withLessonGenerationMeta(data.lesson, {
              generated: Boolean(data.generated) && !data.fallback,
              fallback: Boolean(data.fallback) || !data.generated,
            })
            if (runtimeLesson.variantId && !options?.cacheResult) {
              const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
              structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, runtimeLesson.variantId)
            }
            if (options?.cacheResult) {
              prefetchedStructuredLessonRuntimeRef.current[requestKey] = cloneLessonData(runtimeLesson)
            }
            console.info(
              `[lesson-ui] mode=${mode} lesson=${lessonId} source=${runtimeLesson.fallback ? 'fallback' : 'network'} fetch_ms=${Date.now() - fetchStartedAt}`
            )
            return runtimeLesson
          }
        } catch (error) {
          console.warn(mode === 'repeat' ? 'lesson-repeat failed:' : 'structured-lesson-generate failed:', error)
        }
        const clonedFallback = withLessonGenerationMeta(cloneStructuredLessonWithRunKey(fallbackLesson), {
          generated: false,
          fallback: true,
        })
        if (clonedFallback.variantId && !options?.cacheResult) {
          const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, clonedFallback.variantId)
        }
        if (options?.cacheResult) {
          prefetchedStructuredLessonRuntimeRef.current[requestKey] = cloneLessonData(clonedFallback)
        }
        console.info(`[lesson-ui] mode=${mode} lesson=${lessonId} source=fallback fetch_ms=${Date.now() - fetchStartedAt}`)
        return clonedFallback
      })()

      structuredLessonRuntimeInFlightRef.current[requestKey] = requestPromise
      try {
        const resolved = await requestPromise
        return resolved ? cloneLessonData(resolved) : null
      } finally {
        delete structuredLessonRuntimeInFlightRef.current[requestKey]
      }
    },
    [buildStructuredLessonRuntimeRequestKey, settings.provider, settings.openAiChatPreset, settings.audience]
  )

  const fetchStructuredLessonRuntime = useCallback(
    async (lessonId: string, mode: StructuredLessonRuntimeMode): Promise<LessonData | null> => {
      return loadStructuredLessonRuntime(lessonId, mode)
    },
    [loadStructuredLessonRuntime]
  )

  const buildCompletedVariants = useCallback(
    (status: typeof activeStructuredLessonStatus, variantNumber: number) => {
      const completedCount = status === 'completed' ? variantNumber : Math.max(variantNumber - 1, 0)
      return completedCount > 0 ? Array.from({ length: completedCount }, (_, index) => index + 1) : []
    },
    []
  )

  const persistActiveStructuredLessonProgress = useCallback(
    (overrides?: { postLessonChoice?: PostLessonAction; lastCompleted?: string }) => {
      if (!activeStructuredLesson) return
      if (lessonViewStage !== 'lesson') return

      const lessonId = activeStructuredLesson.id
      const previous = loadLessonProgress(lessonId)
      const isCompleted = activeStructuredLessonStatus === 'completed'
      const sessionBase = {
        lessonId,
        topic: activeStructuredLesson.topic,
        level: activeStructuredLesson.level,
        completedSteps: activeStructuredLessonCompletedSteps,
        completedVariants: buildCompletedVariants(activeStructuredLessonStatus, activeLessonVariantNumber),
        coreXp: activeStructuredLessonCoreXp,
        comboXp: activeStructuredLessonComboXp,
        maxCoreXp: activeStructuredLessonMaxCoreXp,
        maxCombo: activeStructuredLessonMaxCombo,
        mistakes: activeStructuredLessonMistakes,
        postLessonChoice: overrides?.postLessonChoice,
      }

      if (isCompleted) {
        const isRepeatRun =
          activeLessonVariantNumber > 1 ||
          structuredLessonRunOriginRef.current === 'post_lesson_repeat' ||
          structuredLessonRunOriginRef.current === 'repeat_api'
        const isLocalLesson = isLocalStructuredLessonRun(
          structuredLessonRunOriginRef.current,
          activeLessonVariantNumber
        )
        let merged = mergeLessonProgressOnComplete(previous, {
          ...sessionBase,
          isRepeatRun,
          isLocalLesson,
          cycle1Closed: previous?.cycle1Closed === true,
        })
        if (merged.medal === 'gold') {
          lessonCycle1ActiveSessionRef.current = false
        }
        const badgeDefinition = getLessonBadgeDefinition(lessonId)
        if (badgeDefinition) {
          const badgeProgress = resolveLessonBadgeProgress(merged, badgeDefinition, merged.medal)
          merged = {
            ...merged,
            lessonBadgeCriteriaMet: badgeProgress.criteriaMet,
            ...(badgeProgress.earned && !merged.lessonBadgeEarned
              ? {
                  lessonBadgeEarned: true,
                  lessonBadgeEarnedAt: new Date().toISOString(),
                }
              : {}),
          }
        }
        saveLessonProgress(merged)
        recordLessonOrPracticeResolved({ lessonId })
        return
      }

      saveLessonProgress(
        migrateUserLessonProgress(
          {
            ...previous,
            ...sessionBase,
            xp: activeStructuredLessonXp,
            combo: activeStructuredLessonCombo,
            totalXp: activeStructuredLessonXp,
            lastCompleted: overrides?.lastCompleted ?? previous?.lastCompleted ?? '',
          },
          lessonId
        )
      )
    },
    [
      activeStructuredLesson,
      activeStructuredLessonCompletedSteps,
      activeStructuredLessonStatus,
      activeLessonVariantNumber,
      activeStructuredLessonXp,
      activeStructuredLessonCoreXp,
      activeStructuredLessonComboXp,
      activeStructuredLessonMaxCoreXp,
      activeStructuredLessonMaxCombo,
      activeStructuredLessonCombo,
      activeStructuredLessonMistakes,
      buildCompletedVariants,
      lessonViewStage,
    ]
  )

  const openLearningLesson = useCallback(
    async (
      lessonId: string,
      lessonsPanel: LessonsPanel = 'a2',
      meta?: LearningLessonMenuMeta,
      options?: { openAtLessonStage?: boolean }
    ) => {
      const lesson = getLearningLessonById(lessonId)
      if (!lesson) return
      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      menuLessonGenerateCleanupRef.current?.()
      menuLessonBgFetchEpochRef.current += 1
      setStructuredLessonVariantRegenerating(false)
      resetVariantPrepareRef.current()
      abandonPracticeSession()
      const requestId = ++lessonOpenRequestIdRef.current
      const structuredLesson = getStructuredLessonById(lessonId)
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setLoading(false)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setLoading(false)
      setActiveStructuredLessonRuntime(null)
      setStructuredLessonLoadingId(null)
      setMenuLessonBgError(null)
      setPendingTutorLessonTitle(null)
      setActiveLessonVariantNumber(1)
      structuredLessonRunOriginRef.current = 'menu_reopen'
      lessonFirstAnswerTrackedRef.current = false
      lessonCycle1ActiveSessionRef.current = false
      setSelectedPostLessonAction(null)
      setPostLessonBusy(false)
      setLessonOverlay(null)
      setLessonReturnBriefingAckRunKey(null)
      setLessonViewStage(options?.openAtLessonStage ? 'lesson' : 'intro')
      if (!options?.openAtLessonStage) {
        bumpLessonIntroRevealSession()
      }
      setLessonTipsReturnStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setLessonMenuContext((prev) => ({
        menuView: 'lessons',
        lessonsPanel,
        selectedLessonId: lessonId,
        activeGrammarCategoryId: meta?.activeGrammarCategoryId ?? null,
        activeTheoryTagId: meta?.activeTheoryTagId ?? null,
        theorySearchQuery: meta?.theorySearchQuery ?? null,
        activeTheoryTagIds: meta?.activeTheoryTagIds ?? null,
        theoryLessonSource: meta?.theoryLessonSource ?? null,
        theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
        practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        catalogBrowseIntent: meta?.catalogBrowseIntent ?? prev?.catalogBrowseIntent ?? 'lesson',
      }))
      setActiveLearningLessonId(lessonId)
      setMessages(structuredLesson ? [] : [{ role: 'assistant', content: lesson.theoryIntro }])

      if (structuredLesson) {
        setStructuredLessonShuffleNonce((n) => n + 1)
        if (requestId !== lessonOpenRequestIdRef.current) return
        setMessages([])
        setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(structuredLesson))
      }
      setLastStructuredLessonGlobalDelta(0)
      bumpFooterSessionContext()
    },
    [abandonPracticeSession, bumpFooterSessionContext, bumpLessonIntroRevealSession, menuOpen]
  )

  const openReferenceTopic = useCallback(
    async (lessonId: string, lessonsPanel: LessonsPanel = 'theory', meta?: LearningLessonMenuMeta) => {
      if (!featureFlags.referenceV1) return
      const sheet = buildReferenceSheetByLessonId(lessonId)
      if (!sheet) return
      if (!getLearningLessonById(lessonId) && !getStructuredLessonById(lessonId)) return
      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      menuLessonGenerateCleanupRef.current?.()
      menuLessonBgFetchEpochRef.current += 1
      setStructuredLessonVariantRegenerating(false)
      resetVariantPrepareRef.current()
      abandonPracticeSession()
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setLoading(false)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setActiveStructuredLessonRuntime(null)
      setStructuredLessonLoadingId(null)
      setMenuLessonBgError(null)
      setPendingTutorLessonTitle(null)
      setLessonOverlay(null)
      setLessonReturnBriefingAckRunKey(null)
      setLessonViewStage('reference')
      setLessonTipsReturnStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setLessonMenuContext((prev) => ({
        menuView: 'lessons',
        lessonsPanel,
        selectedLessonId: lessonId,
        activeGrammarCategoryId: meta?.activeGrammarCategoryId ?? null,
        activeTheoryTagId: meta?.activeTheoryTagId ?? null,
        theorySearchQuery: meta?.theorySearchQuery ?? null,
        activeTheoryTagIds: meta?.activeTheoryTagIds ?? null,
        theoryLessonSource: meta?.theoryLessonSource ?? null,
        theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
        practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        catalogBrowseIntent: 'reference',
      }))
      setActiveLearningLessonId(lessonId)
      const structuredLesson = getStructuredLessonById(lessonId)
      setMessages([])
      if (structuredLesson) {
        setStructuredLessonShuffleNonce((n) => n + 1)
        setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(structuredLesson))
      }
      setLastStructuredLessonGlobalDelta(0)
      bumpFooterSessionContext()
    },
    [abandonPracticeSession, bumpFooterSessionContext, menuOpen]
  )


  React.useEffect(() => {
    if (!storageLoaded || !featureFlags.referenceV1) return
    if (dialogStarted) return
    const fromQuery =
      typeof window !== 'undefined' ? readReferenceLessonIdFromSearch(window.location.search) : null
    const lessonId = fromQuery || consumeOpenReferenceLessonId()
    if (!lessonId) return
    if (fromQuery && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('reference')
        url.searchParams.delete('topic')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      } catch {
        /* ignore */
      }
    }
    void openReferenceTopic(lessonId, 'theory', { catalogBrowseIntent: 'reference' })
  }, [storageLoaded, dialogStarted, openReferenceTopic])

  /** Меню «Начать урок»: всегда открывать intro с начала. */
  const openOrContinueLearningLesson = useCallback(
    (lessonId: string, lessonsPanel: LessonsPanel = 'a2', meta?: LearningLessonMenuMeta) => {
      void openLearningLesson(lessonId, lessonsPanel, meta)
    },
    [openLearningLesson]
  )

  // DEBUG: удалить после редактирования урока
  const handleDebugSkipToLessonFinale = useCallback(
    (lessonId: string, lessonsPanel: LessonsPanel) => {
      const resolvedLessonId =
        dialogStarted && activeLearningLessonId && getStructuredLessonById(activeLearningLessonId)
          ? activeLearningLessonId
          : lessonId
      if (!getStructuredLessonById(resolvedLessonId)) return

      const resolvedPanel =
        dialogStarted &&
        activeLearningLessonId === resolvedLessonId &&
        lessonMenuContext?.lessonsPanel
          ? lessonMenuContext.lessonsPanel
          : lessonsPanel

      menuOpenSnapshotRef.current = null
      debugFinalePendingRef.current = resolvedLessonId
      setMenuOpen(false)

      const lessonAlreadyOpen = dialogStarted && activeLearningLessonId === resolvedLessonId
      const structuredLesson =
        activeStructuredLessonRuntime ?? getStructuredLessonById(resolvedLessonId)

      const acknowledgeReturnBriefing = () => {
        if (!structuredLesson) return
        setLessonReturnBriefingAckRunKey(
          `${structuredLesson.id}:${structuredLesson.runKey ?? 'static'}`
        )
      }

      if (lessonAlreadyOpen) {
        acknowledgeReturnBriefing()
        setLessonViewStage('lesson')
        debugFinalePendingRef.current = null
        goToStructuredLessonFinale()
        return
      }

      debugSkipToFinaleAfterResetRef.current = true
      void openLearningLesson(resolvedLessonId, resolvedPanel, undefined, { openAtLessonStage: true })
    },
    [
      activeLearningLessonId,
      activeStructuredLessonRuntime,
      dialogStarted,
      goToStructuredLessonFinale,
      lessonMenuContext?.lessonsPanel,
      openLearningLesson,
    ]
  )

  const openGeneratedLearningLesson = useCallback(
    async (
      lessonId: string,
      lessonsPanel: LessonsPanel = 'a2',
      meta?: LearningLessonMenuMeta,
      options?: { launchFrom?: 'menu' | 'briefing' }
    ) => {
      const launchFrom = options?.launchFrom ?? 'menu'
      variantGenerateLaunchRef.current = launchFrom

      const baseLesson = getLearningLessonById(lessonId)
      const structuredLesson = getStructuredLessonById(lessonId)
      if (!baseLesson || !structuredLesson) {
        throw new Error('Для выбранного урока пока нет алгоритма генерации.')
      }

      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      menuLessonGenerateCleanupRef.current?.()

      abandonPracticeSession()
      const requestId = ++lessonOpenRequestIdRef.current
      const fetchStartedAt = Date.now()
      setMenuLessonBgError(null)
      setRetryMessage(null)

      menuLessonBgFetchEpochRef.current += 1
      const fetchEpoch = menuLessonBgFetchEpochRef.current
      setStructuredLessonVariantRegenerating(true)

      if (launchFrom === 'menu') {
        firstMessageRequestIdRef.current += 1
        firstMessageInFlightRef.current = false
        suppressSettingsChangeBannerRef.current = true
        setDialogStarted(true)
        setMenuOpen(false)
        setHomeMenuView('lessons')
        setStructuredLessonLoadingId(null)
        setLoading(false)
        setSearchingInternet(false)
        setLoadingTranslationIndex(null)
        setForceNextMicLang(null)
        setSettingsAtLastSend(null)
        setActiveStructuredLessonRuntime(null)
        setPendingTutorLessonTitle(null)
        setActiveLessonVariantNumber(1)
        structuredLessonRunOriginRef.current = 'menu_generate'
        lessonFirstAnswerTrackedRef.current = false
        lessonCycle1ActiveSessionRef.current = false
        setSelectedPostLessonAction(null)
        setPostLessonBusy(false)
        setLessonOverlay(null)
        setLessonReturnBriefingAckRunKey(null)
        setLessonViewStage('intro')
        bumpLessonIntroRevealSession()
        setLessonTipsReturnStage('intro')
        setLessonIntroDepth('quick')
        setLessonExtraTipsStatus('idle')
        setLessonExtraTipsState(null)
        setLessonMenuContext((prev) => ({
          menuView: 'lessons',
          lessonsPanel,
          selectedLessonId: lessonId,
          activeGrammarCategoryId: meta?.activeGrammarCategoryId ?? null,
          activeTheoryTagId: meta?.activeTheoryTagId ?? null,
          theorySearchQuery: meta?.theorySearchQuery ?? null,
          activeTheoryTagIds: meta?.activeTheoryTagIds ?? null,
          theoryLessonSource: meta?.theoryLessonSource ?? null,
          theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
          practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        }))
        setActiveLearningLessonId(lessonId)
        setMessages([])
        setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(structuredLesson))
      } else {
        structuredLessonRunOriginRef.current = 'menu_generate'
        setLessonMenuContext((prev) => ({
          menuView: prev?.menuView ?? 'lessons',
          lessonsPanel,
          selectedLessonId: lessonId,
          activeGrammarCategoryId: meta?.activeGrammarCategoryId ?? prev?.activeGrammarCategoryId ?? null,
          activeTheoryTagId: meta?.activeTheoryTagId ?? prev?.activeTheoryTagId ?? null,
          theorySearchQuery: meta?.theorySearchQuery ?? prev?.theorySearchQuery ?? null,
          activeTheoryTagIds: meta?.activeTheoryTagIds ?? prev?.activeTheoryTagIds ?? null,
          theoryLessonSource: meta?.theoryLessonSource ?? prev?.theoryLessonSource ?? null,
          theoryTagBrowseLevel: meta?.theoryTagBrowseLevel ?? prev?.theoryTagBrowseLevel ?? null,
          practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
        }))
        setActiveLearningLessonId(lessonId)
      }

      const timedOutRef = { current: false }
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        timedOutRef.current = true
        abortController.abort()
      }, LESSON_MENU_GENERATE_TIMEOUT_MS)
      const cleanupThisMenuGenerateAttempt = () => {
        clearTimeout(timeoutId)
        abortController.abort()
      }
      menuLessonGenerateCleanupRef.current = cleanupThisMenuGenerateAttempt

      void (async () => {
        try {
          const recentVariantIds = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          reportPrepareMilestoneRef.current(15)
          const response = await fetch('/api/lesson-repeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
              provider: settings.provider,
              openAiChatPreset: settings.openAiChatPreset,
              audience: settings.audience,
              lessonId,
              recentVariantIds,
              bypassCache: true,
              generationNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            }),
          })
          reportPrepareMilestoneRef.current(70)
          const data = (await response.json()) as LessonRepeatResponse
          if (!response.ok) {
            throw new Error(data.error ?? 'Не удалось обновить вариант урока от ИИ.')
          }
          if (!data.lesson) {
            throw new Error(getMenuGenerationFallbackMessage(data.fallbackReason))
          }
          const menuGenerationFallback = Boolean(!data.generated || data.fallback)
          if (menuGenerationFallback) {
            console.warn('lesson-repeat returned fallback for menu background generation:', {
              lessonId,
              generated: data.generated,
              fallback: data.fallback,
              fallbackReason: data.fallbackReason,
            })
          }
          if (requestId !== lessonOpenRequestIdRef.current) return

          const runtimeLesson = withLessonGenerationMeta(data.lesson, {
            generated: Boolean(data.generated) && !data.fallback,
            fallback: menuGenerationFallback,
          })
          if (runtimeLesson.variantId) {
            const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
            structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, runtimeLesson.variantId)
          }

          setMenuLessonBgError(null)
          const launchAnimated = await completePrepareProgressRef.current(() =>
            requestId !== lessonOpenRequestIdRef.current ||
            fetchEpoch !== menuLessonBgFetchEpochRef.current
          )
          if (!launchAnimated) return
          if (requestId !== lessonOpenRequestIdRef.current) return
          if (fetchEpoch !== menuLessonBgFetchEpochRef.current) return

          setActiveStructuredLessonRuntime(runtimeLesson)
          if (variantGenerateLaunchRef.current === 'briefing') {
            setActiveLessonVariantNumber((current) => current + 1)
            acknowledgeLessonReturnBriefingRef.current(runtimeLesson)
            console.info(
              `[lesson-ui] mode=briefing-generate-bg lesson=${lessonId} source=${menuGenerationFallback ? 'fallback' : 'llm'} fetch_ms=${Date.now() - fetchStartedAt}`
            )
          } else {
            console.info(
              `[lesson-ui] mode=menu-generate-bg lesson=${lessonId} source=${menuGenerationFallback ? 'fallback' : 'llm'} fetch_ms=${Date.now() - fetchStartedAt}`
            )
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            if (!timedOutRef.current) return
            setMenuLessonBgError(
              'Подготовка нового сюжета заняла слишком много времени. Урок уже открыт - позже можно снова нажать «Новый сюжет».'
            )
            return
          }
          const message =
            error instanceof Error ? error.message : 'Не удалось обновить вариант урока от ИИ.'
          setMenuLessonBgError(message)
          console.warn('menu lesson background generation failed:', error)
        } finally {
          clearTimeout(timeoutId)
          if (menuLessonGenerateCleanupRef.current === cleanupThisMenuGenerateAttempt) {
            menuLessonGenerateCleanupRef.current = null
          }
          if (fetchEpoch === menuLessonBgFetchEpochRef.current) {
            setStructuredLessonVariantRegenerating(false)
            variantGenerateLaunchRef.current = 'menu'
          }
        }
      })()
    },
    [abandonPracticeSession, bumpLessonIntroRevealSession, menuOpen, settings.provider, settings.openAiChatPreset, settings.audience]
  )

  const openTutorLesson = useCallback(
    async (request: {
      requestedTopic: string
      originalQuery?: string
      selectedIntent?: TutorLearningIntent
      analysisSummary?: string
      /** Готовый structured-урок из каталога теории (ответ tutor-resolve-topic). */
      catalogLessonId?: string
    }) => {
      const catalogId = request.catalogLessonId?.trim()
      if (catalogId && getStructuredLessonById(catalogId)) {
        const catalogTopic = getLessonTopicById(catalogId)
        const tagIds = catalogTopic?.tagIds?.filter(Boolean) ?? []
        await openLearningLesson(catalogId, 'tutor', {
          activeGrammarCategoryId: null,
          activeTheoryTagId: tagIds[0] ?? null,
          theorySearchQuery: request.originalQuery?.trim() || null,
          activeTheoryTagIds: tagIds.length > 0 ? [...tagIds] : null,
          theoryLessonSource: 'tag_browse',
          theoryTagBrowseLevel: catalogTopic?.level ?? null,
        })
        return
      }

      const topic = request.requestedTopic.trim()
      if (!topic) return

      const staticLesson = findStaticLessonByTopic(topic)
      if (staticLesson) {
        openLearningLesson(staticLesson.id, 'tutor')
        return
      }

      const requestId = ++lessonOpenRequestIdRef.current
      menuLessonGenerateCleanupRef.current?.()
      menuLessonBgFetchEpochRef.current += 1
      setStructuredLessonVariantRegenerating(false)
      resetVariantPrepareRef.current()
      abandonPracticeSession()
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setLoading(true)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setActiveLearningLessonId(null)
      setActiveStructuredLessonRuntime(null)
      setStructuredLessonLoadingId('tutor')
      setMenuLessonBgError(null)
      setPendingTutorLessonTitle(request.selectedIntent?.title ?? topic)
      setActiveLessonVariantNumber(1)
      setSelectedPostLessonAction(null)
      setPostLessonBusy(false)
      setLessonOverlay(null)
      setLessonViewStage('intro')
      setLessonTipsReturnStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setMessages([])
      let lesson: LessonBlueprint | null = null
      try {
        try {
          const response = await fetchWithLessonProviderDeadline(
            (signal) =>
              fetch('/api/lesson-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: settings.provider,
                  openAiChatPreset: settings.openAiChatPreset,
                  topic,
                  originalQuery: request.originalQuery,
                  intent: request.selectedIntent,
                  level: settings.level,
                  audience: settings.audience,
                  analysisSummary: request.analysisSummary,
                }),
                signal,
              }),
            { deadlineMs: TUTOR_LESSON_GENERATE_TIMEOUT_MS }
          )
          const data = (await response.json()) as {
            lesson?: LessonBlueprint
            error?: string
          }
          if (response.ok && data.lesson) {
            lesson = data.lesson
          } else if (data.error) {
            console.warn('lesson-generate error:', data.error)
          }
        } catch (error) {
          console.warn('lesson-generate failed, fallback blueprint will be used:', error)
        }

        if (!lesson) {
          lesson = buildTutorFallbackBlueprint(topic)
        }
        const tutorIntent = lesson.tutorIntent ?? request.selectedIntent
        if (!shouldFinalizeTutorLessonOpen(requestId, lessonOpenRequestIdRef.current)) return

        const lessonId = registerRuntimeLearningLesson({
          title: lesson.title,
          intro: lesson.intro,
          theoryIntro: lesson.theoryIntro,
          actions: lesson.actions,
          followups: lesson.followups,
          adaptiveTemplate: lesson.adaptiveTemplate,
          tutorIntent,
        })
        const runtimeLesson = buildTutorStructuredLesson({
          id: lessonId,
          topic: lesson.title || topic,
          level: settings.level,
          blueprint: { ...lesson, tutorIntent },
        })
        setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'tutor' })
        setActiveLearningLessonId(lessonId)
        setActiveStructuredLessonRuntime(runtimeLesson)
        setPendingTutorLessonTitle(null)
      } finally {
        if (!shouldFinalizeTutorLessonOpen(requestId, lessonOpenRequestIdRef.current)) return
        suppressSettingsChangeBannerRef.current = false
        setStructuredLessonLoadingId(null)
        setPendingTutorLessonTitle(null)
        setLoading(false)
      }
    },
    [
      abandonPracticeSession,
      openLearningLesson,
      settings.provider,
      settings.openAiChatPreset,
      settings.level,
      settings.audience,
    ]
  )

  const handleSelectLearningAction = useCallback(
    (actionId: string) => {
      if (!activeLearningLessonId) return
      const typedActionId = actionId as LearningLessonActionId
      const placeholder = getLearningLessonFollowupPlaceholder(activeLearningLessonId, typedActionId)
      if (!placeholder) return
      setMessages((prev) => [...prev, { role: 'assistant', content: placeholder }])
    },
    [activeLearningLessonId]
  )

  const startPracticeFromLesson = useCallback(
    (config: PracticeBuildConfig) => {
      setPracticeRewardUi(null)
      setPracticeCompletionMeta(null)
      const entryTier = resolvePracticeEconomyTier(loadLessonProgress(config.lesson.id)?.medal ?? null)
      const entryReward = claimPracticeEntryRewards({ lessonId: config.lesson.id, tier: entryTier })
      if (entryReward.claimed && entryReward.visibleText) {
        setRewardsState((previous) => {
          let next = previous
          for (const milestone of entryReward.coinMilestones) {
            const awarded = awardCoins(next, milestone.amount, {
              practiceMilestoneForLedger: milestone.key,
            })
            if (awarded.ok) next = awarded.state
          }
          return entryReward.coinsAwarded > 0
            ? applyRewardsEvent(next, {
                type: 'coins_earned',
                amount: entryReward.coinsAwarded,
                reason: 'practice_entry_pending_claim',
                ticker: entryReward.visibleText ?? undefined,
              })
            : next
        })
        const progress = getPracticeTopicProgress(config.lesson.id)
        const at = Date.now()
        setPracticeRewardUi({
          id: `practice-entry-${config.lesson.id}-${at}`,
          sessionXp: 0,
          globalAmount: 0,
          globalReason: 'no_eligible_award',
          ringCount: progress.ringCount,
          ringIncremented: false,
          coinsAwarded: entryReward.coinsAwarded,
          gemsAwarded: 0,
          cupAwarded: entryReward.cupAwarded,
          tier: entryTier,
          topLine: entryReward.visibleText,
          popupText: entryReward.visibleText,
          showPopup: true,
          at,
        })
      }
      // Закрытие меню после запуска практики триггерит эффект «снимок настроек при открытии меню»:
      // при расхождении он вызывает restartChatForNewModeFromMenu → abandonPracticeSession и сносит сессию.
      // Сбрасываем снимок: переход в практику - намеренное действие, не «закрыли меню после правок чата».
      menuOpenSnapshotRef.current = null
      resetStructuredLessonSession()
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setMessages([])
      setLoading(false)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setLessonMenuContext({
        menuView: 'lessons',
        lessonsPanel: 'practice',
        selectedLessonId: config.lesson.id,
        practiceMode: config.mode,
        referenceExerciseType:
          config.mode === 'reference' ? config.questions?.[0]?.type : undefined,
      })
      startPracticeSession(config)
    },
    [resetStructuredLessonSession, startPracticeSession]
  )

  const resolvePracticeRequest = useCallback(
    async (request: PracticeOpenRequest, generationSource: PracticeBuildConfig['generationSource']): Promise<PracticeBuildConfig> => {
      const customTopic = request.customTopic?.trim()
      let resolvedLessonId = request.lessonId ?? null
      let lesson: LessonData | null = null
      let source: PracticeSource | null = null

      if (request.entrySource === 'custom_topic' && !resolvedLessonId) {
        throw new Error('Сначала выберите тему из каталога практики.')
      }

      if (!resolvedLessonId && customTopic) {
        const staticMatch = findStaticLessonByTopic(customTopic)
        resolvedLessonId = staticMatch?.id ?? null

        if (!resolvedLessonId) {
          const resolutionResponse = await fetch('/api/tutor-resolve-topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: settings.provider,
              openAiChatPreset: settings.openAiChatPreset,
              query: customTopic,
              level: settings.level,
              audience: settings.audience,
            }),
          })
          const resolution = (await resolutionResponse.json()) as PracticeTopicResolutionResponse
          const catalogFromResolution = resolution.catalogLessonIds?.[0]?.trim()
          if (!resolvedLessonId && catalogFromResolution && getStructuredLessonById(catalogFromResolution)) {
            resolvedLessonId = catalogFromResolution
          }
          const selectedIntent = resolution.intentOptions?.[0]
          const resolvedTopic = resolution.primaryTopic ?? selectedIntent?.title ?? resolution.suggestions?.[0] ?? customTopic
          const resolvedStaticMatch = findStaticLessonByTopic(resolvedTopic)
          resolvedLessonId = resolvedStaticMatch?.id ?? null

          if (!resolvedLessonId) {
            let blueprint: LessonBlueprint | null = null
            try {
              const lessonResponse = await fetch('/api/lesson-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: settings.provider,
                  openAiChatPreset: settings.openAiChatPreset,
                  topic: resolvedTopic,
                  originalQuery: customTopic,
                  intent: selectedIntent,
                  level: settings.level,
                  audience: settings.audience,
                }),
              })
              const lessonData = (await lessonResponse.json()) as { lesson?: LessonBlueprint; error?: string }
              if (lessonResponse.ok && lessonData.lesson) {
                blueprint = lessonData.lesson
              }
            } catch (error) {
              console.warn('practice custom lesson-generate failed, fallback blueprint will be used:', error)
            }

            const finalBlueprint = blueprint ?? buildTutorFallbackBlueprint(resolvedTopic)
            const tutorIntent = finalBlueprint.tutorIntent ?? selectedIntent
            const runtimeLessonId = registerRuntimeLearningLesson({
              title: finalBlueprint.title,
              intro: finalBlueprint.intro,
              theoryIntro: finalBlueprint.theoryIntro,
              actions: finalBlueprint.actions,
              followups: finalBlueprint.followups,
              adaptiveTemplate: finalBlueprint.adaptiveTemplate,
              tutorIntent,
            })
            lesson = buildTutorStructuredLesson({
              id: runtimeLessonId,
              topic: finalBlueprint.title || resolvedTopic,
              level: settings.level,
              blueprint: { ...finalBlueprint, tutorIntent },
            })
            source = {
              kind: 'runtime_lesson',
              lesson,
              origin: 'tutor',
              topicInput: customTopic,
              tutorIntent,
            }
          }
        }
      }

      if (!resolvedLessonId && request.entrySource === 'quick_start') {
        resolvedLessonId = pickQuickStartPracticeTopic('A2')?.id ?? null
      }
      if (!lesson && resolvedLessonId) {
        lesson = getPracticeLessonById(resolvedLessonId)
        source = { kind: 'static_lesson', lessonId: resolvedLessonId }
      }

      if (!lesson) {
        throw new Error('Для этой темы пока нет практики.')
      }

      const totalQuestionCount = request.mode === 'reference' ? 7 : getPracticeModePlan(request.mode).length
      let questions: PracticeQuestion[] | undefined
      let resolvedGenerationSource = generationSource
      let generationNotice: string | undefined
      let targetQuestionCount: number | undefined
      if (generationSource === 'local' && request.mode === 'reference') {
        const localReference = resolveLocalReferencePracticeQuestions({
          lesson,
          referenceExerciseType: request.referenceExerciseType,
        })
        if ('error' in localReference) {
          throw new Error(localReference.error)
        }
        questions = localReference.questions
        targetQuestionCount = totalQuestionCount
      } else if (generationSource === 'ai_generated') {
        const initialCount = Math.min(PRACTICE_AI_INITIAL_BATCH_SIZE, totalQuestionCount)
        const response = await fetch('/api/practice-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: settings.provider,
            openAiChatPreset: settings.openAiChatPreset,
            audience: settings.audience,
            lessonId: source?.kind === 'static_lesson' ? source.lessonId : undefined,
            lesson: source?.kind === 'runtime_lesson' ? lesson : undefined,
            mode: request.mode,
            referenceExerciseType: request.referenceExerciseType,
            referenceStepIndex: request.mode === 'reference' ? 0 : undefined,
            referenceTotal: request.mode === 'reference' ? 7 : undefined,
            recentPrompts: request.mode === 'reference' ? [] : undefined,
            count: request.mode === 'reference' ? 1 : initialCount,
            fromIndex: 0,
            seenKeys: [],
            ...buildPracticeGenerateInitialDedupPayload(request.mode),
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (!response.ok) {
          throw new Error(data.error ?? 'Не удалось сгенерировать практику.')
        }
        const resolved = resolvePracticeQuestionsFromGenerateResponse(data, {
          mode: request.mode,
          lesson,
          referenceExerciseType: request.referenceExerciseType,
          referenceTotal: request.mode === 'reference' ? 7 : undefined,
          referenceStepIndex: request.mode === 'reference' ? 0 : undefined,
          fromIndex: 0,
          existingQuestions: [],
        })
        if ('error' in resolved) {
          throw new Error(resolved.error)
        }
        questions = resolved.questions
        generationNotice = resolved.generationNotice
        if (resolved.useLocalGenerationSource) {
          resolvedGenerationSource = 'local'
          targetQuestionCount = undefined
        } else {
          targetQuestionCount = totalQuestionCount
        }
      }

      return {
        source: source ?? { kind: 'static_lesson', lessonId: lesson.id },
        lesson,
        mode: request.mode,
        entrySource: request.entrySource,
        generationSource: resolvedGenerationSource,
        questions,
        generationNotice,
        targetQuestionCount,
      }
    },
    [settings.audience, settings.level, settings.openAiChatPreset, settings.provider]
  )

  const persistPracticeTheoryTagFilter = useCallback((tagId: string | null) => {
    setLessonMenuContext((prev) =>
      prev
        ? { ...prev, practiceTheoryTagFilterId: tagId }
        : {
            menuView: 'lessons',
            lessonsPanel: 'practice',
            activeGrammarCategoryId: null,
            activeTheoryTagId: null,
            theorySearchQuery: null,
            activeTheoryTagIds: null,
            theoryLessonSource: null,
            theoryTagBrowseLevel: null,
            practiceTheoryTagFilterId: tagId,
          }
    )
  }, [])

  const openPracticeSession = useCallback(
    async (request: PracticeOpenRequest) => {
      const config = await resolvePracticeRequest(request, 'local')
      startPracticeFromLesson(config)
    },
    [resolvePracticeRequest, startPracticeFromLesson]
  )

  // DEBUG: remove after practice editing
  const handleDebugSkipToPracticeFinale = useCallback(
    (request?: PracticeOpenRequest) => {
      menuOpenSnapshotRef.current = null
      setMenuOpen(false)

      const activeSession = practiceSession.session
      if (dialogStarted && activeSession?.status === 'active') {
        practiceSession.completeSession()
        return
      }

      if (!request?.lessonId) return
      debugPracticeFinalePendingRef.current = request
      void openPracticeSession(request)
    },
    [dialogStarted, openPracticeSession, practiceSession]
  )

  const openAccentTrainer = useCallback((lessonId?: string) => {
    resetStructuredLessonSession()
    setActiveAccentLessonId(lessonId ?? null)
    setAccentLessonRequestKey((value) => value + 1)
    setAccentTrainerActive(true)
    setDialogStarted(true)
    setMenuOpen(false)
    setHomeMenuView('lessons')
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'pronunciation' })
  }, [resetStructuredLessonSession])

  const openVocabularyWorlds = useCallback(() => {
    resetStructuredLessonSession()
    setAdaptiveFooterView(null)
    setVocabularyByLevelActive(false)
    setVocabularyWorldsActive(true)
    setDialogStarted(true)
    setMenuOpen(false)
    setHomeMenuView('lessons')
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'vocabulary' })
  }, [resetStructuredLessonSession])

  const openVocabularyByLevel = useCallback(() => {
    resetStructuredLessonSession()
    setAdaptiveFooterView(null)
    setVocabularyWorldsActive(false)
    setVocabularyByLevelActive(true)
    setDialogStarted(true)
    setMenuOpen(false)
    setHomeMenuView('lessons')
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'wordsByLevel' })
  }, [resetStructuredLessonSession])

  const generatePracticeSession = useCallback(
    async (request: PracticeOpenRequest) => {
      const config = await resolvePracticeRequest(request, 'ai_generated')
      startPracticeFromLesson(config)
    },
    [resolvePracticeRequest, startPracticeFromLesson]
  )

  const openAdaptivePracticeTopic = useCallback(
    (topic: string) => {
      setAdaptiveFooterView(null)
      void openPracticeSession({
        mode: 'balanced',
        entrySource: 'custom_topic',
        customTopic: topic,
      }).catch((error) => {
        const message = error instanceof Error ? error.message : 'Не удалось открыть практику по выбранной цели.'
        setMenuLessonBgError(message)
        setHomeMenuView('lessons')
      })
    },
    [openPracticeSession]
  )

  const restartPracticeFromExistingSession = useCallback(
    async (session: PracticeSession, mode: PracticeMode, generationSource: PracticeBuildConfig['generationSource']) => {
      if (session.source.kind === 'static_lesson') {
        const request = {
          lessonId: session.source.lessonId,
          mode,
          entrySource: 'menu' as const,
          referenceExerciseType: mode === 'reference' ? session.questions[0]?.type : undefined,
        }
        if (generationSource === 'ai_generated') {
          await generatePracticeSession(request)
        } else {
          await openPracticeSession(request)
        }
        return
      }

      let questions: PracticeQuestion[] | undefined
      const lesson = session.source.lesson
      const totalQuestionCount = mode === 'reference' ? 7 : getPracticeModePlan(mode).length
      let resolvedGenerationSource = generationSource
      let generationNotice: string | undefined
      let targetQuestionCount: number | undefined
      if (generationSource === 'ai_generated') {
        const initialCount = Math.min(PRACTICE_AI_INITIAL_BATCH_SIZE, totalQuestionCount)
        const response = await fetch('/api/practice-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: settings.provider,
            openAiChatPreset: settings.openAiChatPreset,
            audience: settings.audience,
            lesson,
            mode,
            referenceExerciseType: session.mode === 'reference' ? session.questions[0]?.type : undefined,
            referenceStepIndex: mode === 'reference' ? 0 : undefined,
            referenceTotal: mode === 'reference' ? 7 : undefined,
            recentPrompts: mode === 'reference' ? [] : undefined,
            count: mode === 'reference' ? 1 : initialCount,
            fromIndex: 0,
            seenKeys: [],
            ...buildPracticeGenerateInitialDedupPayload(mode),
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (response.ok) {
          const resolved = resolvePracticeQuestionsFromGenerateResponse(data, {
            mode,
            lesson,
            referenceExerciseType: mode === 'reference' ? session.questions[0]?.type : undefined,
            referenceTotal: mode === 'reference' ? 7 : undefined,
            referenceStepIndex: mode === 'reference' ? 0 : undefined,
            fromIndex: 0,
            existingQuestions: [],
          })
          if (!('error' in resolved)) {
            questions = resolved.questions
            generationNotice = resolved.generationNotice
            if (resolved.useLocalGenerationSource) {
              resolvedGenerationSource = 'local'
            } else {
              targetQuestionCount = totalQuestionCount
            }
          }
        }
      }

      startPracticeFromLesson({
        source: session.source,
        lesson,
        mode,
        entrySource: 'menu',
        generationSource: resolvedGenerationSource,
        questions,
        generationNotice,
        targetQuestionCount,
      })
    },
    [
      generatePracticeSession,
      openPracticeSession,
      settings.audience,
      settings.openAiChatPreset,
      settings.provider,
      startPracticeFromLesson,
    ]
  )

  const activePracticeSession = practiceSession.session
  const practiceFlowState = practiceSession.state
  const appendGeneratedPracticeQuestion = practiceSession.appendGeneratedQuestion
  const failGeneratingPracticeQuestion = practiceSession.failGeneratingNext
  const beginPracticeQuestion = practiceSession.beginNextQuestion

  useEffect(() => {
    return () => {
      practicePrefetchAbortRef.current?.abort()
      practicePrefetchAbortRef.current = null
      practicePrefetchInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    const session = activePracticeSession
    if (!session || session.generationSource !== 'ai_generated') return
    if (
      practiceFlowState === 'completed' ||
      practiceFlowState === 'error' ||
      practiceFlowState === 'generating_next' ||
      practiceFlowState === 'briefing'
    )
      return
    if (practicePrefetchInFlightRef.current) return

    const target = resolvePracticeTargetQuestionCount(session)
    const remaining = target - session.questions.length
    if (remaining <= 0) return

    const bufferedAhead = session.questions.length - session.currentIndex - 1
    if (bufferedAhead >= PRACTICE_PREFETCH_BUFFER_TARGET) return

    const fetchCount = Math.min(PRACTICE_AI_INITIAL_BATCH_SIZE, remaining)
    const abortController = new AbortController()
    const timedOutRef = { current: false }
    const timeoutId = setTimeout(() => {
      timedOutRef.current = true
      abortController.abort()
    }, PRACTICE_PREFETCH_TIMEOUT_MS)
    practicePrefetchAbortRef.current?.abort()
    practicePrefetchAbortRef.current = abortController
    practicePrefetchInFlightRef.current = true

    void (async () => {
      try {
        let freshQuestions: PracticeQuestion[] = []
        for (let attempt = 0; attempt <= PRACTICE_PREFETCH_UNIQUE_RETRIES; attempt += 1) {
          if (abortController.signal.aborted) return
          const response = await fetch('/api/practice-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
              provider: settings.provider,
              openAiChatPreset: settings.openAiChatPreset,
              audience: settings.audience,
              lessonId: session.source.kind === 'static_lesson' ? session.source.lessonId : undefined,
              lesson: session.source.kind === 'runtime_lesson' ? session.source.lesson : undefined,
              mode: session.mode,
              referenceExerciseType: session.mode === 'reference' ? session.questions[0]?.type : undefined,
              referenceStepIndex: session.mode === 'reference' ? session.questions.length : undefined,
              referenceTotal: target,
              recentPrompts: session.mode === 'reference' ? session.questions.map((item) => item.prompt) : undefined,
              count: fetchCount,
              fromIndex: session.questions.length,
              seenKeys: buildSeenPracticeKeys(session.questions),
              ...buildPracticeGenerateAdaptiveContext(session),
              ...buildPracticeGenerateDedupPayload(session),
            }),
          })
          const data = (await response.json()) as PracticeGenerateResponse
          if (!response.ok) {
            continue
          }
          const practiceLesson =
            session.source.kind === 'runtime_lesson'
              ? session.source.lesson
              : getPracticeLessonById(session.source.lessonId)
          if (!practiceLesson) continue
          const resolved = resolvePracticeQuestionsFromGenerateResponse(data, {
            mode: session.mode,
            lesson: practiceLesson,
            referenceExerciseType: session.mode === 'reference' ? session.questions[0]?.type : undefined,
            referenceTotal: target,
            referenceStepIndex: session.mode === 'reference' ? session.questions.length : undefined,
            fromIndex: session.questions.length,
            existingQuestions: session.questions,
          })
          if ('error' in resolved) {
            continue
          }
          freshQuestions = resolved.questions
          if (freshQuestions.length > 0) break
        }
        if (freshQuestions.length === 0) return
        for (const question of freshQuestions) {
          appendGeneratedPracticeQuestion(question)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOutRef.current) {
            console.warn('practice prefetch timed out')
          }
          return
        }
        console.warn('practice prefetch failed:', error)
      } finally {
        clearTimeout(timeoutId)
        if (practicePrefetchAbortRef.current === abortController) {
          practicePrefetchAbortRef.current = null
          practicePrefetchInFlightRef.current = false
        }
      }
    })()
  }, [
    activePracticeSession,
    appendGeneratedPracticeQuestion,
    practiceFlowState,
    settings.audience,
    settings.openAiChatPreset,
    settings.provider,
  ])

  useEffect(() => {
    const session = activePracticeSession
    if (!session || session.generationSource !== 'ai_generated') return
    if (practiceFlowState !== 'generating_next') return

    if (session.currentIndex < session.questions.length - 1) {
      beginPracticeQuestion()
      return
    }
    if (practicePrefetchInFlightRef.current) {
      // В критичном пути не ждём подвисший prefetch: форсируем отдельную догрузку.
      practicePrefetchAbortRef.current?.abort()
      practicePrefetchAbortRef.current = null
      practicePrefetchInFlightRef.current = false
    }

    const target = resolvePracticeTargetQuestionCount(session)
    if (session.questions.length >= target) {
      beginPracticeQuestion()
      return
    }

    const abortController = new AbortController()
    const timedOutRef = { current: false }
    const timeoutId = setTimeout(() => {
      timedOutRef.current = true
      abortController.abort()
    }, PRACTICE_GENERATE_NEXT_TIMEOUT_MS)
    practicePrefetchAbortRef.current?.abort()
    practicePrefetchAbortRef.current = abortController
    practicePrefetchInFlightRef.current = true

    void (async () => {
      setLoading(true)
      try {
        let freshQuestions: PracticeQuestion[] = []
        let lastError = 'Не удалось подготовить следующее задание.'
        let gotDuplicateOnly = false
        for (let attempt = 0; attempt <= PRACTICE_GENERATE_NEXT_UNIQUE_RETRIES; attempt += 1) {
          if (abortController.signal.aborted) return
          const response = await fetch('/api/practice-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({
              provider: settings.provider,
              openAiChatPreset: settings.openAiChatPreset,
              audience: settings.audience,
              lessonId: session.source.kind === 'static_lesson' ? session.source.lessonId : undefined,
              lesson: session.source.kind === 'runtime_lesson' ? session.source.lesson : undefined,
              mode: session.mode,
              referenceExerciseType: session.mode === 'reference' ? session.questions[0]?.type : undefined,
              referenceStepIndex: session.mode === 'reference' ? session.questions.length : undefined,
              referenceTotal: target,
              recentPrompts: session.mode === 'reference' ? session.questions.map((item) => item.prompt) : undefined,
              count: 1,
              fromIndex: session.questions.length,
              seenKeys: buildSeenPracticeKeys(session.questions),
              ...buildPracticeGenerateAdaptiveContext(session),
              ...buildPracticeGenerateDedupPayload(session),
            }),
          })
          const data = (await response.json()) as PracticeGenerateResponse
          if (!response.ok) {
            lastError = data.error ?? data.providerError ?? lastError
            continue
          }
          const practiceLesson =
            session.source.kind === 'runtime_lesson'
              ? session.source.lesson
              : getPracticeLessonById(session.source.lessonId)
          if (!practiceLesson) {
            lastError = 'Не удалось загрузить урок для генерации.'
            continue
          }
          const resolved = resolvePracticeQuestionsFromGenerateResponse(data, {
            mode: session.mode,
            lesson: practiceLesson,
            referenceExerciseType: session.mode === 'reference' ? session.questions[0]?.type : undefined,
            referenceTotal: target,
            referenceStepIndex: session.mode === 'reference' ? session.questions.length : undefined,
            fromIndex: session.questions.length,
            existingQuestions: session.questions,
          })
          if ('error' in resolved) {
            lastError = resolved.error
            gotDuplicateOnly = true
            continue
          }
          freshQuestions = resolved.questions
          if (freshQuestions.length > 0) break
          gotDuplicateOnly = true
        }
        if (freshQuestions.length === 0) {
          throw new Error(gotDuplicateOnly ? 'Не удалось получить уникальное следующее задание.' : lastError)
        }
        appendGeneratedPracticeQuestion(freshQuestions[0]!)
        beginPracticeQuestion()
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOutRef.current) {
            failGeneratingPracticeQuestion('Подготовка следующего задания заняла слишком много времени. Попробуйте ещё раз.')
          }
          return
        }
        const message = error instanceof Error ? error.message : 'Не удалось подготовить следующее задание.'
        failGeneratingPracticeQuestion(message)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
        if (practicePrefetchAbortRef.current === abortController) {
          practicePrefetchAbortRef.current = null
          practicePrefetchInFlightRef.current = false
        }
      }
    })()
  }, [
    activePracticeSession,
    appendGeneratedPracticeQuestion,
    failGeneratingPracticeQuestion,
    beginPracticeQuestion,
    practiceFlowState,
    settings.audience,
    settings.openAiChatPreset,
    settings.provider,
  ])

  const openLessonFromPractice = useCallback(
    (session: PracticeSession) => {
      if (session.source.kind === 'static_lesson') {
        void openLearningLesson(session.source.lessonId, 'a2')
        return
      }

      const runtimeLesson = session.source.lesson
      abandonPracticeSession()
      firstMessageRequestIdRef.current += 1
      firstMessageInFlightRef.current = false
      suppressSettingsChangeBannerRef.current = true
      setDialogStarted(true)
      setMenuOpen(false)
      setHomeMenuView('lessons')
      setLoading(false)
      setRetryMessage(null)
      setSearchingInternet(false)
      setLoadingTranslationIndex(null)
      setForceNextMicLang(null)
      setSettingsAtLastSend(null)
      setActiveLearningLessonId(runtimeLesson.id)
      setActiveStructuredLessonRuntime(runtimeLesson)
      setStructuredLessonLoadingId(null)
      setPendingTutorLessonTitle(null)
      setActiveLessonVariantNumber(1)
      setSelectedPostLessonAction(null)
      setPostLessonBusy(false)
      setLessonOverlay(null)
      setLessonViewStage('intro')
      setLessonTipsReturnStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'tutor' })
      setMessages([])
    },
    [abandonPracticeSession, openLearningLesson]
  )

  const openChatFromPractice = useCallback(
    (session: PracticeSession) => {
      setPracticeRewardUi(null)
      setPracticeCompletionMeta(null)
      practiceSession.abandonSession()
      setComposerSessionKey((k) => k + 1)
      cleanupEngvoRuntime({ markIgnoredCurrent: true })
      setEngvoVoiceMode(false)
      setEngvoCallPhase('idle')
      setEngvoErrorText(null)
      resetStructuredLessonSession()
      setSettings((s) => ({
        ...s,
        mode: 'communication',
        topic: 'free_talk',
      }))
      setMessages([
        {
          role: 'assistant',
          content: buildPracticeFinaleChatSeed(session.topic),
        },
      ])
      setLoading(false)
      setSearchingInternet(false)
      setRetryMessage(null)
      setDialogStarted(true)
      setMenuOpen(false)
    },
    [cleanupEngvoRuntime, practiceSession, resetStructuredLessonSession]
  )

  const openTipsFromPractice = useCallback(async () => {
    const session = practiceSession.session
    if (!session) return
    const lessonId =
      session.source.kind === 'static_lesson' ? session.source.lessonId : session.lessonId
    if (!getStructuredLessonById(lessonId)?.intro) {
      openLessonFromPractice(session)
      return
    }
    await openLearningLesson(lessonId, 'a2')
    setLessonViewStage('tips')
    setLessonTipsReturnStage('intro')
  }, [openLearningLesson, openLessonFromPractice, practiceSession.session])

  const openOtherTopicFromPractice = useCallback(() => {
    const session = practiceSession.session
    if (!session) return
    const lessons = Object.values(loadLessonProgressMap()).filter(
      (row) => row.lessonId !== session.lessonId
    )
    const opportunity = pickBestPracticeRewardOpportunity(lessons)
    if (!opportunity) {
      void restartPracticeFromExistingSession(session, session.mode, 'ai_generated')
      return
    }
    void openPracticeSession({
      lessonId: opportunity.lessonId,
      mode: 'challenge',
      entrySource: 'menu',
    })
  }, [openPracticeSession, practiceSession.session, restartPracticeFromExistingSession])

  const handlePostLessonAction = useCallback(
    async (action: PostLessonAction) => {
      if (!activeStructuredLesson || !activeStructuredLessonStep?.postLesson) return

      setSelectedPostLessonAction(action)

      if (action === 'learn_interesting') {
        setLessonOverlay(null)
        setLessonTipsReturnStage('lesson')
        setLessonViewStage('tips')
        return
      }

      if (action === 'independent_practice') {
        try {
          await openPracticeSession({
            lessonId: activeStructuredLesson.id,
            mode: 'challenge',
            entrySource: 'after_lesson',
          })
        } catch {
          setMenuLessonBgError(APP_SHELL_ERROR_COPY.errorFirstMessage)
        }
        setSelectedPostLessonAction(null)
        return
      }

      if (action === 'myeng_training') {
        const earned = resolveMedalFromCoreXp(
          activeStructuredLessonCoreXp,
          true,
          activeStructuredLessonMaxCoreXp
        )
        const medal = capLessonMedalForRun(earned, {
          isLocalLesson: isLocalStructuredLessonRun(
            structuredLessonRunOriginRef.current,
            activeLessonVariantNumber
          ),
          cycle1Closed: loadLessonProgress(activeStructuredLesson.id)?.cycle1Closed === true,
          isRepeatRun: isStructuredLessonRepeatRun,
        })
        const finaleCopy = buildLessonMedalRevealCopy({
          medal,
          coreXp: activeStructuredLessonCoreXp,
          comboXp: activeStructuredLessonComboXp,
          maxCoreXp: activeStructuredLessonMaxCoreXp,
          corePercent: computeCorePercent(
            activeStructuredLessonCoreXp,
            activeStructuredLessonMaxCoreXp
          ),
          audience: settings.audience,
          profileMedal: loadLessonProgress(activeStructuredLesson.id)?.medal ?? null,
        })
        setLessonOverlay({
          title: 'Тренировка в Engvo',
          lines: [
            finaleCopy.goalLine ?? 'Практика с генерацией вариантов - по подписке.',
            'Раздел скоро появится.',
          ],
        })
        setSelectedPostLessonAction(null)
        return
      }

      setPostLessonBusy(true)

      if (action === 'repeat_variant') {
        structuredLessonRunOriginRef.current = 'post_lesson_repeat'
        if (!getStructuredLessonById(activeStructuredLesson.id)) {
          setLessonOverlay(null)
          setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(activeStructuredLesson))
          setActiveLessonVariantNumber((current) => current + 1)
          setSelectedPostLessonAction(null)
          setPostLessonBusy(false)
          return
        }
        try {
          setLessonOverlay(null)
          setStructuredLessonLoadingId(activeStructuredLesson.id)
          setActiveStructuredLessonRuntime(null)
          setMessages([])
          setLoading(true)
          structuredLessonRunOriginRef.current = 'repeat_api'
          const runtimeLesson = await fetchStructuredLessonRuntime(activeStructuredLesson.id, 'repeat')
          if (runtimeLesson) {
            setActiveStructuredLessonRuntime(runtimeLesson)
            setActiveLessonVariantNumber((current) => current + 1)
          }
        } catch (error) {
          console.warn('lesson-repeat failed:', error)
        } finally {
          setStructuredLessonLoadingId(null)
          setLoading(false)
          setSelectedPostLessonAction(null)
          setPostLessonBusy(false)
        }
      }
    },
    [
      activeStructuredLesson,
      activeStructuredLessonStep,
      activeStructuredLessonCoreXp,
      activeStructuredLessonComboXp,
      activeStructuredLessonMaxCoreXp,
      activeLessonVariantNumber,
      isStructuredLessonRepeatRun,
      settings.audience,
      fetchStructuredLessonRuntime,
      openPracticeSession,
    ]
  )

  const handleFinaleOpenTips = useCallback(() => {
    void handlePostLessonAction('learn_interesting')
  }, [handlePostLessonAction])

  useEffect(() => {
    if (!activeStructuredLesson?.runKey) return
    persistActiveStructuredLessonProgress()
  }, [activeStructuredLesson?.runKey, persistActiveStructuredLessonProgress])

  useEffect(() => {
    if (!activeStructuredLesson || activeStructuredLessonCompletedSteps.length === 0) return
    persistActiveStructuredLessonProgress()
  }, [activeStructuredLesson, activeStructuredLessonCompletedSteps.length, persistActiveStructuredLessonProgress])

  useEffect(() => {
    if (activeStructuredLessonStatus !== 'completed') return
    persistActiveStructuredLessonProgress({ lastCompleted: new Date().toISOString() })
  }, [activeStructuredLessonStatus, persistActiveStructuredLessonProgress])

  // DEBUG: удалить после редактирования урока - запасной путь, если финал не выставился в reset движка.
  useEffect(() => {
    const pendingLessonId = debugFinalePendingRef.current
    if (!pendingLessonId) return
    if (!activeStructuredLesson || activeStructuredLesson.id !== pendingLessonId) return
    if (lessonViewStage !== 'lesson') {
      setLessonViewStage('lesson')
      return
    }

    debugFinalePendingRef.current = null
    setLessonReturnBriefingAckRunKey(
      `${activeStructuredLesson.id}:${activeStructuredLesson.runKey ?? 'static'}`
    )
    goToStructuredLessonFinale()
  }, [activeStructuredLesson, lessonViewStage, goToStructuredLessonFinale])

  // DEBUG: remove after practice editing - fallback if finale did not apply on session start
  useEffect(() => {
    if (!debugPracticeFinalePendingRef.current) return
    const session = practiceSession.session
    if (!session || session.status !== 'active') return

    debugPracticeFinalePendingRef.current = null
    practiceSession.completeSession()
  }, [practiceSession.session?.id, practiceSession.session?.status, practiceSession])

  useEffect(() => {
    if (!selectedPostLessonAction) return
    persistActiveStructuredLessonProgress({ postLessonChoice: selectedPostLessonAction })
  }, [selectedPostLessonAction, persistActiveStructuredLessonProgress])

  useEffect(() => {
    if (lessonViewStage !== 'lesson' || !activeStructuredLesson) return
    const hasFirstAnswer =
      activeStructuredLessonCoreXp > 0 ||
      activeStructuredLessonMistakes.length > 0 ||
      activeStructuredLessonStatus === 'checking'
    if (!hasFirstAnswer || lessonFirstAnswerTrackedRef.current) return
    lessonFirstAnswerTrackedRef.current = true
    beginLessonCycle1(activeStructuredLesson.id, {
      topic: activeStructuredLesson.topic,
      level: activeStructuredLesson.level,
    })
    lessonCycle1ActiveSessionRef.current = true
  }, [
    lessonViewStage,
    activeStructuredLesson,
    activeStructuredLessonCoreXp,
    activeStructuredLessonMistakes.length,
    activeStructuredLessonStatus,
  ])

  useEffect(() => {
    const wasOpen = prevMenuOpenForSnapshotRef.current
    prevMenuOpenForSnapshotRef.current = menuOpen
    if (menuOpen && !wasOpen && dialogStarted) {
      menuOpenSnapshotRef.current = buildMenuOpenSnapshot(settings)
    }
  }, [menuOpen, dialogStarted, settings])

  useEffect(() => {
    if (menuOpen) return
    const snap = menuOpenSnapshotRef.current
    menuOpenSnapshotRef.current = null
    if (!dialogStarted) return
    if (engvoVoiceMode) return
    if (snap === null) return
    if (snap.mode !== settings.mode) {
      restartChatForNewModeFromMenu()
      return
    }
    if (menuSettingsRestartNeeded(snap, settings)) {
      restartChatForNewModeFromMenu()
    }
  }, [menuOpen, dialogStarted, engvoVoiceMode, settings, restartChatForNewModeFromMenu])

  const openQuickTest = useCallback(() => {
    writeEntryContext({
      source: 'internal_menu',
      audience: settings.audience === 'child' ? 'child' : 'adult',
    })
    window.location.assign('/test')
  }, [settings.audience])

  const goToStartScreen = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    const nextSettings = normalizeSettingsForAudience({
      ...settings,
      openAiChatPreset: 'gpt-4o-mini',
    })
    setSettings(nextSettings)
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setHomeMenuView('root')
    setHomeAudienceChosen(false)
    setMenuOpen(false)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    resetStructuredLessonSession()
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = false
    setWelcomeCompact(false)
    setGreetingNonce((n) => n + 1)
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    saveState([], nextSettings)
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, resetStructuredLessonSession, settings])

  const homeLessonMenuRestore = React.useMemo(() => {
    if (!pendingHomeLessonMenuRestore || dialogStarted || homeMenuView !== 'lessons' || !lessonMenuContext) {
      return null
    }
    return {
      panel: lessonMenuContext.lessonsPanel,
      context: {
        activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
        activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
        theorySearchQuery: lessonMenuContext.theorySearchQuery,
        activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
        theoryLessonSource: lessonMenuContext.theoryLessonSource,
        theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
        practiceTheoryTagFilterId: lessonMenuContext.practiceTheoryTagFilterId,
        selectedLessonId: lessonMenuContext.selectedLessonId,
        catalogBrowseIntent: lessonMenuContext.catalogBrowseIntent ?? null,
      },
    }
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, lessonMenuContext])

  React.useEffect(() => {
    if (!pendingHomeLessonMenuRestore || dialogStarted || homeMenuView !== 'lessons') return
    setPendingHomeLessonMenuRestore(false)
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, homeLessonMenuRestore])

  const backToLessonList = useCallback(() => {
    const launchSurface = lessonMenuLaunchSurfaceRef.current
    const fromMyPlan = openedFromMyPlanRef.current
    if (fromMyPlan) openedFromMyPlanRef.current = false
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    // Сохраняем контекст ветки уроков, чтобы "Назад" возвращал в тот же раздел.
    resetStructuredLessonSession({ keepLessonMenuContext: !fromMyPlan })
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    if (fromMyPlan) {
      setHomeMenuView('myPlan')
      if (launchSurface === 'slide') {
        setMenuOpen(true)
        return
      }
      setMenuOpen(false)
      return
    }
    if (launchSurface === 'slide') {
      restoreLessonMenuOnNextOpenRef.current = true
      setHomeMenuView('lessons')
      setMenuOpen(true)
      return
    }
    setHomeMenuView('lessons')
    setPendingHomeLessonMenuRestore(true)
    setMenuOpen(false)
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, resetStructuredLessonSession])

  const backToVocabularyMenu = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
    setDialogStarted(false)
    setMessages([])
    setSettingsAtLastSend(null)
    setHomeMenuView('lessons')
    setMenuOpen(false)
    setLoading(false)
    setRetryMessage(null)
    setForceNextMicLang(null)
    setLoadingTranslationIndex(null)
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
    setEngvoVoiceMode(false)
    setEngvoCallPhase('idle')
    setEngvoErrorText(null)
    setFooterTransitionText(null)
    bumpFooterSessionContext()
    resetStructuredLessonSession()
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'words' })
  }, [bumpFooterSessionContext, cleanupEngvoRuntime, resetStructuredLessonSession])

  const retryFirstMessage = useCallback(async () => {
    const requestId = ++firstMessageRequestIdRef.current
    setMessages([])
    setSettingsAtLastSend(null)
    setLoading(true)
    setRetryMessage(null)
    try {
      const response = await sendToApi([], { onRetryStatus: setRetryMessage })
      if (requestId !== firstMessageRequestIdRef.current) return
      incrementUsageToday()
      const { content: main, translation } = parseContentWithTranslation(response.content)
      setMessages([
        {
          role: 'assistant',
          content: main,
          translation,
          dialogueCorrect: response.dialogueCorrect,
          webSearchSources: response.webSearchSources,
          webSearchSourcesRequested: response.webSearchSourcesRequested,
          webSearchSourcesHiddenCount: response.webSearchSourcesHiddenCount,
          webSearchTriggered: response.webSearchTriggered,
        },
      ])
      setSettingsAtLastSend(settings)
      void fetchUsage()
    } catch (e) {
      console.error(e)
      if (requestId !== firstMessageRequestIdRef.current) return
      const errMsg = e instanceof Error ? e.message : ERROR_FIRST_MESSAGE
      setMessages([{ role: 'assistant', content: errMsg }])
    } finally {
      suppressSettingsChangeBannerRef.current = false
      if (requestId === firstMessageRequestIdRef.current) {
        setLoading(false)
        setRetryMessage(null)
      }
    }
  }, [sendToApi, fetchUsage, settings])

  React.useLayoutEffect(() => {
    try {
      const state = loadState()
      const rewards = reconcileModeGoalSessions(loadRewardsState())
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true
        setMessages([])
        const mergedSettings = normalizeSettingsForAudience({
          ...state.settings,
          openAiChatPreset: 'gpt-4o-mini',
          ...(entryBridge?.audienceChosen && entryBridge.audience
            ? { audience: entryBridge.audience }
            : {}),
        })
        setSettings(mergedSettings)
        if (entryBridge?.audienceChosen) {
          setHomeAudienceChosen(true)
          const view = resolveReturningHomeMenuView({
            branchIntent: entryBridge.branchIntent,
          })
          if (view) setHomeMenuView(view)
        }
        setDialogStarted(false)
        setMenuOpen(false)
        setEngvoProvider(loadEngvoProvider())
        setEngvoRealtimeVoice(loadEngvoRealtimeVoice())
        setEngvoXaiVoice(loadEngvoXaiVoice())
        setEngvoXaiVoiceRotationMode(loadEngvoXaiVoiceRotationMode())
        const loadedEngvoLevel = loadEngvoCefrLevel(mergedSettings.audience)
        setEngvoCefrLevel(loadedEngvoLevel)
        setEngvoSpeechSpeedPreset(
          resolveEngvoSpeechSpeedPreset({
            audience: mergedSettings.audience,
            level: loadedEngvoLevel,
          })
        )
        setEngvoSessionKind(loadEngvoSessionKind())
        setEngvoTeacherTense(loadEngvoTeacherTense(mergedSettings.audience))
        setEngvoTeacherSentenceType(loadEngvoTeacherSentenceType())
        setPracticeTtsSpeedDefaultIndex(loadPracticeTtsSpeedDefaultIndex())
        const loadedChatPattern = loadChatPattern()
        const loadedChatPatternTuningMap = loadChatPatternTuningMap()
        setChatPatternId(loadedChatPattern)
        setChatPatternTuningMap(loadedChatPatternTuningMap)
        applyChatPatternState(loadedChatPattern, loadedChatPatternTuningMap)
      }
      setRewardsState(rewards)
      rewardsPersistReadyRef.current = true
      setInitialized(true)
    } catch (error) {
      console.error('Failed to load persisted app state', error)
    } finally {
      setStorageLoaded(true)
      setFooterHydrated(true)
    }
    // Mount-only hydration: entryBridge is read once via initialLoadDoneRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    void loadLessonById('1').catch(() => {})
  }, [storageLoaded])

  useEffect(() => {
    if (!storageLoaded) return
    onRuntimeReady?.()
  }, [storageLoaded, onRuntimeReady])

  useEffect(() => {
    if (!storageLoaded) return
    if (!entryBridge?.audienceChosen || !entryBridge.audience) return
    setSettings((prev) =>
      normalizeSettingsForAudience({
        ...prev,
        audience: entryBridge.audience!,
      })
    )
    setHomeAudienceChosen(true)
    const view = resolveReturningHomeMenuView({
      branchIntent: entryBridge.branchIntent,
    })
    if (view) setHomeMenuView(view)
  }, [
    storageLoaded,
    entryBridge?.audience,
    entryBridge?.audienceChosen,
    entryBridge?.branchIntent,
  ])

  useEffect(() => {
    if (!storageLoaded || !homeAudienceChosen) return
    const intent = peekOpenLessonIntent()
    if (!intent) return
    if (intent.audience && intent.audience !== settings.audience) {
      // Wait until audience matches after gate / bridge apply.
      return
    }
    const consumed = consumeOpenLessonIntent()
    if (!consumed) return
    const lesson = getLearningLessonById(consumed.lessonId)
    if (!lesson) {
      clearOpenLessonIntent()
      setRetryMessage(QUICK_TEST_COPY.lessonMissingNotice)
      return
    }
    void openLearningLesson(consumed.lessonId, 'a2')
    // openLearningLesson is stable enough; avoid re-firing on every settings tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLoaded, homeAudienceChosen, settings.audience])

  useEffect(() => {
    if (!storageLoaded) return
    saveEngvoCefrLevel(engvoCefrLevel)
  }, [engvoCefrLevel, storageLoaded])

  useEffect(() => {
    if (!storageLoaded) return
    const timerId = window.setTimeout(() => {
      maybeFetchUsage()
    }, 2000)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [storageLoaded, maybeFetchUsage])

  useEffect(() => {
    if (!menuOpen) return
    maybeFetchUsage()
  }, [menuOpen, maybeFetchUsage])

  // Если пользователь переключил аудиторию на "Ребёнок" - автоматически принудим тему и уровень.
  useEffect(() => {
    if (!storageLoaded) return
    setSettings((prev) => normalizeSettingsForAudience(prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLoaded, settings.audience])

  useEffect(() => {
    if (newDialogRef.current) return
    if (
      shouldAutoRequestFirstChatMessage({
        storageLoaded,
        initialized,
        dialogStarted,
        messagesLength: messages.length,
        loading,
        activeStructuredLesson: Boolean(activeStructuredLesson),
        vocabularyWorldsActive,
        vocabularyByLevelActive,
        engvoVoiceMode,
      })
    ) {
      ensureFirstMessage()
    }
  }, [
    storageLoaded,
    initialized,
    dialogStarted,
    messages.length,
    loading,
    ensureFirstMessage,
    activeStructuredLesson,
    vocabularyWorldsActive,
    vocabularyByLevelActive,
    engvoVoiceMode,
  ])

  useEffect(() => {
    return () => {
      cleanupEngvoRuntime({ markIgnoredCurrent: true })
    }
  }, [cleanupEngvoRuntime])

  useEffect(() => {
    if (!storageLoaded) return
    if (messages.length === 0 && !dialogStarted) return
    saveState(messages, settings)
  }, [storageLoaded, messages, settings, dialogStarted])

  useEffect(() => {
    if (!storageLoaded) return
    setRewardsState((prev) => reconcileModeGoalSessions(prev))
  }, [storageLoaded, dialogStarted, settings.mode, engvoVoiceMode])

  useEffect(() => {
    if (!storageLoaded || !rewardsPersistReadyRef.current) return
    saveRewardsState(rewardsState)
  }, [storageLoaded, rewardsState])

  useEffect(() => {
    if (!storageLoaded || !activeStructuredLesson) {
      processedLessonXpAwardNonceRef.current = 0
      processedLessonXpAwardKeyRef.current = null
      globalLessonXpAwardedThisRunRef.current = 0
      return
    }
    const lessonKey = `${activeStructuredLesson.id}:${activeStructuredLesson.runKey ?? 'static'}`
    if (processedLessonXpAwardKeyRef.current !== lessonKey) {
      processedLessonXpAwardKeyRef.current = lessonKey
      processedLessonXpAwardNonceRef.current = activeStructuredLessonLastXpAward.nonce
      globalLessonXpAwardedThisRunRef.current = 0
      return
    }
    if (activeStructuredLessonLastXpAward.nonce <= processedLessonXpAwardNonceRef.current) return
    processedLessonXpAwardNonceRef.current = activeStructuredLessonLastXpAward.nonce

    const sessionTotal = activeStructuredLessonCoreXp + activeStructuredLessonComboXp
    const progress = loadLessonProgress(activeStructuredLesson.id)
    const previousBest = progress?.bestTotalXp ?? 0
    const { amount } = resolveGlobalLessonXpDelta({
      sessionTotalXp: sessionTotal,
      previousBestTotalXp: previousBest,
      alreadyAwardedThisRun: globalLessonXpAwardedThisRunRef.current,
    })
    setLastStructuredLessonGlobalDelta(amount)
    if (amount <= 0) return
    globalLessonXpAwardedThisRunRef.current += amount
    setRewardsState((prev) => applyRewardsEvent(prev, { type: 'lesson_xp_awarded', amount }))
  }, [
    storageLoaded,
    activeStructuredLesson,
    activeStructuredLessonCoreXp,
    activeStructuredLessonComboXp,
    activeStructuredLessonLastXpAward,
  ])

  useEffect(() => {
    if (!storageLoaded || !activeStructuredLesson) {
      processedLessonCoinAwardKeyRef.current = null
      setLessonFinaleCoinAward(null)
      return
    }
    if (activeStructuredLessonStatus !== 'completed') {
      setLessonFinaleCoinAward(null)
      return
    }

    const lessonId = activeStructuredLesson.id
    const runKey = `${lessonId}:${activeStructuredLesson.runKey ?? 'static'}`
    if (processedLessonCoinAwardKeyRef.current === runKey) return
    processedLessonCoinAwardKeyRef.current = runKey

    const coreMedal = resolveMedalFromCoreXp(
      activeStructuredLessonCoreXp,
      true,
      activeStructuredLessonMaxCoreXp
    )

    let displayAward: LessonCoinAward = { amount: 0, reason: 'lesson_not_gold' }
    setRewardsState((prev) => {
      const resolved = resolveLessonCoinAward({
        lessonId,
        coreMedal,
        lessonGoldClaimed: prev.coinLedger?.lessonGoldClaimed ?? {},
      })
      displayAward = resolved
      if (resolved.amount <= 0) return prev

      const awarded = awardCoins(prev, resolved.amount, { lessonIdForLedger: lessonId })
      if (!awarded.ok) return prev

      return applyRewardsEvent(awarded.state, {
        type: 'coins_earned',
        amount: resolved.amount,
        reason: 'lesson_gold',
        ticker: 'Золотая медаль. +1 🪙.',
      })
    })
    setLessonFinaleCoinAward(displayAward)
  }, [
    storageLoaded,
    activeStructuredLesson,
    activeStructuredLessonStatus,
    activeStructuredLessonCoreXp,
    activeStructuredLessonMaxCoreXp,
  ])

  useEffect(() => {
    if (!storageLoaded || !practiceSession.session || practiceSession.session.status !== 'completed') return
    const practiceRewardKey = practiceSession.session.id
    if (rewardedPracticeSessionRef.current === practiceRewardKey) return
    rewardedPracticeSessionRef.current = practiceRewardKey

    const lessonMedal = loadLessonProgress(practiceSession.session.lessonId)?.medal ?? null
    const resolved = resolvePracticeCompletion({
      session: practiceSession.session,
      lessonMedal,
      audience: settings.audience,
    })

    setPracticeRewardUi(resolved.rewardUi)
    setPracticeCompletionMeta({
      tier: resolved.reward.tier,
      globalAmount: resolved.reward.globalAmount,
      globalReason: resolved.reward.globalReason,
      ringCount: resolved.reward.progress.ringCount,
      ringIncremented: resolved.reward.ringIncremented,
      canEarnRingToday: resolveCanEarnRingToday({
        tier: resolved.reward.tier,
        ringCount: resolved.reward.progress.ringCount,
        lastQualifyingDayKey: resolved.reward.progress.lastQualifyingDayKey,
        todayKey: getPracticeEconomyDayKey(),
      }),
      coinsAwarded: resolved.coinsAwarded,
      cupAwarded: resolved.reward.cupAwarded,
      pendingPracticeCoins: resolved.reward.progress.pendingPracticeCoins ?? 0,
      pendingCup: Boolean(resolved.reward.progress.pendingCup),
      baseBadgeAwarded: resolved.baseBadgeAwarded,
      baseBadgeClaimed: Boolean(resolved.reward.progress.baseBadgeClaimedAt),
      badgeLine: resolved.badgeLine,
      badgeRankAwarded: resolved.badgeRankAwarded,
      masteryScore: resolved.masteryScore,
      effectiveMasteryScore: resolved.effectiveMasteryScore,
      correctedCount: resolved.correctedCount,
      plannedLength: resolved.plannedLength,
      forgivenessUsed: resolved.forgivenessUsed,
      gemsPending: resolved.reward.progress.gemsPending,
      cupClaimed: resolved.reward.progress.cupClaimed,
    })
    setPracticeProgressRevision((n) => n + 1)

    recordLessonOrPracticeResolved({ lessonId: practiceSession.session.lessonId })

    if (resolved.activityNeeded || resolved.globalXpToAward > 0 || resolved.coinMilestones.length > 0) {
      setRewardsState((prev) => {
        let next = resolved.activityNeeded ? withDailyActivity(prev) : prev
        if (resolved.globalXpToAward > 0) {
          next = applyRewardsEvent(next, {
            type: 'practice_completed',
            amount: resolved.globalXpToAward,
            ticker: resolved.reward.ticker,
          })
        }
        for (const milestone of resolved.coinMilestones) {
          const awarded = awardCoins(next, milestone.amount, {
            practiceMilestoneForLedger: milestone.key,
          })
          if (awarded.ok) {
            next = applyRewardsEvent(awarded.state, {
              type: 'coins_earned',
              amount: milestone.amount,
              reason: 'practice_milestone',
              ticker: resolved.reward.ticker,
            })
          }
        }
        return next
      })
    }
  }, [storageLoaded, practiceSession.session, settings.audience])

  useEffect(() => {
    if (!storageLoaded || !practiceRewardUi?.showPopup) return
    if (practicePopupSeenRef.current === practiceRewardUi.id) return
    practicePopupSeenRef.current = practiceRewardUi.id
    if (engvoVoiceMode) return

    setRewardPopupText(null)
    const showTimerId = window.setTimeout(() => {
      setRewardPopupText(practiceRewardUi.popupText)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS)
    const hideTimerId = window.setTimeout(() => {
      setRewardPopupText(null)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS + REWARD_POPUP_VISIBLE_MS)
    return () => {
      window.clearTimeout(showTimerId)
      window.clearTimeout(hideTimerId)
    }
  }, [storageLoaded, practiceRewardUi, engvoVoiceMode])

  useEffect(() => {
    if (!storageLoaded) return
    const lastReward = rewardsState.ui.lastReward
    const rewardAt = lastReward?.at
    if (!rewardAt || !lastReward) return
    const marker = `${rewardAt}:${rewardsState.ui.lastLevelUp?.at ?? ''}`
    if (rewardPopupSeenRef.current === null) {
      rewardPopupSeenRef.current = marker
      return
    }
    if (rewardPopupSeenRef.current === marker) return
    rewardPopupSeenRef.current = marker
    const levelUpNow = rewardsState.ui.lastLevelUp?.at === rewardAt ? rewardsState.ui.lastLevelUp : null
    const shouldToast = rewardReasonShowsToast(
      lastReward.reason,
      Boolean(levelUpNow),
      lastReward.streakBonus
    )
    if (!shouldToast || engvoVoiceMode) {
      return
    }
    const topLineText = formatRewardTopLine({
      reason: lastReward.reason,
      amount: lastReward.amount,
      audience: settings.audience,
      fallback: rewardsState.ui.footerTicker,
    })
    const popupText = buildRewardPopupText({
      reason: lastReward.reason,
      amount: lastReward.amount,
      levelUp: levelUpNow ? { from: levelUpNow.from, to: levelUpNow.to } : null,
      audience: settings.audience,
      avoidText: topLineText,
      streakBonus: lastReward.streakBonus,
      dailyStreakAtAward: lastReward.dailyStreakAtAward,
    })
    setRewardPopupText(null)
    const showTimerId = window.setTimeout(() => {
      setRewardPopupText(popupText)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS)
    const hideTimerId = window.setTimeout(() => {
      setRewardPopupText(null)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS + REWARD_POPUP_VISIBLE_MS)
    return () => {
      window.clearTimeout(showTimerId)
      window.clearTimeout(hideTimerId)
    }
  }, [
    settings.audience,
    rewardsState.ui.footerTicker,
    storageLoaded,
    rewardsState.ui.lastLevelUp,
    rewardsState.ui.lastReward,
    engvoVoiceMode,
  ])

  useEffect(() => {
    if (!engvoVoiceMode) return
    setRewardPopupText(null)
  }, [engvoVoiceMode])

  const handleSend = useCallback(
    async (text: string) => {
      if (engvoVoiceMode) return
      if (atLimit) return
      suppressSettingsChangeBannerRef.current = false
      const explicitTranslateTarget =
        settings.mode === 'communication' ? extractExplicitTranslateTarget(text) : null
      const sourceRequestOnly =
        settings.mode === 'communication' &&
        !explicitTranslateTarget &&
        shouldRequestOpenAiWebSearchSources(text)
      const sourceRequestShowAll =
        settings.mode === 'communication' &&
        !explicitTranslateTarget &&
        shouldRequestAllOpenAiWebSearchSources(text)
      const userMsg: ChatMessage = { role: 'user', content: text }
      const nextCommunicationExpectedLang =
        settings.mode === 'communication'
          ? getCommunicationInputExpectedFromText(
              text,
              settings.communicationInputExpectedLang,
              communicationVoiceInputMode
            )
          : null
      if (settings.mode === 'communication') {
        if (nextCommunicationExpectedLang) {
          communicationInputExpectedLangRef.current = nextCommunicationExpectedLang
        }
        setSettings((prev) => {
          const nextExpectedLang = nextCommunicationExpectedLang ?? prev.communicationInputExpectedLang
          const nextVoiceMode =
            prev.communicationVoiceInputMode === 'mix' ? 'mix' : (nextExpectedLang as Exclude<CommunicationVoiceInputMode, 'mix'>)
          return {
            ...prev,
            communicationInputExpectedLang: nextExpectedLang,
            communicationVoiceInputMode: nextVoiceMode,
          }
        })
      }
      const nextMessages = [...messages, userMsg]
      const shouldSearchInternet = predictWillFetchFromInternet({
        mode: settings.mode,
        explicitTranslateTarget,
        rawText: text,
        messagesWithCurrentUser: nextMessages,
      })
      setMessages(nextMessages)
      if (settings.mode === 'communication') {
        const recentAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
        scheduleSilentAssess({
          text,
          provider: settings.provider === 'openai' ? 'openai' : 'openrouter',
          openAiChatPreset: settings.openAiChatPreset,
          audience: settings.audience,
          mode: 'communication',
          source: 'chat',
          communicationVoiceInputMode,
          recentAssistantText: recentAssistant?.content ?? null,
        })
        const indicatorLang = getExpectedCommunicationReplyLang(nextMessages, {
          inputPreference: nextCommunicationExpectedLang ?? settings.communicationInputExpectedLang,
          voiceInputMode: communicationVoiceInputMode,
        })
        setSearchingInternetLang(indicatorLang === 'en' ? 'en' : 'ru')
      }
      if (sourceRequestOnly || sourceRequestShowAll) {
        const previousAssistantMessage = [...messages]
          .reverse()
          .find((message) => message.role === 'assistant')
        const previousWebSearchSources = previousAssistantMessage?.webSearchSources ?? []

        if (!previousAssistantMessage || previousWebSearchSources.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Не нашёл сохранённых источников для предыдущего ответа. Сначала попросите проверить информацию в интернете.',
            },
          ])
          setSettingsAtLastSend(settings)
          return
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: sourceRequestShowAll
              ? 'Показываю все источники по предыдущему ответу.'
              : 'Вот источники по предыдущему ответу.',
            webSearchSourcesRequested: true,
            webSearchSources: previousWebSearchSources,
            webSearchSourcesShowAll: sourceRequestShowAll,
            webSearchSourcesHiddenCount: previousAssistantMessage.webSearchSourcesHiddenCount,
          },
        ])
        setSettingsAtLastSend(settings)
        return
      }
      setSearchingInternet(shouldSearchInternet)
      setLoading(true)
      try {
        const response = await sendToApi(nextMessages, { onRetryStatus: setRetryMessage })
        incrementUsageToday()
        const { content: main, translation } = parseContentWithTranslation(response.content)
        setLoading(false)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: main,
            translation,
            dialogueCorrect: response.dialogueCorrect,
            webSearchSources: response.webSearchSources,
            webSearchSourcesRequested: response.webSearchSourcesRequested,
            webSearchSourcesHiddenCount: response.webSearchSourcesHiddenCount,
            webSearchTriggered: response.webSearchTriggered,
          },
        ])
        recordAssistantTurnLearningSignal({
          mode: settings.mode,
          engvoVoiceMode,
          tenses: settings.tenses,
          topic: settings.topic,
          lastUserText: text,
          assistantContent: main,
          dialogueCorrect: response.dialogueCorrect,
        })
        if (settings.mode === 'communication') {
          bumpCommunicationGoal()
        }
        setSettingsAtLastSend(settings)
        void fetchUsage()
      } catch (e) {
        console.error(e)
        const errText = e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте снова.'
        if (
          errText.startsWith('Диалог слишком длинный') ||
          errText.startsWith('ИИ сейчас перегружен и немного «ушёл отдыхать»')
        ) {
          // Автоматический мягкий сброс слишком длинного диалога или перегрузки:
          // очищаем историю и сразу запрашиваем новый вопрос.
          newDialogRef.current = true
          setMessages([])
          setSettingsAtLastSend(null)
          setDialogStarted(false)
          setTimeout(() => {
            ensureFirstMessage()
          }, 50)
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: errText }])
        }
      } finally {
        setLoading(false)
        setSearchingInternet(false)
      }
    },
    [messages, atLimit, sendToApi, fetchUsage, settings, ensureFirstMessage, engvoVoiceMode, communicationVoiceInputMode, bumpCommunicationGoal]
  )

  function isRetryableTranslationError(message: string): boolean {
    return (
      message.startsWith('Превышен лимит') ||
      message.startsWith('Модель вернула пустой перевод') ||
      message.startsWith('Ответ занял слишком много времени') ||
      message.startsWith('Нет связи с сервером') ||
      message.startsWith('Не удалось загрузить перевод')
    )
  }

  const applyEngvoCallTranslationToMessages = useCallback(
    (
      prev: ChatMessage[],
      index: number,
      text: string,
      translation?: string,
      translationError?: string,
      responseId?: string | null
    ): ChatMessage[] => {
      const resolvedIndex = findAssistantIndexByTranslationText(prev, index, text)
      if (prev[resolvedIndex]?.role === 'assistant') {
        const next = [...prev]
        next[resolvedIndex] = { ...next[resolvedIndex], translation, translationError }
        return next
      }
      if (responseId) {
        engvoPendingTranslationByResponseIdRef.current.set(responseId, { translation, translationError })
      }
      return prev
    },
    []
  )

  const handleRequestEngvoCallTranslation = useCallback(
    async (
      index: number,
      text: string,
      options?: { silent?: boolean; responseId?: string | null }
    ) => {
      const silent = options?.silent === true
      const responseId = options?.responseId ?? null
      const trimmed = text.trim()
      if (!trimmed) return

      const resolvedIndex = findAssistantIndexByTranslationText(messages, index, trimmed)
      if (silent && messages[resolvedIndex]?.translation?.trim()) return

      const inflightKey = responseId ?? trimmed
      if (silent && engvoCallTranslationInflightRef.current.has(inflightKey)) {
        await engvoCallTranslationInflightRef.current.get(inflightKey)
        return
      }

      if (!silent) {
        setLoadingEngvoCallTranslationIndex(resolvedIndex)
        setMessages((prev) => {
          const ri = findAssistantIndexByTranslationText(prev, index, trimmed)
          const next = [...prev]
          if (next[ri]?.role === 'assistant') {
            next[ri] = { ...next[ri], translation: undefined, translationError: undefined }
          }
          return next
        })
      }

      const setResult = (translation?: string, translationError?: string) => {
        setMessages((prev) => applyEngvoCallTranslationToMessages(prev, index, trimmed, translation, translationError, responseId))
      }

      type TranslateErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined
      type TranslateProvider = 'openrouter' | 'openai'
      type TranslateResponse = {
        content?: string
        error?: string
        errorCode?: TranslateErrorCode
        provider?: TranslateProvider
      }
      type AttemptResult =
        | { ok: true; content: string }
        | { ok: false; error: string; errorCode?: TranslateErrorCode; provider: TranslateProvider }

      const provider: TranslateProvider = settings.provider === 'openai' ? 'openai' : 'openrouter'
      let lastError = 'Не удалось загрузить перевод.'

      const requestTranslateOnce = async (): Promise<AttemptResult> => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: trimmed,
              provider,
              context: 'engvo',
              openAiChatPreset: settings.openAiChatPreset,
              audience: settings.audience,
              mode: 'communication',
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          let data: TranslateResponse
          try {
            data = (await res.json()) as TranslateResponse
          } catch {
            data = {
              error: res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.',
              errorCode: res.status === 429 ? 'rate_limit' : 'upstream_error',
              provider,
            }
          }
          const content = data.content?.trim()
          if (content && res.ok) return { ok: true, content }
          return {
            ok: false,
            error: data.error ?? (res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.'),
            errorCode: data.errorCode,
            provider: data.provider ?? provider,
          }
        } catch (e) {
          clearTimeout(timeoutId)
          const err = e instanceof Error ? e : new Error('Unknown error')
          const translatedError =
            err.name === 'AbortError'
              ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
              : err.message === 'Failed to fetch' || err.name === 'TypeError'
                ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
                : 'Не удалось загрузить перевод.'
          return { ok: false, error: translatedError, provider }
        }
      }

      const run = async () => {
        let translated = false
        const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1
        for (let attempt = 0; attempt < maxAttemptsForProvider && !translated; attempt++) {
          const result = await requestTranslateOnce()
          if (result.ok) {
            setResult(result.content)
            translated = true
            break
          }
          lastError = result.error
          const isRateLimit = result.errorCode === 'rate_limit' || /лимит|Too Many Requests/i.test(lastError)
          const isForbidden = result.errorCode === 'forbidden'
          const isUnauthorized = result.errorCode === 'unauthorized'
          const isNetworkLike = /Нет связи с сервером|занял слишком много времени/i.test(lastError)
          if (provider === 'openai' && (isForbidden || isUnauthorized)) break
          const canRetryThisProvider =
            attempt < maxAttemptsForProvider - 1 &&
            (isRateLimit || isNetworkLike || isRetryableTranslationError(lastError))
          if (!canRetryThisProvider) break
          await sleep(150)
          const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
          await sleep(backoffMs)
        }
        if (!translated) {
          setResult(undefined, lastError)
        }
      }

      if (silent) {
        setEngvoCallTranslationPrefetchText(trimmed)
        const promise = run().finally(() => {
          engvoCallTranslationInflightRef.current.delete(inflightKey)
          setEngvoCallTranslationPrefetchText((cur) => (cur === trimmed ? null : cur))
        })
        engvoCallTranslationInflightRef.current.set(inflightKey, promise)
        await promise
      } else {
        try {
          await run()
        } finally {
          setLoadingEngvoCallTranslationIndex(null)
        }
      }
    },
    [
      messages,
      settings.provider,
      settings.openAiChatPreset,
      settings.audience,
      applyEngvoCallTranslationToMessages,
    ]
  )

  const prefetchEngvoCallTranslation = useCallback(
    (text: string, responseId: string | null) => {
      const trimmed = text.trim()
      if (!trimmed || !engvoVoiceMode) return
      if (detectTextLang(trimmed) !== 'en') return
      void handleRequestEngvoCallTranslation(-1, trimmed, { silent: true, responseId })
    },
    [engvoVoiceMode, handleRequestEngvoCallTranslation]
  )

  prefetchEngvoCallTranslationRef.current = prefetchEngvoCallTranslation

  const handleRequestTranslation = useCallback(async (index: number, text: string) => {
    if (!text.trim()) return
    const resolvedIndex = findAssistantIndexByTranslationText(messages, index, text)
    setLoadingTranslationIndex(resolvedIndex)
    const setResult = (translation?: string, translationError?: string) => {
      setMessages((prev) => {
        const next = [...prev]
        const resolvedIndex = findAssistantIndexByTranslationText(next, index, text)
        if (next[resolvedIndex]?.role === 'assistant') {
          next[resolvedIndex] = { ...next[resolvedIndex], translation, translationError }
        }
        return next
      })
    }
    setMessages((prev) => {
      const ri = findAssistantIndexByTranslationText(prev, index, text)
      const next = [...prev]
      if (next[ri]?.role === 'assistant') {
        next[ri] = { ...next[ri], translation: undefined, translationError: undefined }
      }
      return next
    })
    let lastError: string = 'Не удалось загрузить перевод.'
    type TranslateErrorCode = 'rate_limit' | 'unauthorized' | 'forbidden' | 'upstream_error' | undefined
    type TranslateProvider = 'openrouter' | 'openai'
    type TranslateResponse = {
      content?: string
      error?: string
      errorCode?: TranslateErrorCode
      provider?: TranslateProvider
    }
    type AttemptResult =
      | { ok: true; content: string }
      | { ok: false; error: string; errorCode?: TranslateErrorCode; provider: TranslateProvider }

    /** Строго выбранный в меню провайдер - без автоматического переключения OpenAI ↔ OpenRouter. */
    const provider: TranslateProvider = settings.provider === 'openai' ? 'openai' : 'openrouter'

    const requestTranslateOnce = async (): Promise<AttemptResult> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            provider,
            openAiChatPreset: settings.openAiChatPreset,
            audience: settings.audience,
            ...(settings.mode !== 'translation' ? { tenses: settings.tenses, mode: settings.mode } : {}),
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        let data: TranslateResponse
        try {
          data = (await res.json()) as TranslateResponse
        } catch {
          data = {
            error: res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.',
            errorCode: res.status === 429 ? 'rate_limit' : 'upstream_error',
            provider,
          }
        }
        const content = data.content?.trim()
        if (content && res.ok) return { ok: true, content }
        return {
          ok: false,
          error: data.error ?? (res.status === 502 ? 'Модель вернула пустой перевод.' : 'Не удалось загрузить перевод.'),
          errorCode: data.errorCode,
          provider: data.provider ?? provider,
        }
      } catch (e) {
        clearTimeout(timeoutId)
        const err = e instanceof Error ? e : new Error('Unknown error')
        const translatedError =
          err.name === 'AbortError'
            ? 'Ответ занял слишком много времени. Проверьте сеть и попробуйте снова.'
            : err.message === 'Failed to fetch' || err.name === 'TypeError'
              ? 'Нет связи с сервером. Проверьте интернет и ключ в меню.'
              : 'Не удалось загрузить перевод.'
        return { ok: false, error: translatedError, provider }
      }
    }

    let translated = false
    const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1

    for (let attempt = 0; attempt < maxAttemptsForProvider && !translated; attempt++) {
      const result = await requestTranslateOnce()
      if (result.ok) {
        setLoadingTranslationIndex(null)
        setResult(result.content)
        translated = true
        break
      }

      lastError = result.error
      const isRateLimit = result.errorCode === 'rate_limit' || /лимит|Too Many Requests/i.test(lastError)
      const isForbidden = result.errorCode === 'forbidden'
      const isUnauthorized = result.errorCode === 'unauthorized'
      const isNetworkLike = /Нет связи с сервером|занял слишком много времени/i.test(lastError)

      if (provider === 'openai' && (isForbidden || isUnauthorized)) {
        break
      }

      const canRetryThisProvider =
        attempt < maxAttemptsForProvider - 1 && (isRateLimit || isNetworkLike || isRetryableTranslationError(lastError))
      if (!canRetryThisProvider) break

      await sleep(150)
      const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
      await sleep(backoffMs)
    }

    if (!translated) {
      setLoadingTranslationIndex(null)
      setResult(undefined, lastError)
    }
  }, [messages, settings.provider, settings.openAiChatPreset, settings.audience, settings.mode, settings.tenses])

  const handleRequestPhraseTranslation = useCallback(
    async (text: string, signal: AbortSignal) => {
      const result = await requestPhraseTranslation({
        text,
        provider: settings.provider === 'openai' ? 'openai' : 'openrouter',
        openAiChatPreset: settings.openAiChatPreset,
        audience: settings.audience,
        signal,
      })
      if (result.ok) return { translation: result.translation }
      return { error: result.error }
    },
    [settings.provider, settings.openAiChatPreset, settings.audience]
  )

  /** Сравнение для баннера в шапке. В «Диалог» и «Перевод»: предупреждение только если изменился только уровень (без перезапуска из меню). Смена темы/времени/ребёнок–взрослый/типа даёт новый чат - баннер не нужен. */
  function settingsDiffersFromLastSendForBanner(current: Settings, last: Settings | null): boolean {
    if (!last) return false
    const sameTenses =
      current.tenses.length === last.tenses.length &&
      current.tenses.every((t, i) => t === last.tenses[i])

    if (
      (current.mode === 'dialogue' && last.mode === 'dialogue') ||
      (current.mode === 'translation' && last.mode === 'translation')
    ) {
      const onlyLevelChanged =
        current.topic === last.topic &&
        sameTenses &&
        current.audience === last.audience &&
        current.sentenceType === last.sentenceType &&
        current.level !== last.level
      return onlyLevelChanged
    }

    if (current.topic !== last.topic || !sameTenses || current.level !== last.level) return true
    if (current.mode === 'translation' && last.mode === 'translation' && current.sentenceType !== last.sentenceType)
      return true
    return false
  }

  /** Строка выбранного меню для шапки: единый формат для обоих режимов. */
  function getMenuSummary(includeTopic: boolean = true): string {
    if (settings.mode === 'communication') {
      if (settings.level === 'all') {
        return settings.communicationInputExpectedLang === 'en' ? 'Chat с Engvo' : 'Чат с Engvo'
      }
      const levelEntry = LEVELS.find((l) => l.id === settings.level)
      const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level
      const lang = getExpectedCommunicationReplyLang(messages, {
        inputPreference: settings.communicationInputExpectedLang,
        voiceInputMode: communicationVoiceInputMode,
      })
      const titlePrefix = lang === 'ru' ? 'Чат' : 'Chat'
      return `${titlePrefix} - ${levelShort}`
    }

    const modeLabel =
      settings.mode === 'dialogue' ? 'Диалог' : settings.mode === 'translation' ? 'Перевод' : 'Общение'
    const selectedTense = settings.tenses[0] ?? 'present_simple'
    const tenseLabel =
      selectedTense === 'all'
        ? 'Любое время'
        : (TENSES.find((t) => t.id === selectedTense)?.label ?? selectedTense)
    const levelEntry = LEVELS.find((l) => l.id === settings.level)
    const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level
    const normalizedLevelShort = settings.level === 'all' ? 'Все уровни' : levelShort
    const topicLabel = TOPICS.find((t) => t.id === settings.topic)?.label
    const shouldShowTopic =
      includeTopic &&
      Boolean(topicLabel) &&
      !(settings.mode === 'dialogue' && settings.topic === 'free_talk')
    if (shouldShowTopic && topicLabel) {
      return `${modeLabel} - ${topicLabel}, ${tenseLabel}, ${normalizedLevelShort}`
    }
    return `${modeLabel} - ${tenseLabel}, ${normalizedLevelShort}`
  }

  const activeLearningLesson = activeLearningLessonId ? getLearningLessonById(activeLearningLessonId) : null
  const isLessonActive = Boolean(activeLearningLesson)
  const isPracticeActive = dialogStarted && Boolean(practiceSession.session)
  const practiceSessionActiveForDebug =
    isPracticeActive && practiceSession.session?.status === 'active'
  const activePracticeMenuSnapshot = useMemo(
    () => buildActivePracticeMenuSnapshot(practiceSession.session),
    [practiceSession.session]
  )
  const isAccentActive = accentTrainerActive
  const isVocabularyHubActive = vocabularyWorldsActive || vocabularyByLevelActive
  const activeLessonIntro =
    activeStructuredLesson?.intro ??
    activeLearningLesson?.intro ??
    (activeLearningLessonId ? getStructuredLessonById(activeLearningLessonId)?.intro ?? null : null)
  const activeTutorIntent = activeStructuredLesson?.tutorIntent ?? activeLearningLesson?.tutorIntent ?? null
  const isTutorLessonPending = structuredLessonLoadingId === 'tutor' && Boolean(pendingTutorLessonTitle)
  const activeReferenceSheet =
    lessonViewStage === 'reference' && activeLearningLessonId
      ? buildReferenceSheetByLessonId(activeLearningLessonId)
      : null
  const isReferenceSheetActive = Boolean(activeReferenceSheet && lessonViewStage === 'reference')
  const isLessonIntroActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'intro')
  const isLessonTipsActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'tips')
  const isLessonBriefingActive = Boolean(activeStructuredLesson && activeLearningLesson && lessonViewStage === 'briefing')
  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')

  const activeBranchResolved = useMemo(
    (): BranchId | null =>
      resolveActiveBranch({
        dialogStarted,
        homeMenuView,
        engvoVoiceMode,
        isVocabularyHubActive,
        isAccentActive,
        isPracticeActive,
        isStructuredLessonActive,
        isLessonIntroActive,
        isLessonTipsActive,
        isLessonBriefingActive,
        isTutorLessonPending,
        isReferenceSheetActive,
      }),
    [
      dialogStarted,
      engvoVoiceMode,
      homeMenuView,
      isAccentActive,
      isLessonBriefingActive,
      isLessonIntroActive,
      isLessonTipsActive,
      isPracticeActive,
      isReferenceSheetActive,
      isStructuredLessonActive,
      isTutorLessonPending,
      isVocabularyHubActive,
    ]
  )

  useEffect(() => {
    if (!storageLoaded || !activeBranchResolved) return
    void ensureBranchMounted(activeBranchResolved)
  }, [storageLoaded, activeBranchResolved, ensureBranchMounted])

  useEffect(() => {
    if (!storageLoaded || !homeAudienceChosen) return
    prefetchBranch('hub')
  }, [storageLoaded, homeAudienceChosen])

  useEffect(() => {
    if (!storageLoaded) return
    if (homeMenuView === 'lessons') {
      prefetchBranch('lesson')
      prefetchBranch('practice')
      return
    }
    if (homeMenuView === 'aiChat') {
      prefetchBranch('chat')
    }
  }, [storageLoaded, homeMenuView])

  useEffect(() => {
    if (!storageLoaded || !dialogStarted) return
    if (activeStructuredLesson || structuredLessonLoadingId) {
      prefetchBranch('lesson')
    }
  }, [storageLoaded, dialogStarted, activeStructuredLesson, structuredLessonLoadingId])

  useEffect(() => {
    handleStructuredLessonPuzzleProgressChange(null)
  }, [
    activeStructuredLessonCurrentStep,
    activeStructuredLessonStep?.stepNumber,
    handleStructuredLessonPuzzleProgressChange,
  ])

  const lessonHeaderProgressLabel = useMemo(() => {
    if (!isStructuredLessonActive) return null
    return formatLessonHeaderProgressLabel({
      isFinale: activeStructuredLessonIsFinale,
      currentStepIndex: activeStructuredLessonCurrentStep,
      totalSteps: activeStructuredLessonTotalSteps,
      stepNumber: activeStructuredLessonStep?.stepNumber,
      variantProgress: activeStructuredLessonFooterVariantProgress,
      puzzleSubIndex: activeStructuredLessonPuzzleProgress?.subIndex,
      puzzleSubTotal: activeStructuredLessonPuzzleProgress?.subTotal,
    })
  }, [
    isStructuredLessonActive,
    activeStructuredLessonIsFinale,
    activeStructuredLessonCurrentStep,
    activeStructuredLessonTotalSteps,
    activeStructuredLessonStep?.stepNumber,
    activeStructuredLessonFooterVariantProgress,
    activeStructuredLessonPuzzleProgress,
  ])

  const lessonHeaderProgressAriaLabel = useMemo(() => {
    if (!isStructuredLessonActive) return null
    return formatLessonHeaderProgressAriaLabel({
      isFinale: activeStructuredLessonIsFinale,
      currentStepIndex: activeStructuredLessonCurrentStep,
      totalSteps: activeStructuredLessonTotalSteps,
      stepNumber: activeStructuredLessonStep?.stepNumber,
      variantProgress: activeStructuredLessonFooterVariantProgress,
      puzzleSubIndex: activeStructuredLessonPuzzleProgress?.subIndex,
      puzzleSubTotal: activeStructuredLessonPuzzleProgress?.subTotal,
    })
  }, [
    isStructuredLessonActive,
    activeStructuredLessonIsFinale,
    activeStructuredLessonCurrentStep,
    activeStructuredLessonTotalSteps,
    activeStructuredLessonStep?.stepNumber,
    activeStructuredLessonFooterVariantProgress,
    activeStructuredLessonPuzzleProgress,
  ])

  const activeLessonTitle = activeLearningLesson?.title ?? null

  const lessonCoinIntroContext = React.useMemo((): LessonCoinIntroContext | null => {
    if (!activeStructuredLesson) return null
    const progress = loadLessonProgress(activeStructuredLesson.id)
    const origin = structuredLessonRunOriginRef.current
    return {
      audience: settings.audience,
      lessonCoinClaimed: isLessonGoldCoinClaimed(rewardsState, activeStructuredLesson.id),
      isGeneratedVariantRun:
        isAiGeneratedLessonRuntime(activeStructuredLesson) &&
        (activeLessonVariantNumber > 1 ||
          origin === 'post_lesson_repeat' ||
          origin === 'repeat_api' ||
          origin === 'menu_generate'),
      profileMedal: progress?.medal ?? null,
      runMedalCapSilver: structuredLessonSilverCap,
    }
  }, [
    activeStructuredLesson,
    activeLessonVariantNumber,
    rewardsState,
    settings.audience,
    structuredLessonSilverCap,
  ])

  const lessonReturnBriefing = React.useMemo(() => {
    if (lessonViewStage !== 'briefing' || !activeStructuredLesson) return null

    return resolveLessonReturnBriefing({
      lessonId: activeStructuredLesson.id,
      runKey: activeStructuredLesson.runKey,
      lessonTitle: activeLessonTitle ?? 'Урок',
      audience: settings.audience,
      origin: structuredLessonRunOriginRef.current,
      variantNumber: activeLessonVariantNumber,
      isRepeatRun: isStructuredLessonRepeatRun,
      coinIntroContext: lessonCoinIntroContext,
      acknowledgedRunKey: lessonReturnBriefingAckRunKey,
    })
  }, [
    lessonViewStage,
    activeStructuredLesson,
    activeLessonVariantNumber,
    isStructuredLessonRepeatRun,
    settings.audience,
    lessonReturnBriefingAckRunKey,
    activeLessonTitle,
    lessonCoinIntroContext,
  ])

  React.useEffect(() => {
    if (lessonViewStage !== 'briefing' || !activeStructuredLesson) return
    if (lessonReturnBriefing) return
    setLessonViewStage('lesson')
  }, [lessonViewStage, activeStructuredLesson, lessonReturnBriefing])

  const acknowledgeLessonReturnBriefing = React.useCallback((lesson?: LessonData) => {
    const target = lesson ?? activeStructuredLesson
    if (!target) return
    const runKey = buildLessonReturnBriefingRunKey(target.id, target.runKey)
    setLessonReturnBriefingAckRunKey(runKey)
    setLessonViewStage('lesson')
  }, [activeStructuredLesson])

  React.useEffect(() => {
    acknowledgeLessonReturnBriefingRef.current = acknowledgeLessonReturnBriefing
  })

  const enterLessonFromIntro = React.useCallback(() => {
    if (!activeStructuredLesson) return
    setLastStructuredLessonGlobalDelta(0)
    bumpFooterSessionContext()

    const briefing = resolveLessonReturnBriefing({
      lessonId: activeStructuredLesson.id,
      runKey: activeStructuredLesson.runKey,
      lessonTitle: activeLessonTitle ?? 'Урок',
      audience: settings.audience,
      origin: structuredLessonRunOriginRef.current,
      variantNumber: activeLessonVariantNumber,
      isRepeatRun: isStructuredLessonRepeatRun,
      coinIntroContext: lessonCoinIntroContext,
      acknowledgedRunKey: lessonReturnBriefingAckRunKey,
    })

    setLessonViewStage(briefing ? 'briefing' : 'lesson')
  }, [
    activeStructuredLesson,
    activeLessonTitle,
    settings.audience,
    activeLessonVariantNumber,
    isStructuredLessonRepeatRun,
    lessonCoinIntroContext,
    lessonReturnBriefingAckRunKey,
    bumpFooterSessionContext,
  ])

  React.useEffect(() => {
    if (lessonViewStage !== 'intro' || !activeStructuredLesson || !activeLearningLesson) return
    if (activeLessonIntro) return
    enterLessonFromIntro()
  }, [
    lessonViewStage,
    activeStructuredLesson,
    activeLearningLesson,
    activeLessonIntro,
    enterLessonFromIntro,
  ])

  const buildActiveLearningLessonMenuMeta = React.useCallback((): LearningLessonMenuMeta | undefined => {
    if (!lessonMenuContext) return undefined
    return {
      activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
      activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
      theorySearchQuery: lessonMenuContext.theorySearchQuery,
      activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
      theoryLessonSource: lessonMenuContext.theoryLessonSource,
      theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
    }
  }, [lessonMenuContext])

  const handleGenerateFromReturnBriefing = React.useCallback(() => {
    if (!activeLearningLessonId) return
    const panel = lessonMenuContext?.lessonsPanel === 'a1' ? 'a1' : 'a2'
    void openGeneratedLearningLesson(
      activeLearningLessonId,
      panel,
      buildActiveLearningLessonMenuMeta(),
      { launchFrom: 'briefing' }
    )
  }, [
    activeLearningLessonId,
    lessonMenuContext?.lessonsPanel,
    openGeneratedLearningLesson,
    buildActiveLearningLessonMenuMeta,
  ])

  const activeLessonIntroKey = activeLearningLessonId ?? 'lesson'
  const lessonIntroRevealSessionKey = `${activeLessonIntroKey}:${lessonIntroRevealSession}`
  const activeLessonBriefingKey = activeLearningLessonId ?? 'lesson'
  const activeLessonTipsKey = activeLearningLessonId
    ? `${activeLearningLessonId}:${activeStructuredLesson?.runKey ?? activeStructuredLesson?.variantId ?? activeLessonVariantNumber}`
    : 'lesson'
  const activeLessonCefrLevel =
    activeStructuredLesson?.level ??
    (activeLearningLessonId ? (getLessonTopicById(activeLearningLessonId)?.level ?? null) : null)
  const activeLessonTipsLevelId =
    activeLessonCefrLevel != null
      ? catalogLevelToLevelId(activeLessonCefrLevel)
      : settings.level === 'all'
        ? 'a2'
        : settings.level
  const isLessonHeaderContext =
    isLessonIntroActive ||
    isLessonTipsActive ||
    isLessonBriefingActive ||
    isStructuredLessonActive ||
    isTutorLessonPending
  const headerLessonTopicTitle =
    activeLessonTitle ?? (isTutorLessonPending ? pendingTutorLessonTitle : null)

  const lessonPageTitleStage = React.useMemo(() => {
    if (!headerLessonTopicTitle) return null
    if (isStructuredLessonActive) return 'lesson' as const
    if (isLessonTipsActive) return 'tips' as const
    if (
      isLessonIntroActive ||
      isLessonBriefingActive ||
      isTutorLessonPending ||
      (isLessonActive && !isStructuredLessonActive && !isLessonTipsActive && !isLessonBriefingActive)
    ) {
      return 'intro' as const
    }
    return null
  }, [
    headerLessonTopicTitle,
    isStructuredLessonActive,
    isLessonTipsActive,
    isLessonIntroActive,
    isLessonBriefingActive,
    isTutorLessonPending,
    isLessonActive,
  ])

  const lessonPageTitleView = React.useMemo(() => {
    if (!lessonPageTitleStage || !headerLessonTopicTitle) return null
    return buildLessonPageTitle({
      stage: lessonPageTitleStage,
      topicTitle: headerLessonTopicTitle,
      progressAriaLabel: lessonHeaderProgressAriaLabel,
    })
  }, [lessonPageTitleStage, headerLessonTopicTitle, lessonHeaderProgressAriaLabel])

  const learningLessonFooterDynamicText =
    activeStructuredLessonFooterDynamicText ??
    activeLearningLesson?.footer?.dynamicText ??
    (activeLearningLesson ? `Урок: ${activeLearningLesson.title}` : null)
  const learningLessonFooterStaticText =
    activeStructuredLessonFooterStaticText ??
    (activeLearningLesson
      ? activeLearningLesson?.footer?.staticText ??
        (lessonMenuContext?.lessonsPanel === 'tutor' ? 'Репетитор' : 'Теория')
      : null)
  const practiceForgivenessContext = practiceSession.session
    ? (() => {
        const progress = getPracticeTopicProgress(practiceSession.session!.lessonId)
        const medal = loadLessonProgress(practiceSession.session!.lessonId)?.medal ?? null
        return {
          tier: resolvePracticeEconomyTier(medal),
          ringCount: progress.ringCount,
          lastQualifyingDayKey: progress.lastQualifyingDayKey,
          todayKey: getPracticeEconomyDayKey(),
          coinBalance: rewardsState.currencies.coins,
        }
      })()
    : undefined
  const practiceFooterView = practiceSession.session
    ? getPracticeFooterView(
        practiceSession.session,
        mapPracticeFlowToFooterState(practiceSession.state),
        {
          audience: settings.audience,
          wrongAttemptsOnCurrentQuestion: practiceSession.session.wrongAttemptsOnCurrentQuestion ?? 0,
          questionType: practiceSession.currentQuestion?.type,
          isWrongLimitAdvance:
            practiceSession.state === 'feedback' &&
            isPracticeWrongLimitAdvance(practiceSession.session),
          correctionPhase: choiceCorrectionPhase,
          coinBalance: rewardsState.currencies.coins,
        }
      )
    : null
  const practiceFooterLive = React.useMemo(() => {
    if (!isPracticeActive || !practiceSession.session) return null
    const lessonMedal = loadLessonProgress(practiceSession.session.lessonId)?.medal ?? null
    const tier = resolvePracticeEconomyTier(lessonMedal)
    const progress = getPracticeTopicProgress(practiceSession.session.lessonId)
    return buildPracticeFooterLive({
      session: practiceSession.session,
      state: mapPracticeFlowToFooterState(practiceSession.state),
      tier,
      progress,
      gemsPending: progress.gemsPending,
    })
  }, [isPracticeActive, practiceSession.session, practiceSession.state])

  React.useEffect(() => {
    if (lessonViewStage === 'intro') {
      setLastStructuredLessonGlobalDelta(0)
    }
  }, [lessonViewStage, activeLearningLessonId])

  React.useEffect(() => {
    if (!storageLoaded) return
    const signature = [
      dialogStarted ? 'dialog' : 'home',
      homeMenuView,
      settings.mode,
      settings.audience,
      lessonViewStage,
      activeLearningLessonId ?? 'no-learning-lesson',
      isLessonActive ? 'lesson' : 'no-lesson',
      isPracticeActive ? 'practice' : 'no-practice',
      isAccentActive ? 'accent' : 'no-accent',
      isVocabularyHubActive ? 'vocabulary' : 'no-vocabulary',
      engvoVoiceMode ? 'engvo' : 'no-engvo',
    ].join('|')
    if (footerContextSignatureRef.current === null) {
      footerContextSignatureRef.current = signature
      return
    }
    if (footerContextSignatureRef.current === signature) return
    footerContextSignatureRef.current = signature
    bumpFooterSessionContext()
  }, [
    bumpFooterSessionContext,
    dialogStarted,
    engvoVoiceMode,
    homeMenuView,
    isAccentActive,
    isLessonActive,
    isPracticeActive,
    isVocabularyHubActive,
    storageLoaded,
    settings.audience,
    settings.mode,
    lessonViewStage,
    activeLearningLessonId,
  ])

  React.useEffect(() => {
    const prev = prevFooterModeActivityRef.current
    const lessonNowActive =
      isLessonActive ||
      isLessonIntroActive ||
      isLessonTipsActive ||
      isLessonBriefingActive ||
      isStructuredLessonActive
    const practiceNowActive = isPracticeActive
    const accentNowActive = isAccentActive
    let transitionSource: 'lesson' | 'practice' | 'accent' | null = null

    if (prev.lesson && !lessonNowActive) {
      transitionSource = 'lesson'
    } else if (prev.practice && !practiceNowActive) {
      transitionSource = 'practice'
    } else if (prev.accent && !accentNowActive) {
      transitionSource = 'accent'
    }

    prevFooterModeActivityRef.current = {
      lesson: lessonNowActive,
      practice: practiceNowActive,
      accent: accentNowActive,
    }

    if (!transitionSource) return
    const transitionText = getSessionTransitionTopLine({
      source: transitionSource,
      audience: settings.audience,
      seed: `${transitionSource}:${footerSessionContextNonce}`,
    })
    setFooterTransitionText(transitionText)
    if (footerTransitionTimeoutRef.current !== null) {
      window.clearTimeout(footerTransitionTimeoutRef.current)
    }
    footerTransitionTimeoutRef.current = window.setTimeout(() => {
      setFooterTransitionText(null)
      footerTransitionTimeoutRef.current = null
    }, 10_000)
  }, [
    footerSessionContextNonce,
    isAccentActive,
    isLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isLessonBriefingActive,
    isPracticeActive,
    isStructuredLessonActive,
    settings.audience,
  ])

  React.useEffect(() => {
    if (
      isLessonActive ||
      isLessonIntroActive ||
      isLessonTipsActive ||
      isLessonBriefingActive ||
      isStructuredLessonActive ||
      isPracticeActive ||
      isAccentActive ||
      dialogStarted
    ) {
      setFooterTransitionText(null)
      if (footerTransitionTimeoutRef.current !== null) {
        window.clearTimeout(footerTransitionTimeoutRef.current)
        footerTransitionTimeoutRef.current = null
      }
    }
  }, [
    dialogStarted,
    isAccentActive,
    isLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isLessonBriefingActive,
    isPracticeActive,
    isStructuredLessonActive,
  ])

  const chatFooterVoice = React.useMemo(() => {
    if (!dialogStarted || isLessonActive) return null
    if (engvoVoiceMode) {
      const activeCallVoice =
        engvoActiveProviderRef.current === 'xai' ? engvoXaiVoice : engvoRealtimeVoice
      const engvoFooter = getEngvoFooterView({
        phase: engvoCallPhase,
        userInterimText: engvoUserInterimText,
        errorText: engvoErrorText,
        audience: settings.audience,
        voiceDisplayName: formatEngvoVoiceDisplayName(activeCallVoice),
      })
      if (!engvoFooter.text) return null
      return {
        typingKey: 'engvo-call-status',
        text: engvoFooter.text,
        compactText: engvoFooter.text,
        tone: engvoFooter.tone,
        emphasis: 'none' as const,
      }
    }
    const candidates: Array<FooterVoiceCandidate | null> = [
      lastMessageIsError
        ? {
            key: `${settings.mode}-chat-error`,
            priority: 100,
            text: 'Связь подвела. Попробуем снова.',
            compactText: 'Попробуем снова.',
            tone: 'error',
          }
        : null,
      retryMessage
        ? {
            key: `${settings.mode}-chat-retry`,
            priority: 90,
            text: 'Почти. Пробую ещё раз.',
            compactText: 'Пробую еще раз.',
            tone: 'support',
          }
        : null,
      loadingTranslationIndex !== null
        ? {
            key: 'chat-loading-translation',
            priority: 85,
            text: 'Подгружаю перевод.',
            compactText: 'Гружу перевод.',
            tone: 'thinking',
          }
        : null,
      searchingInternet
        ? {
            key: `${settings.mode}-chat-searching`,
            priority: 80,
            text: 'Уточняю в интернете.',
            compactText: 'Ищу точнее.',
            tone: 'thinking',
          }
        : null,
      loading
        ? {
            key: `${settings.mode}-chat-loading`,
            priority: 75,
            text:
              settings.mode === 'translation'
                ? 'Проверяю формулировку.'
                : settings.mode === 'dialogue'
                  ? 'Думаю над ответом.'
                  : 'Слушаю и отвечаю.',
            compactText:
              settings.mode === 'translation'
                ? 'Проверяю фразу.'
                : settings.mode === 'dialogue'
                  ? 'Думаю над ответом.'
                  : 'Слушаю вас.',
            tone: 'thinking',
          }
        : null,
      settings.mode === 'translation'
        ? {
            key: 'chat-translation-idle',
            priority: 40,
            text: 'Готов проверить перевод.',
            compactText: 'Готов к переводу.',
            tone: 'neutral',
          }
        : null,
      settings.mode === 'dialogue'
        ? {
            key: 'chat-dialogue-idle',
            priority: 40,
            text: 'Я с вами в диалоге.',
            compactText: 'Я с вами.',
            tone: 'neutral',
          }
        : null,
      settings.mode === 'communication'
        ? {
            key: `chat-communication-${communicationVoiceInputMode}-${settings.communicationInputExpectedLang}`,
            priority: 40,
            text:
              communicationVoiceInputMode === 'mix'
                ? 'говори на En/Ru - я пойму и помогу'
                : settings.communicationInputExpectedLang === 'en'
                  ? 'En: говори по-английски - я пойму и помогу'
                  : 'Ru: можно говорить свободно.',
            compactText:
              communicationVoiceInputMode === 'mix'
                ? 'En/Ru - говори, я помогу.'
                : settings.communicationInputExpectedLang === 'en'
                  ? 'En: говори - я помогу.'
                  : 'Ru: жду реплику.',
            tone: 'neutral',
          }
        : null,
    ]
    return pickFooterVoice(
      candidates.filter((candidate): candidate is FooterVoiceCandidate => candidate !== null),
      { maxLength: FOOTER_DYNAMIC_MAX_LENGTH }
    )
  }, [
    dialogStarted,
    engvoCallPhase,
    engvoErrorText,
    engvoRealtimeVoice,
    engvoUserInterimText,
    engvoVoiceMode,
    engvoXaiVoice,
    isLessonActive,
    lastMessageIsError,
    loading,
    loadingTranslationIndex,
    retryMessage,
    searchingInternet,
    communicationVoiceInputMode,
    settings.audience,
    settings.communicationInputExpectedLang,
    settings.mode,
  ])
  const homeFooterVoice = React.useMemo(() => {
    if (dialogStarted) return null
    const resolvedHomeVoiceLine = homeVoiceLine?.trim() || 'Я снова здесь. Продолжим?'
    const candidates: FooterVoiceCandidate[] = [
      {
        key: `home-${greetingNonce}`,
        priority: 100,
        text: resolvedHomeVoiceLine,
        compactText: resolvedHomeVoiceLine,
        tone: 'neutral',
      },
    ]
    return pickFooterVoice(
      candidates,
      { maxLength: FOOTER_DYNAMIC_MAX_LENGTH }
    )
  }, [dialogStarted, greetingNonce, homeVoiceLine])
  const introFooterDynamicText = lessonMenuContext?.lessonsPanel === 'tutor'
    ? 'MyEng собрал тему. Разберём смысл.'
    : lessonIntroDepth === 'deep'
      ? 'Теперь видно нюансы и частые ошибки.'
      : lessonIntroDepth === 'details'
        ? 'Добавил чуть больше логики перед практикой.'
        : 'Сначала коротко разберём смысл темы.'
  const introFooterStaticText = lessonMenuContext?.lessonsPanel === 'tutor'
    ? 'Репетитор | Введение'
    : lessonIntroDepth === 'deep'
      ? 'Глубокое введение | 0/7 шагов'
      : lessonIntroDepth === 'details'
        ? 'Введение подробнее | 0/7 шагов'
        : 'Введение | 0/7 шагов'
  const tipsQuizAnsweredCount = lessonExtraTipsState ? Object.keys(lessonExtraTipsState.quizAnswers).length : 0
  const tipsFooterDynamicText =
    lessonExtraTipsStatus === 'cached'
      ? 'Фишки уже готовы. Можно сразу смотреть примеры.'
      : lessonExtraTipsStatus === 'fallback'
        ? 'Локальные фишки - смотри карточки.'
        : lessonExtraTipsStatus === 'error'
          ? 'Фишки остались на месте. Попробуем позже.'
          : lessonExtraTipsStatus === 'more-loading'
            ? 'Ищу ещё один полезный нюанс по теме.'
            : lessonExtraTipsStatus === 'more-ready'
              ? 'Добавил новые примеры в карточки.'
              : lessonExtraTipsStatus === 'quiz-correct'
                ? 'Отлично: это уже похоже на живую речь.'
                : lessonExtraTipsStatus === 'quiz-error'
                  ? 'Нормально: эта ловушка как раз частая.'
                  : 'Собрал живые нюансы темы. Пройдём быстро.'
  const tipsFooterStaticText =
    lessonExtraTipsStatus === 'quiz-correct' || lessonExtraTipsStatus === 'quiz-error'
      ? `Проверь себя | ${Math.min(tipsQuizAnsweredCount, 2)}/2`
      : lessonExtraTipsStatus === 'more-loading' || lessonExtraTipsStatus === 'more-ready'
        ? 'Фишки темы | ещё 1 блок'
        : 'Дополнительные фишки | 0/7 шагов'
  const recentRewardTicker = React.useMemo(() => {
    const lastReward = rewardsState.ui.lastReward
    if (!lastReward?.at) return null
    const ticker = formatRewardTopLine({
      reason: lastReward.reason,
      amount: lastReward.amount,
      audience: settings.audience,
      fallback: rewardsState.ui.footerTicker,
    }).trim()
    if (!ticker) return null
    if (!rewardReasonAllowsDynamicTickerOverride(lastReward.reason)) return null
    const timestamp = new Date(lastReward.at).getTime()
    if (Number.isNaN(timestamp)) return null
    if (Date.now() - timestamp > 35_000) return null
    if (
      engvoVoiceMode &&
      dialogStarted &&
      (engvoCallPhase === 'error' || engvoCallPhase === 'userFinalizing')
    ) {
      return null
    }
    return ticker
  }, [
    dialogStarted,
    engvoCallPhase,
    engvoVoiceMode,
    settings.audience,
    rewardsState.ui.footerTicker,
    rewardsState.ui.lastReward,
  ])
  // Тикер награды (например «Хороший шаг. +8 к уровню») - только в активной сессии (чат, шаги урока, практика).
  // На доме, введении и фишках не подмешиваем: иначе после возврата на intro остаётся текст прошлого урока до TTL.
  const footerContextRewardTicker =
    (dialogStarted ||
      isLessonActive ||
      isStructuredLessonActive ||
      isPracticeActive ||
      isAccentActive ||
      isVocabularyHubActive) &&
    !isLessonIntroActive &&
    !isLessonTipsActive &&
    !isLessonBriefingActive
      ? recentRewardTicker
      : null
  const structuredLessonCompletionFooterText = useMemo(() => {
    if (
      !isStructuredLessonActive ||
      activeStructuredLessonStatus !== 'completed' ||
      !activeStructuredLesson
    ) {
      return null
    }
    const earned = resolveMedalFromCoreXp(
      activeStructuredLessonCoreXp,
      true,
      activeStructuredLessonMaxCoreXp
    )
    const medal = capLessonMedalForRun(earned, {
      isLocalLesson: isLocalStructuredLessonRun(
        structuredLessonRunOriginRef.current,
        activeLessonVariantNumber
      ),
      cycle1Closed: loadLessonProgress(activeStructuredLesson.id)?.cycle1Closed === true,
      isRepeatRun: isStructuredLessonRepeatRun,
    })
    return formatLessonCompletionFooter(medal)
  }, [
    isStructuredLessonActive,
    activeStructuredLessonStatus,
    activeStructuredLessonCoreXp,
    activeStructuredLessonMaxCoreXp,
    activeStructuredLesson,
    activeLessonVariantNumber,
    isStructuredLessonRepeatRun,
  ])
  useEffect(() => {
    if (!isStructuredLessonActive) return
    if (
      activeStructuredLessonStatus === 'checking' ||
      activeStructuredLessonFeedback?.type === 'error'
    ) {
      setLastStructuredLessonGlobalDelta(0)
    }
  }, [
    isStructuredLessonActive,
    activeStructuredLessonStatus,
    activeStructuredLessonFeedback?.type,
  ])
  const structuredLessonFooterMoment = React.useMemo(() => {
    if (activeStructuredLessonStatus === 'checking') return 'checking' as const
    if (activeStructuredLessonFeedback?.type === 'error') return 'error' as const
    if (
      activeStructuredLessonFeedback?.type === 'success' &&
      lastStructuredLessonGlobalDelta > 0
    ) {
      return 'success_reward' as const
    }
    return 'neutral' as const
  }, [
    activeStructuredLessonStatus,
    activeStructuredLessonFeedback?.type,
    lastStructuredLessonGlobalDelta,
  ])
  const structuredLessonFooterBlocksCelebrateTicker =
    isStructuredLessonActive &&
    (activeStructuredLessonStatus === 'checking' ||
      activeStructuredLessonFeedback?.type === 'error')
  const structuredLessonFooterTopLine = React.useMemo(() => {
    if (!isStructuredLessonActive || !activeStructuredLesson || structuredLessonCompletionFooterText) {
      return null
    }
    const progress = loadLessonProgress(activeStructuredLesson.id)
    const bestTotalXp = progress?.bestTotalXp ?? 0
    const hasSavedMedal = Boolean(progress?.medal)
    return resolveLessonFooterTopLine({
      audience: settings.audience,
      globalDelta: lastStructuredLessonGlobalDelta,
      bestTotalXp,
      combo: activeStructuredLessonCombo,
      comboMilestoneBlocked: activeStructuredLessonLastXpAward.comboMilestoneBlocked,
      isRepeatWithSavedMedal: hasSavedMedal && lastStructuredLessonGlobalDelta === 0,
      voiceFallback: activeStructuredLessonFooterDynamicText,
      moment: structuredLessonFooterMoment,
    })
  }, [
    isStructuredLessonActive,
    activeStructuredLesson,
    structuredLessonCompletionFooterText,
    settings.audience,
    lastStructuredLessonGlobalDelta,
    activeStructuredLessonCombo,
    activeStructuredLessonLastXpAward.comboMilestoneBlocked,
    activeStructuredLessonFooterDynamicText,
    structuredLessonFooterMoment,
  ])
  const streakFooterPreview = React.useMemo(
    () => formatStreakFooterPreview(rewardsState, settings.audience),
    [rewardsState, settings.audience]
  )
  const streakFooterApplied = React.useMemo(
    () => formatStreakFooterApplied(rewardsState, settings.audience),
    [rewardsState, settings.audience]
  )
  const activeStreakSessionMode = React.useMemo(() => {
    if (isPracticeActive) return 'practice'
    if (isAccentActive) return 'accent'
    if (isStructuredLessonActive) return 'lesson'
    if (isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive || isReferenceSheetActive) return 'lesson-intro'
    if (dialogStarted && settings.mode === 'communication') return 'communication'
    if (dialogStarted && engvoVoiceMode) return 'engvo'
    if (isLessonActive) return 'lesson-learning'
    return null
  }, [
    isPracticeActive,
    isAccentActive,
    isStructuredLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isLessonBriefingActive,
    dialogStarted,
    settings.mode,
    engvoVoiceMode,
    isLessonActive,
  ])
  React.useEffect(() => {
    if (!activeStreakSessionMode) {
      setStreakHintConsumedForMode(null)
    }
  }, [activeStreakSessionMode])
  const streakSessionHintLine = React.useMemo(() => {
    if (!activeStreakSessionMode) return null
    if (streakHintConsumedForMode === activeStreakSessionMode) return null
    return formatStreakSessionHint(rewardsState, settings.audience)
  }, [activeStreakSessionMode, streakHintConsumedForMode, rewardsState, settings.audience])
  React.useEffect(() => {
    if (!streakSessionHintLine || !activeStreakSessionMode) return
    setStreakHintConsumedForMode(activeStreakSessionMode)
  }, [streakSessionHintLine, activeStreakSessionMode])
  const homeStreakBannerText = React.useMemo(() => {
    if (dialogStarted || homeMenuView !== 'root') return null
    if (!shouldShowStreakHomeBanner(rewardsState, Boolean(streakFooterPreview))) return null
    return formatStreakHomeBannerText(rewardsState, settings.audience)
  }, [dialogStarted, homeMenuView, rewardsState, streakFooterPreview, settings.audience])

  const openMyPlanFromStart = React.useMemo(() => {
    if (!storageLoaded) return false
    return shouldOpenMyPlanHome({
      myPlanHomeEnabled: featureFlags.myPlanHomeV1,
      hasAnyHistory: hasAnyLearningHistory({
        lastActiveDate: rewardsState.progress.lastActiveDate,
        lessonProgressCount: Object.keys(loadLessonProgressMap()).length,
        signalCount: listLearningSignals().length,
      }),
    })
  }, [storageLoaded, rewardsState.progress.lastActiveDate])

  const completeHomeAudienceChoice = useCallback(
    (audience: 'child' | 'adult') => {
      setSettings((prev) =>
        normalizeSettingsForAudience({
          ...prev,
          audience,
        })
      )
      setHomeAudienceChosen(true)
      if (openMyPlanFromStart) {
        setHomeMenuView('myPlan')
      }
    },
    [openMyPlanFromStart]
  )

  const resolveFooterWithStreakLayer = React.useCallback(
    (
      modeFallback: string | null,
      rewardTicker: string | null = footerContextRewardTicker,
      appliedTicker: string | null = streakFooterApplied
    ): string | null =>
      resolveStreakFooterOverlayLine({
        modeFallback,
        rewardTicker,
        appliedTicker,
        sessionHint: activeStreakSessionMode ? streakSessionHintLine : null,
        preview: streakFooterPreview,
        sessionMode: activeStreakSessionMode,
      }),
    [
      footerContextRewardTicker,
      streakFooterApplied,
      activeStreakSessionMode,
      streakSessionHintLine,
      streakFooterPreview,
    ]
  )
  const practiceOverlayRewardTicker =
    practiceSession.state === 'completed' || practiceSession.state === 'briefing'
      ? practiceRewardUi?.topLine ?? footerContextRewardTicker
      : null
  const footerDynamicText = isAccentActive
    ? resolveFooterWithStreakLayer(accentFooterView?.dynamicText ?? null)
    : isVocabularyHubActive
    ? resolveFooterWithStreakLayer(
        vocabularyFooterView?.dynamicText ??
          (vocabularyByLevelActive ? 'Выбери уровень CEFR или тему.' : 'Выбери мир и начни короткую сессию.')
      )
    : isPracticeActive
    ? resolveFooterWithStreakLayer(
        practiceFooterView?.dynamicText ?? null,
        practiceOverlayRewardTicker
      )
    : isLessonIntroActive
      ? resolveFooterWithStreakLayer(introFooterDynamicText, null, null)
      : isLessonTipsActive
      ? resolveFooterWithStreakLayer(tipsFooterDynamicText, null, null)
      : isLessonBriefingActive
      ? resolveFooterWithStreakLayer('Прочитайте правила - затем к заданию.', null, null)
      : isStructuredLessonActive
      ? resolveFooterWithStreakLayer(
          structuredLessonCompletionFooterText ??
            structuredLessonFooterTopLine ??
            activeStructuredLessonFooterDynamicText
        )
      : isLessonActive
      ? resolveFooterWithStreakLayer(learningLessonFooterDynamicText)
      : dialogStarted
        ? resolveFooterWithStreakLayer(chatFooterVoice?.text ?? null)
        : resolveFooterWithStreakLayer(
            footerTransitionText ?? adaptiveFooterView?.dynamicText ?? homeFooterVoice?.text ?? null
          )
  const baseFooterStaticText = isAccentActive
    ? accentFooterView?.staticText ?? 'Произношение'
    : isVocabularyHubActive
    ? vocabularyFooterView?.staticText ?? (vocabularyByLevelActive ? 'Слова по уровням' : 'Необходимые слова')
    : isPracticeActive
    ? practiceFooterView?.staticText ?? 'Практика'
    : isLessonIntroActive
      ? introFooterStaticText
      : isLessonTipsActive
      ? tipsFooterStaticText
      : isLessonBriefingActive
      ? 'Брифинг | 0/7 шагов'
      : isStructuredLessonActive
      ? activeStructuredLessonFooterStaticText
      : isLessonActive
      ? learningLessonFooterStaticText
      : dialogStarted
        ? settings.mode === 'communication'
          ? formatModeGoalFooter('communication', rewardsState)
          : engvoVoiceMode
            ? formatModeGoalFooter('engvo', rewardsState)
            : getMenuSummary(false)
        : adaptiveFooterView?.staticText ?? formatGlobalFooterStats(rewardsState)
  const structuredLessonFooterLive = useMemo(() => {
    if (!isStructuredLessonActive) return null
    return buildLessonFooterLive({
      lesson: activeStructuredLesson,
      currentStep: activeStructuredLessonCurrentStep,
      currentVariantIndex: activeStructuredLessonCurrentVariantIndex,
      isFinale: activeStructuredLessonIsFinale,
      coreXp: activeStructuredLessonCoreXp,
      maxCoreXp: activeStructuredLessonMaxCoreXp,
      comboXp: activeStructuredLessonComboXp,
      combo: activeStructuredLessonCombo,
      maxCombo: activeStructuredLessonMaxCombo,
      coreDelta: activeStructuredLessonLastCoreDelta,
      comboDelta: activeStructuredLessonLastComboDelta,
      comboMilestoneBlocked: activeStructuredLessonLastXpAward.comboMilestoneBlocked,
      isRepeatRun: isStructuredLessonRepeatRun,
      isLocalCycle1SilverCap: structuredLessonSilverCap && !isStructuredLessonRepeatRun,
      audience: settings.audience,
    })
  }, [
    isStructuredLessonActive,
    activeStructuredLesson,
    activeStructuredLessonCurrentStep,
    activeStructuredLessonCurrentVariantIndex,
    activeStructuredLessonIsFinale,
    activeStructuredLessonCoreXp,
    activeStructuredLessonMaxCoreXp,
    activeStructuredLessonComboXp,
    activeStructuredLessonCombo,
    activeStructuredLessonMaxCombo,
    activeStructuredLessonLastCoreDelta,
    activeStructuredLessonLastComboDelta,
    activeStructuredLessonLastXpAward.comboMilestoneBlocked,
    isStructuredLessonRepeatRun,
    structuredLessonSilverCap,
    settings.audience,
  ])
  const lessonHeaderMedal = useMemo(() => {
    if (isStructuredLessonActive) {
      const progress = activeStructuredLesson
        ? loadLessonProgress(activeStructuredLesson.id)
        : null
      return resolveLessonHeaderMedal({
        coreXp: activeStructuredLessonCoreXp,
        maxCoreXp: activeStructuredLessonMaxCoreXp,
        isFinale: activeStructuredLessonIsFinale,
        cycle1Closed: progress?.cycle1Closed === true,
      })
    }
    if ((isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive) && activeLearningLessonId) {
      return resolveLessonCardMedal(loadLessonProgress(activeLearningLessonId))
    }
    return null
  }, [
    isStructuredLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
    isLessonBriefingActive,
    activeLearningLessonId,
    activeStructuredLesson,
    activeStructuredLessonCoreXp,
    activeStructuredLessonMaxCoreXp,
    activeStructuredLessonIsFinale,
  ])

  const footerStaticText =
    (isStructuredLessonActive && structuredLessonFooterLive) ||
    (isPracticeActive && practiceFooterLive)
      ? null
      : appendFooterRewardSnapshot(baseFooterStaticText, rewardsState)
  const baseFooterTypingKey = isAccentActive
    ? accentFooterView?.typingKey ?? 'accent-footer'
    : isVocabularyHubActive
    ? vocabularyFooterView?.typingKey ?? 'vocabulary-footer'
    : isPracticeActive
    ? practiceFooterView?.typingKey ?? 'practice-footer'
    : isLessonIntroActive
      ? `${activeLearningLessonId ?? 'lesson'}:intro:${lessonIntroDepth}`
      : isLessonTipsActive
      ? `${activeLessonTipsKey}:tips:${lessonExtraTipsStatus}`
      : isLessonBriefingActive
      ? `${activeLearningLessonId ?? 'lesson'}:briefing:${lessonReturnBriefing?.runKey ?? 'briefing'}`
      : isStructuredLessonActive
      ? activeStructuredLessonFooterTypingKey
      : dialogStarted
      ? chatFooterVoice?.typingKey ?? 'chat-footer'
      : adaptiveFooterView?.typingKey ?? homeFooterVoice?.typingKey ?? 'home-footer'
  const footerTypingKey = structuredLessonCompletionFooterText
    ? `lesson-complete-${activeLearningLessonId ?? 'lesson'}:ctx-${footerSessionContextNonce}`
    : footerContextRewardTicker && !structuredLessonFooterBlocksCelebrateTicker
      ? `reward-${rewardsState.ui.lastReward?.at ?? rewardsState.timestamp}:ctx-${footerSessionContextNonce}`
      : `${baseFooterTypingKey}:ctx-${footerSessionContextNonce}`
  const baseFooterVoiceTone = isAccentActive
    ? accentFooterView?.tone ?? 'neutral'
    : isVocabularyHubActive
    ? 'support'
    : isPracticeActive
    ? practiceSession.state === 'correction' || practiceSession.state === 'briefing'
      ? 'hint'
      : practiceSession.state === 'completed'
        ? 'support'
        : 'neutral'
    : isLessonIntroActive
      ? 'neutral'
      : isLessonTipsActive
      ? lessonExtraTipsStatus === 'more-loading'
        ? 'thinking'
        : lessonExtraTipsStatus === 'quiz-correct' || lessonExtraTipsStatus === 'more-ready'
          ? 'celebrate'
          : lessonExtraTipsStatus === 'quiz-error' || lessonExtraTipsStatus === 'fallback'
            ? 'support'
            : lessonExtraTipsStatus === 'error'
              ? 'error'
              : 'hint'
      : isLessonBriefingActive
      ? 'hint'
      : isStructuredLessonActive
      ? activeStructuredLessonFooterVoiceTone
      : dialogStarted
      ? (chatFooterVoice?.tone ?? 'neutral')
      : (adaptiveFooterView?.tone ?? homeFooterVoice?.tone ?? 'neutral')
  const footerVoiceTone = structuredLessonCompletionFooterText
    ? 'celebrate'
    : footerContextRewardTicker && !structuredLessonFooterBlocksCelebrateTicker
      ? 'celebrate'
      : baseFooterVoiceTone
  const baseFooterVoiceEmphasis = isAccentActive
    ? accentFooterView?.emphasis ?? 'none'
    : isVocabularyHubActive
    ? 'none'
    : isPracticeActive
    ? practiceSession.state === 'completed'
      ? 'pulse'
      : 'none'
    : isLessonIntroActive
      ? 'none'
      : isLessonTipsActive
      ? lessonExtraTipsStatus === 'more-loading' ||
        lessonExtraTipsStatus === 'quiz-correct' ||
        lessonExtraTipsStatus === 'more-ready'
        ? 'pulse'
        : 'none'
      : isLessonBriefingActive
      ? 'none'
      : isStructuredLessonActive
      ? activeStructuredLessonFooterVoiceEmphasis
      : dialogStarted
      ? (chatFooterVoice?.emphasis ?? 'none')
      : (adaptiveFooterView?.emphasis ?? homeFooterVoice?.emphasis ?? 'none')
  const footerVoiceEmphasis = structuredLessonCompletionFooterText
    ? 'pulse'
    : footerContextRewardTicker && !structuredLessonFooterBlocksCelebrateTicker
      ? 'pulse'
      : baseFooterVoiceEmphasis
  const footerSsrPlaceholderStatic = formatGlobalFooterStats(createFooterSsrPlaceholderRewardsState())
  const footerDisplayDynamicText = footerHydrated ? footerDynamicText : null
  const footerDisplayStaticText = footerHydrated ? footerStaticText : footerSsrPlaceholderStatic
  const footerDisplayLessonSegments = footerHydrated
    ? isStructuredLessonActive
      ? structuredLessonFooterLive?.lessonSegments ?? null
      : isPracticeActive
        ? practiceFooterLive?.lessonSegments ?? null
        : null
    : null
  const footerDisplayLessonTitle = footerHydrated
    ? isStructuredLessonActive
      ? structuredLessonFooterLive?.lessonTitle ?? null
      : isPracticeActive
        ? practiceFooterLive?.lessonTitle ?? null
        : null
    : null
  const footerDisplayVariantProgress = footerHydrated ? activeStructuredLessonFooterVariantProgress : null
  const footerDisplayTypingKey = footerHydrated ? footerTypingKey : 'footer-ssr-placeholder'
  const abortLanguageNoteRequest = useCallback(() => {
    languageNoteAbortRef.current?.abort()
    languageNoteAbortRef.current = null
    languageNoteRequestIdRef.current += 1
  }, [])

  useEffect(() => {
    abortLanguageNoteRequest()
    setFooterSheetContext((prev) => (prev?.source === 'language-note' ? null : prev))
  }, [settings.mode, engvoVoiceMode, abortLanguageNoteRequest])

  const engvoCallInProgressForTips =
    engvoVoiceMode &&
    ['connecting', 'listening', 'userFinalizing', 'assistantPending', 'assistantSpeaking'].includes(
      engvoCallPhase
    )

  // During a live call tips stay closed so opening a sheet cannot burn call tokens.
  useEffect(() => {
    if (!engvoCallInProgressForTips) return
    abortLanguageNoteRequest()
    setFooterSheetContext((prev) => (prev?.source === 'language-note' ? null : prev))
  }, [engvoCallInProgressForTips, abortLanguageNoteRequest])

  const handleLanguageNoteInfoPress = useCallback(
    async (messageIndex: number, options?: { forceRefresh?: boolean }) => {
      if (engvoCallInProgressForTips) return
      const message = messages[messageIndex]
      if (!message || message.role !== 'user') return
      const originalText = truncateLanguageNoteInput(message.content)
      if (!originalText) return

      const noteVoiceMode =
        engvoVoiceMode || settings.mode !== 'communication'
          ? null
          : communicationVoiceInputMode
      const cached = !options?.forceRefresh ? message.languageNote : undefined
      const cachedMatchesMode =
        cached &&
        (cached.voiceMode ?? null) === (noteVoiceMode ?? null)
      if (cached && cachedMatchesMode) {
        abortLanguageNoteRequest()
        setFooterSheetContext(
          buildLanguageNoteFooterSheetContext({
            status: 'ready',
            messageIndex,
            originalText,
            note: cached,
          })
        )
        return
      }

      abortLanguageNoteRequest()
      const requestId = languageNoteRequestIdRef.current + 1
      languageNoteRequestIdRef.current = requestId
      const controller = new AbortController()
      languageNoteAbortRef.current = controller

      setFooterSheetContext(
        buildLanguageNoteFooterSheetContext({
          status: 'loading',
          messageIndex,
          originalText,
        })
      )

      let recentAssistantText: string | null = null
      for (let i = messageIndex - 1; i >= 0; i--) {
        const prev = messages[i]
        if (prev?.role === 'assistant' && !prev.engvoServiceLine) {
          recentAssistantText = prev.content
          break
        }
      }

      const result = await requestLanguageNote({
        text: originalText,
        provider: settings.provider === 'openai' ? 'openai' : 'openrouter',
        openAiChatPreset: settings.openAiChatPreset,
        audience: settings.audience,
        mode: engvoVoiceMode ? 'engvo' : 'communication',
        communicationVoiceInputMode: noteVoiceMode,
        recentAssistantText,
        signal: controller.signal,
      })

      if (requestId !== languageNoteRequestIdRef.current) return
      if (!result.ok) {
        if (result.aborted) return
        setFooterSheetContext(
          buildLanguageNoteFooterSheetContext({
            status: 'error',
            messageIndex,
            originalText,
            error: result.error || LANGUAGE_NOTE_COPY.error,
          })
        )
        return
      }

      const note: LanguageNote = result.note
      setMessages((prev) => {
        const current = prev[messageIndex]
        if (!current || current.role !== 'user') return prev
        if (current.content.trim() !== message.content.trim()) return prev
        const next = [...prev]
        next[messageIndex] = { ...current, languageNote: note }
        return next
      })

      recordLanguageNoteSignal({
        note,
        mode: settings.mode,
        engvoVoiceMode,
        voiceMode: noteVoiceMode,
      })

      setFooterSheetContext(
        buildLanguageNoteFooterSheetContext({
          status: 'ready',
          messageIndex,
          originalText,
          note,
        })
      )
    },
    [
      abortLanguageNoteRequest,
      communicationVoiceInputMode,
      engvoCallInProgressForTips,
      engvoVoiceMode,
      messages,
      settings.audience,
      settings.mode,
      settings.openAiChatPreset,
      settings.provider,
    ]
  )

  const handleLanguageNoteRetry = useCallback(
    (messageIndex: number, _originalText: string) => {
      void handleLanguageNoteInfoPress(messageIndex, { forceRefresh: true })
    },
    [handleLanguageNoteInfoPress]
  )

  const handleFooterRowPress = useCallback(
    (source: Exclude<FooterSheetSource, 'language-note'>) => {
      if (shouldCloseFooterSheetOnRowPress(footerSheetContext, source)) {
        abortLanguageNoteRequest()
        footerSheetRef.current?.close()
        return
      }
      const openSheet = () => {
        setFooterSheetContext(
          buildFooterSheetContext({
            source,
            dynamicText: footerDisplayDynamicText,
            staticText: footerDisplayStaticText,
            typingKey: footerDisplayTypingKey,
            tone: footerHydrated ? footerVoiceTone : 'neutral',
            emphasis: footerHydrated ? footerVoiceEmphasis : 'none',
            lessonTitle: footerDisplayLessonTitle,
            segmentKinds: footerDisplayLessonSegments?.map((segment) => segment.kind) ?? [],
          })
        )
      }
      if (menuOpen) {
        setMenuOpen(false)
        requestAnimationFrame(openSheet)
        return
      }
      openSheet()
    },
    [
      abortLanguageNoteRequest,
      footerDisplayDynamicText,
      footerDisplayLessonSegments,
      footerDisplayLessonTitle,
      footerDisplayStaticText,
      footerDisplayTypingKey,
      footerHydrated,
      footerSheetContext,
      footerVoiceEmphasis,
      footerVoiceTone,
      menuOpen,
    ]
  )
  const engvoBootstrapServiceIndicatorText = getEngvoBootstrapServiceIndicatorText(
    engvoCallPhase,
    settings.audience
  )
  const showEngvoBootstrapServiceIndicator =
    engvoVoiceMode &&
    engvoBootstrapServiceStatusVisible &&
    !hasEngvoAssistantChatBubble(messages) &&
    !hasEngvoDialingServiceLineInThread(messages) &&
    !!engvoBootstrapServiceIndicatorText
  const communicationVoiceTabs = featureFlags.communicationMixVoiceInputV1
    ? (['ru', 'en', 'mix'] as const)
    : (['ru', 'en'] as const)
  const communicationVoiceOptions = communicationVoiceTabs.map((mode) => {
    if (mode === 'ru') {
      return { mode, label: 'Ru', title: 'Русский ввод', ariaLabel: 'Ожидается русский ввод' }
    }
    if (mode === 'en') {
      return { mode, label: 'En', title: 'English input', ariaLabel: 'Ожидается английский ввод' }
    }
    return {
      mode,
      label: 'En (mix)',
      title: 'Для фраз с русскими вставками',
      ariaLabel: 'Можно говорить по-английски с русскими вставками',
    }
  })
  const activeCommunicationVoiceOption =
    communicationVoiceOptions.find((option) => option.mode === communicationVoiceInputMode) ?? communicationVoiceOptions[0]
  const activeCommunicationVoiceIsMix = activeCommunicationVoiceOption.mode === 'mix'

  const applyCommunicationVoiceMode = useCallback((mode: (typeof communicationVoiceTabs)[number]) => {
    setSettings((s) => {
      if (mode === 'mix') {
        setForceNextMicLang(null)
        return {
          ...s,
          communicationVoiceInputMode: 'mix',
        }
      }
      const nextLang = mode
      setForceNextMicLang(nextLang)
      return {
        ...s,
        communicationInputExpectedLang: nextLang,
        communicationVoiceInputMode: nextLang,
      }
    })
  }, [])
  const hasCommunicationHeaderControls =
    dialogStarted &&
    settings.mode === 'communication' &&
    !isLessonActive &&
    !isPracticeActive &&
    !engvoVoiceMode
  const headerTitleMaxWidthClass = getAppHeaderTitleMaxWidthClass({
    dialogStarted,
    hasCommunicationControls: hasCommunicationHeaderControls,
    lessonPageTitleView: lessonPageTitleView != null,
    hasLessonHeaderProgress: Boolean(lessonHeaderProgressLabel),
    isLessonPreSteps:
      isLessonIntroActive || isLessonTipsActive || isLessonBriefingActive || isTutorLessonPending || isReferenceSheetActive,
    hasHeaderMedal: lessonHeaderMedal != null,
  })

  const pageTitle = !dialogStarted
    ? 'Engvo AI - English Voice'
    : isVocabularyHubActive
      ? vocabularyByLevelActive
        ? 'Слова по уровням MyEng'
        : 'Самые необходимые слова MyEng'
    : isPracticeActive && activePracticeSession
      ? `Практика ${
          activePracticeSession.mode === 'reference'
            ? 'Reference'
            : activePracticeSession.mode === 'relaxed'
              ? 'Relaxed'
              : activePracticeSession.mode === 'balanced'
                ? 'Balanced'
                : 'Челлендж'
        }`
    : lessonPageTitleView
      ? lessonPageTitleView.displayTitle
    : engvoVoiceMode
      ? 'Call to Engvo'
      : activeLessonTitle
      ? `Урок: ${activeLessonTitle}`
      : storageLoaded
        ? getMenuSummary(true)
        : 'MyEng'

  const handleMenuButtonClick = useCallback(() => {
    setMenuOpen((v) => !v)
  }, [])

  useEffect(() => {
    if (!communicationVoiceDropdownOpen) return
    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (communicationVoiceDropdownRef.current?.contains(target)) return
      setCommunicationVoiceDropdownOpen(false)
    }
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setCommunicationVoiceDropdownOpen(false)
    }
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [communicationVoiceDropdownOpen])

  useEffect(() => {
    if (hasCommunicationHeaderControls) return
    setCommunicationVoiceDropdownOpen(false)
  }, [hasCommunicationHeaderControls])

  const homeShellGradientClass =
    'bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]'

  const usesIosWebKitViewportHeight = isIosSafariClient || (isIosWebKitClient && dialogStarted)
  const usesVisualViewportRootHeight =
    dialogStarted && (usesIosWebKitViewportHeight || isAndroidMobileClient)

  const rootShellClass =
    'flex flex-col ' +
    (usesVisualViewportRootHeight
      ? 'min-h-0 overflow-hidden '
      : `min-h-[100dvh] ${isIosClient ? 'h-full ' : 'h-[100dvh] '}`)

  const rootShellStyle = {
    ...(usesVisualViewportRootHeight
      ? {
          minHeight: 'var(--app-vv-height, var(--ios-safari-vv-height, 100dvh))',
          height: 'var(--app-vv-height, var(--ios-safari-vv-height, 100dvh))',
        }
      : {}),
  } as React.CSSProperties

  useEffect(() => {
    const root = document.documentElement
    if (isIosWebKitClient && dialogStarted && !isIosSafariClient) {
      root.setAttribute('data-ios-webkit-dialog', '')
    } else {
      root.removeAttribute('data-ios-webkit-dialog')
    }
    if (isIosSafariClient && dialogStarted) {
      root.setAttribute('data-ios-safari-dialog', '')
    } else {
      root.removeAttribute('data-ios-safari-dialog')
    }
    if (usesVisualViewportRootHeight) {
      root.setAttribute('data-ios-vv-root', '')
    } else {
      root.removeAttribute('data-ios-vv-root')
    }
    if (isIosSafariClient && !dialogStarted) {
      root.setAttribute('data-ios-safari-home', '')
    } else {
      root.removeAttribute('data-ios-safari-home')
    }
    return () => {
      root.removeAttribute('data-ios-webkit-dialog')
      root.removeAttribute('data-ios-safari-dialog')
      root.removeAttribute('data-ios-vv-root')
      root.removeAttribute('data-ios-safari-home')
    }
  }, [dialogStarted, isIosSafariClient, isIosWebKitClient, usesVisualViewportRootHeight])

  useEffect(() => {
    const root = document.documentElement
    if (menuOpen && dialogStarted) {
      root.setAttribute('data-menu-open', '')
    } else {
      root.removeAttribute('data-menu-open')
    }
    return () => {
      root.removeAttribute('data-menu-open')
    }
  }, [dialogStarted, menuOpen])

  return (
    <AppShellProvider value={{ activeBranch: activeBranchResolved, isBranchMounted }}>
    <div
      data-audience={settings.audience}
      className={`${rootShellClass} ${!dialogStarted ? homeShellGradientClass : ''}`}
      style={rootShellStyle}
    >
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[65] border-b border-[var(--app-header-border)]"
        style={{
          paddingTop: 'var(--app-safe-top-inset)',
        }}
      >
        <div className="chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center">
          <div
            ref={appColumnRef}
            className={`relative mx-auto grid w-full grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 sm:grid-cols-[2.5rem_1fr_auto] ${
              dialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
            }`}
          >
            <button
              type="button"
              onClick={handleMenuButtonClick}
              className="app-header-control chat-action-button pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"
              style={{ borderRadius: 'var(--app-header-control-radius)' }}
              aria-label={menuOpen ? 'Меню, открыто' : 'Меню, закрыто'}
              aria-expanded={menuOpen}
              title={menuOpen ? 'Меню, открыто' : 'Меню, закрыто'}
            >
              <MenuToggleIcon />
            </button>
            <h1
              className={`app-header-title-layer gap-1 px-2 text-[16px] font-semibold leading-[1.32] tracking-normal text-[var(--app-header-text)] sm:text-[17px] ${headerTitleMaxWidthClass} ${
                !dialogStarted ? 'whitespace-nowrap' : 'min-w-0'
              }`}
              style={{ fontFamily: 'var(--app-header-font-family)' }}
              title={lessonPageTitleView?.fullTitle ?? pageTitle}
              aria-label={lessonPageTitleView?.ariaLabel ?? pageTitle}
            >
              {lessonPageTitleView ? (
                lessonPageTitleView.prefix ? (
                  <span className="flex min-w-0 max-w-full items-center justify-center gap-1">
                    <span className="shrink-0">{lessonPageTitleView.prefix}</span>
                    <span className="min-w-0 truncate">{lessonPageTitleView.topicSegment}</span>
                  </span>
                ) : (
                  <span className="min-w-0 truncate">{lessonPageTitleView.topicSegment}</span>
                )
              ) : !dialogStarted || !storageLoaded || activeLessonTitle || engvoVoiceMode || isPracticeActive ? (
                <span className="truncate">{pageTitle}</span>
              ) : (
                <>
                  <span className="hidden truncate sm:inline">{getMenuSummary(true)}</span>
                  <span className="truncate sm:hidden">{getMenuSummary(false)}</span>
                </>
              )}
            </h1>
            <div className="relative z-20 col-start-3 row-start-1 flex h-10 min-h-[36px] shrink-0 items-center justify-end gap-1 justify-self-end">
              {hasCommunicationHeaderControls && (
                <div
                  ref={communicationVoiceDropdownRef}
                  className="app-header-dropdown relative shrink-0"
                >
                  <button
                    type="button"
                    className="app-header-control chat-action-button app-header-dropdown-trigger relative flex h-10 min-h-[36px] shrink-0 items-center justify-center border px-2 py-1 touch-manipulation"
                    style={{ borderRadius: 'var(--app-header-control-radius)' }}
                    aria-label="Режим голосового ввода в общении"
                    aria-haspopup="menu"
                    aria-expanded={communicationVoiceDropdownOpen}
                    title={activeCommunicationVoiceOption.title}
                    onClick={() => setCommunicationVoiceDropdownOpen((v) => !v)}
                  >
                    <span className="pointer-events-none text-[12px] font-semibold leading-none text-[var(--app-header-text)]">
                      {activeCommunicationVoiceIsMix ? (
                        <>
                          <span className="hidden sm:inline">En (mix)</span>
                          <span className="inline-flex items-baseline gap-0.5 sm:hidden">
                            <span>En</span>
                            <span className="text-[9px] font-semibold opacity-55">(mix)</span>
                          </span>
                        </>
                      ) : (
                        activeCommunicationVoiceOption.label
                      )}
                    </span>
                    <span
                      className={`app-header-dropdown-chevron absolute right-2 top-1/2 ${communicationVoiceDropdownOpen ? 'is-open' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {communicationVoiceDropdownOpen && (
                    <div
                      className="app-header-dropdown-menu absolute right-0 top-[calc(100%+0.3rem)] z-[80] min-w-[6.25rem] border p-1"
                      style={{ borderRadius: 'var(--app-header-control-radius)' }}
                      role="menu"
                      aria-label="Режим голосового ввода в общении"
                    >
                      {communicationVoiceOptions.map((option) => {
                        const active = communicationVoiceInputMode === option.mode
                        return (
                          <button
                            key={option.mode}
                            type="button"
                            className={`app-header-dropdown-item flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] font-semibold leading-none ${
                              active ? 'is-active' : ''
                            }`}
                            role="menuitemradio"
                            aria-checked={active}
                            aria-label={option.ariaLabel}
                            title={option.title}
                            onClick={() => {
                              applyCommunicationVoiceMode(option.mode)
                              setCommunicationVoiceDropdownOpen(false)
                            }}
                          >
                            <span>{option.label}</span>
                            <span className={`app-header-dropdown-check ${active ? 'is-active' : ''}`} aria-hidden>
                              {active ? '✓' : ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {dialogStarted && isStructuredLessonActive && lessonHeaderProgressLabel ? (
                <span
                  className="mr-1 max-w-[5.5rem] shrink-0 truncate rounded-md border border-[var(--app-header-control-border)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-[var(--app-header-text)] sm:max-w-none sm:text-[11px]"
                  title={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}
                  aria-label={lessonHeaderProgressAriaLabel ?? lessonHeaderProgressLabel}
                >
                  {lessonHeaderProgressLabel}
                </span>
              ) : null}
              {dialogStarted && lessonHeaderMedal ? (
                <span className="app-header-avatar mr-1 sm:mr-2 flex h-10 w-10 shrink-0 items-center justify-center">
                  <MedalBadge
                    tier={lessonHeaderMedal.tier}
                    frozen={lessonHeaderMedal.frozen}
                    size="md"
                    muted={lessonHeaderMedal.muted}
                    title={lessonHeaderMedal.title}
                  />
                </span>
              ) : dialogStarted && !isLessonHeaderContext ? (
                <AppIconFrame
                  variant="header"
                  src="/engvo-mascot.png"
                  alt="Engvo AI"
                  className="mr-1 sm:mr-2"
                  sizes="40px"
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main
        className={`flex min-h-0 flex-col ${
          dialogStarted ? `${homeShellGradientClass} min-h-0 flex-1` : 'min-h-0 flex-1 bg-transparent'
        } ${
          !dialogStarted
            ? 'overflow-hidden'
            : isVocabularyHubActive
              ? 'overflow-y-auto'
              : 'overflow-hidden'
        }`}
        style={{
          paddingTop: 'var(--app-top-offset)',
          paddingBottom: dialogStarted ? '0px' : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {!dialogStarted ? (
          <div
            className="start-screen chat-shell-x relative z-10 flex h-0 min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
            style={{
              scrollPaddingBottom: 'var(--app-footer-chrome-height)',
              ...(isIosSafariClient ? { scrollPaddingTop: 'var(--app-top-offset)' } : {}),
            }}
          >
            <div
              ref={homeColumnRef}
              className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-[23.2rem] flex-col items-center pb-2"
              style={{
                gap: homeMenuView === 'root' ? 'clamp(1rem, 2.5vh, 1.75rem)' : 'clamp(0.5rem, 1.5vh, 0.9rem)',
                paddingTop:
                  homeMenuView === 'root' ? 'clamp(1rem, 2.5vh, 1.75rem)' : 'clamp(0.5rem, 1.5vh, 0.9rem)',
                paddingBottom:
                  'calc(var(--app-footer-chrome-height) + clamp(1rem, 2.5vh, 1.75rem))',
              }}
            >
            {homeMenuView === 'root' && featureFlags.homeMascotVisible ? (
              <div className="flex w-full shrink-0 justify-center">
                <div className="w-1/4 max-w-[5.8125rem] shrink-0">
                  <AppIconFrame
                    variant="home"
                    src="/engvo-mascot.png"
                    alt="Engvo AI"
                    className="w-full"
                    priority
                  />
                </div>
              </div>
            ) : null}
            {homeMenuView === 'root' && (
              <div className="flex w-full flex-col items-center gap-[clamp(1rem,3.2vh,2rem)]">
                <HomeWelcomeBubble text={buildCompactGreeting()} />
                {homeStreakBannerText ? (
                  <div className="w-full rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2.5 text-center">
                    <p className="text-[13px] font-medium leading-snug text-[var(--status-info-text)]">
                      {homeStreakBannerText}
                    </p>
                  </div>
                ) : null}
                <div className="flex w-full justify-end">
                  <div className="flex w-full flex-col items-end gap-2">
                    {!homeAudienceChosen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('child')}
                          className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceChildLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => completeHomeAudienceChoice('adult')}
                          className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}
                        >
                          {APP_SHELL_HOME_COPY.audienceAdultLabel}
                        </button>
                      </>
                    ) : openMyPlanFromStart ? (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label={APP_SHELL_HOME_COPY.homeBackAriaLabel}
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            {APP_SHELL_HOME_COPY.homeBackLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => setHomeMenuView('myPlan')}
                            className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                          >
                            {APP_SHELL_HOME_COPY.startMyPlanLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHomeMenuView('lessons')}
                          className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                        >
                          Все уроки и режимы
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label={APP_SHELL_HOME_COPY.homeBackAriaLabel}
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            {APP_SHELL_HOME_COPY.homeBackLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => setHomeMenuView('aiChat')}
                            className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                          >
                            {APP_SHELL_HOME_COPY.startChatLabel}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHomeMenuView('lessons')}
                          className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                        >
                          Все уроки и режимы
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {welcomeFactLine?.trim() ? (
                  <HomeEmptyBubble text={welcomeFactLine} className="w-full" />
                ) : null}
              </div>
            )}
            {homeMenuView !== 'root' && (
              <>
                <div className="flex w-full shrink-0 flex-row items-center gap-2.5 sm:gap-3">
                  <div className="w-[22%] max-w-[5.5rem] shrink-0">
                    <AppIconFrame
                      variant="home"
                      src="/engvo-mascot.png"
                      alt="Engvo AI"
                      className="w-full"
                      priority
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <HomeMenuInstructionBubble
                      text={getHomeMenuInstruction(homeMenuView, homeAiChatPanel)}
                      ariaLabel={
                        homeMenuView === 'aiChat'
                          ? 'Подсказка по настройкам чата'
                          : 'Инструкция по разделу'
                      }
                    />
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--home-menu-bg)] px-3 py-3 shadow-sm">
                  <MenuSectionPanels
                    menuView={homeMenuView}
                    onMenuViewChange={handleHomeMenuViewChange}
                    settings={settings}
                    onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
                    usage={usage}
                    dialogueCorrectAnswers={dialogueCorrectAnswers}
                    rewardsState={rewardsState}
                    onRewardsStateChange={setRewardsState}
                    idPrefix="home-"
                    className="flex min-h-0 flex-col"
                    homeLayout
                    initialLessonsPanel={homeLessonMenuRestore?.panel}
                    initialLessonMenuContext={homeLessonMenuRestore?.context ?? null}
                    onStartHomeChat={handleStartChatFromHome}
                    onGoHome={goToStartScreen}
                    onAiChatPanelChange={setHomeAiChatPanel}
                    onOpenEngvoVoiceChat={handleOpenEngvoVoiceChat}
                    engvoProvider={engvoProvider}
                    engvoRealtimeVoice={engvoRealtimeVoice}
                    engvoXaiVoice={engvoXaiVoice}
                    engvoXaiVoiceRotationMode={engvoXaiVoiceRotationMode}
                    engvoCefrLevel={engvoCefrLevel}
                    engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
                    onEngvoProviderChange={handleEngvoProviderChange}
                    onEngvoVoiceChange={handleEngvoVoiceChange}
                    onEngvoXaiVoiceChange={handleEngvoXaiVoiceChange}
                    onEngvoXaiVoiceRotationModeChange={handleEngvoXaiVoiceRotationModeChange}
                    onEngvoLevelChange={handleEngvoLevelChange}
                    onEngvoSpeechSpeedChange={handleEngvoSpeechSpeedChange}
                    engvoSessionKind={engvoSessionKind}
                    engvoTeacherTense={engvoTeacherTense}
                    engvoTeacherSentenceType={engvoTeacherSentenceType}
                    engvoSettingsLocked={
                      engvoVoiceMode &&
                      (engvoCallPhase === 'connecting' ||
                        engvoCallPhase === 'listening' ||
                        engvoCallPhase === 'assistantPending' ||
                        engvoCallPhase === 'assistantSpeaking' ||
                        engvoCallPhase === 'userFinalizing')
                    }
                    onEngvoSessionKindChange={handleEngvoSessionKindChange}
                    onEngvoTeacherTenseChange={handleEngvoTeacherTenseChange}
                    onEngvoTeacherSentenceTypeChange={handleEngvoTeacherSentenceTypeChange}
                    practiceTtsSpeedDefaultIndex={practiceTtsSpeedDefaultIndex}
                    onPracticeTtsSpeedDefaultChange={handlePracticeTtsSpeedDefaultChange}
                    chatPatternId={chatPatternId}
                    onChatPatternChange={handleChatPatternChange}
                    chatPatternTuningMap={chatPatternTuningMap}
                    onChatPatternTuningChange={handleChatPatternTuningChange}
                    onChatPatternTuningReset={handleChatPatternTuningReset}
                    onOpenLearningLesson={openOrContinueLearningLesson}
                    onOpenReferenceTopic={openReferenceTopic}
                    onOpenQuickTest={openQuickTest}
                    onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}
                    onDebugSkipToPracticeFinale={handleDebugSkipToPracticeFinale}
                    practiceSessionActiveForDebug={practiceSessionActiveForDebug}
                    onGenerateLearningLesson={openGeneratedLearningLesson}
                    onOpenPracticeSession={openPracticeSession}
                    onGeneratePracticeSession={generatePracticeSession}
                    onOpenAccentTrainer={openAccentTrainer}
                    onOpenVocabularyWorlds={openVocabularyWorlds}
                    onOpenVocabularyByLevel={openVocabularyByLevel}
                    onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}
                    onMarkOpenedFromMyPlan={markOpenedFromMyPlan}
                    onOpenTutorLesson={openTutorLesson}
                    onAdaptiveFooterViewChange={setAdaptiveFooterView}
                    onPracticeTheoryTagFilterPersist={persistPracticeTheoryTagFilter}
                    practiceProgressRevision={practiceProgressRevision}
                  />
                </div>
              </>
            )}
            </div>
          </div>
        ) : (
          <>
            {!isStructuredLessonActive &&
              !isLessonTipsActive &&
              dialogStarted &&
              !engvoVoiceMode &&
              messages.length > 0 &&
              settings.mode !== 'communication' &&
              !suppressSettingsChangeBannerRef.current &&
              settingsDiffersFromLastSendForBanner(settings, settingsAtLastSend) && (
              <div className="shrink-0 border-b border-[var(--border)] px-3 py-2">
                <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-center text-sm text-[var(--text)] shadow-sm">
                  Настройки изменены. Следующее сообщение будет: <strong>{getMenuSummary(true)}</strong>.
                </div>
              </div>
            )}
            {/* На iOS после закрытия клавиатуры иногда остаётся небольшой технический зазор.
               Чтобы не просвечивал серый фон страницы, держим фон тем же, что и у чата. */}
            <div className="dialog-scroll-shell flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
              {menuLessonBgError && (
                <div
                  role="status"
                  className="shrink-0 border-b border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]"
                >
                  <div className="mx-auto flex max-w-[28rem] items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 leading-snug">{menuLessonBgError}</p>
                    <button
                      type="button"
                      onClick={() => setMenuLessonBgError(null)}
                      className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[12px] font-medium text-[var(--text)] hover:opacity-90"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col">
                {isVocabularyHubActive ? (
                  vocabularyWorldsActive ? (
                    <VocabularyWorldsScreen
                      onBackToLessons={backToVocabularyMenu}
                      onFooterViewChange={setVocabularyFooterView}
                    />
                  ) : (
                    <VocabularyByLevelScreen
                      onBackToLessons={backToVocabularyMenu}
                      onFooterViewChange={setVocabularyFooterView}
                    />
                  )
                ) : isAccentActive ? (
                <AccentTrainer
                  audience={settings.audience}
                  onClose={goToStartScreen}
                  onFooterViewChange={setAccentFooterView}
                  onSessionCompleted={handleAccentSessionCompleted}
                  initialLessonId={activeAccentLessonId}
                  initialLessonRequestKey={accentLessonRequestKey}
                />
              ) : isPracticeActive && practiceSession.session ? (
                <PracticeScreen
                  session={practiceSession.session}
                  voiceId={settings.voiceId}
                  ttsSpeedDefaultIndex={practiceTtsSpeedDefaultIndex}
                  audience={settings.audience}
                  state={practiceSession.state}
                  feedback={practiceSession.feedback}
                  pendingAnswer={practiceSession.pendingAnswer}
                  currentQuestion={practiceSession.currentQuestion}
                  canSubmit={practiceSession.canSubmit}
                  completionMeta={practiceCompletionMeta}
                  hasTips={Boolean(
                    practiceSession.session &&
                      getStructuredLessonById(practiceSession.session.lessonId)?.intro
                  )}
                  otherTopicAvailable={Boolean(
                    practiceSession.session &&
                      pickBestPracticeRewardOpportunity(
                        Object.values(loadLessonProgressMap()).filter(
                          (row) => row.lessonId !== practiceSession.session!.lessonId
                        )
                      )
                  )}
                  onSubmitAnswer={practiceSession.submitAnswer}
                  onAcknowledgeInstruction={practiceSession.acknowledgeInstruction}
                  onChoiceCorrectionPhaseChange={setChoiceCorrectionPhase}
                  forgivenessContext={practiceForgivenessContext}
                  onRequestCoinForgiveness={practiceSession.requestCoinForgiveness}
                  onConfirmCoinForgiveness={handlePracticeConfirmCoinForgiveness}
                  onCancelCoinForgiveness={practiceSession.cancelCoinForgiveness}
                  onContinueCoinForgiveness={practiceSession.continueAfterCoinForgiveness}
                  onRequestPhraseTranslation={handleRequestPhraseTranslation}
                  onRetryAfterError={() => {
                    if (!practiceSession.session) return
                    if (practiceSession.session.mode === 'reference') {
                      practiceSession.retryGeneratingNext()
                      return
                    }
                    void restartPracticeFromExistingSession(
                      practiceSession.session,
                      practiceSession.session.mode,
                      'local'
                    )
                  }}
                  onRepeat={() => {
                    if (!practiceSession.session) return
                    void restartPracticeFromExistingSession(practiceSession.session, practiceSession.session.mode, 'ai_generated')
                  }}
                  onStartMode={(mode) => {
                    if (!practiceSession.session) return
                    void restartPracticeFromExistingSession(practiceSession.session, mode, 'local')
                  }}
                  onOpenLesson={() => {
                    if (!practiceSession.session) return
                    openLessonFromPractice(practiceSession.session)
                  }}
                  onOpenTips={() => {
                    void openTipsFromPractice()
                  }}
                  onOtherTopic={openOtherTopicFromPractice}
                  onOpenAiChat={() => {
                    if (!practiceSession.session) return
                    openChatFromPractice(practiceSession.session)
                  }}
                  onBackToPracticeMenu={() => {
                    setPracticeRewardUi(null)
                    setPracticeCompletionMeta(null)
                    practiceSession.abandonSession()
                    setDialogStarted(false)
                    setHomeMenuView('lessons')
                    setLessonMenuContext((prev) => ({
                      menuView: 'lessons',
                      lessonsPanel: 'practice',
                      activeGrammarCategoryId: prev?.activeGrammarCategoryId ?? null,
                      activeTheoryTagId: prev?.activeTheoryTagId ?? null,
                      theorySearchQuery: prev?.theorySearchQuery ?? null,
                      activeTheoryTagIds: prev?.activeTheoryTagIds ?? null,
                      theoryLessonSource: prev?.theoryLessonSource ?? null,
                      theoryTagBrowseLevel: prev?.theoryTagBrowseLevel ?? null,
                      practiceTheoryTagFilterId: prev?.practiceTheoryTagFilterId ?? null,
                    }))
                  }}
                  generationBusy={loading}
                />
              ) : isTutorLessonPending ? (
                <div className="flex h-full min-h-0 items-center justify-center bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)] px-4">
                  <div className="lesson-enter glass-surface w-full max-w-[24rem] rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-[var(--chat-assistant-shell)] px-4 py-5 text-center shadow-sm">
                    <p className="text-[15px] font-semibold text-[var(--text)]">Engvo составляет урок...</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                      Тема: {pendingTutorLessonTitle}. Сейчас подготовлю короткие примеры и задания по выбранному смыслу.
                    </p>
                  </div>
                </div>
              ) : isReferenceSheetActive && activeReferenceSheet ? (
                <ReferenceSheetScreen
                  key={`ref-${activeReferenceSheet.id}`}
                  sheet={activeReferenceSheet}
                  onBack={backToLessonList}
                  onStartLesson={() => {
                    void openLearningLesson(
                      activeReferenceSheet.relatedLessonId,
                      lessonMenuContext?.lessonsPanel ?? 'a2',
                      {
                        ...(lessonMenuContext
                          ? {
                              activeGrammarCategoryId: lessonMenuContext.activeGrammarCategoryId,
                              activeTheoryTagId: lessonMenuContext.activeTheoryTagId,
                              theorySearchQuery: lessonMenuContext.theorySearchQuery,
                              activeTheoryTagIds: lessonMenuContext.activeTheoryTagIds,
                              theoryLessonSource: lessonMenuContext.theoryLessonSource,
                              theoryTagBrowseLevel: lessonMenuContext.theoryTagBrowseLevel,
                            }
                          : {}),
                        catalogBrowseIntent: 'reference',
                      }
                    )
                  }}
                  onStartPractice={
                    activeReferenceSheet.hasPractice
                      ? () => {
                          void openPracticeSession({
                            lessonId: activeReferenceSheet.relatedLessonId,
                            mode: 'challenge',
                            entrySource: 'menu',
                          })
                        }
                      : undefined
                  }
                />
              ) : isLessonIntroActive && activeLessonIntro ? (
                <LessonIntroScreen
                  key={activeLessonIntroKey}
                  intro={activeLessonIntro}
                  introSessionKey={lessonIntroRevealSessionKey}
                  depth={lessonIntroDepth}
                  loadingLesson={Boolean(structuredLessonLoadingId) || loading || !activeStructuredLesson}
                  provider={settings.provider}
                  openAiChatPreset={settings.openAiChatPreset}
                  audience={settings.audience}
                  onShowDetails={() => setLessonIntroDepth('details')}
                  onShowDeepDive={() => setLessonIntroDepth('deep')}
                  onStartLesson={enterLessonFromIntro}
                  onShowExtras={() => {
                    setLessonTipsReturnStage('intro')
                    setLessonViewStage('tips')
                  }}
                  onBack={backToLessonList}
                  footerVariantRegenerating={structuredLessonVariantRegenerating}
                  variantPrepareProgress={variantPrepare.progress}
                  variantPrepareLabel={variantPrepare.label}
                />
              ) : isLessonTipsActive && activeLessonIntro ? (
                <LessonExtraTipsScreen
                  lessonKey={activeLessonTipsKey}
                  intro={activeLessonIntro}
                  footerVariantRegenerating={structuredLessonVariantRegenerating}
                  variantPrepareProgress={variantPrepare.progress}
                  variantPrepareLabel={variantPrepare.label}
                  intent={activeTutorIntent}
                  provider={settings.provider}
                  openAiChatPreset={settings.openAiChatPreset}
                  audience={settings.audience}
                  level={activeLessonTipsLevelId}
                  lessonCefrLevel={activeLessonCefrLevel ?? undefined}
                  savedState={lessonExtraTipsState}
                  onSavedStateChange={setLessonExtraTipsState}
                  onFooterStatusChange={setLessonExtraTipsStatus}
                  onBack={() => {
                    setLastStructuredLessonGlobalDelta(0)
                    bumpFooterSessionContext()
                    setLessonViewStage(lessonTipsReturnStage)
                  }}
                  onStartLesson={enterLessonFromIntro}
                />
              ) : isLessonBriefingActive && lessonReturnBriefing ? (
                <LessonBriefingScreen
                  key={activeLessonBriefingKey}
                  briefing={lessonReturnBriefing}
                  onContinue={acknowledgeLessonReturnBriefing}
                  onGenerateVariant={handleGenerateFromReturnBriefing}
                  generateVariantBusy={structuredLessonVariantRegenerating}
                  generateVariantProgress={variantPrepare.progress}
                  generateVariantLabel={variantPrepare.label}
                />
              ) : isStructuredLessonActive && activeStructuredLesson && activeStructuredLessonStep ? (
                <LessonStepRenderer
                  timeline={activeStructuredLessonTimeline}
                  status={activeStructuredLessonStatus}
                  exerciseErrors={activeStructuredLessonExerciseErrors}
                  defaultTtsSpeechRate={defaultTtsSpeechRate}
                  onAnswer={handleStructuredLessonAnswer}
                  onCompleteStep={completeStructuredLessonStep}
                  onPuzzleSubStep={({ subIndex, attempts }) =>
                    awardStructuredLessonPuzzleSub(subIndex, attempts)
                  }
                  onPuzzleAttemptFailed={(params) =>
                    recordStructuredLessonPuzzleAttempt({ ...params, type: 'error' })
                  }
                  onPuzzleSubSuccess={({ subIndex, attempts, submittedAnswer }) =>
                    recordStructuredLessonPuzzleAttempt({
                      subIndex,
                      attempts,
                      submittedAnswer,
                      type: 'success',
                    })
                  }
                  onPuzzleInteraction={clearStructuredLessonPuzzleAttemptFeedback}
                  lessonMedalReveal={
                    activeStructuredLessonStatus === 'completed'
                      ? {
                          medal: capLessonMedalForRun(
                            resolveMedalFromCoreXp(
                              activeStructuredLessonCoreXp,
                              true,
                              activeStructuredLessonMaxCoreXp
                            ),
                            {
                              isLocalLesson: isLocalStructuredLessonRun(
                                structuredLessonRunOriginRef.current,
                                activeLessonVariantNumber
                              ),
                              cycle1Closed:
                                loadLessonProgress(activeStructuredLesson.id)?.cycle1Closed === true,
                              isRepeatRun: isStructuredLessonRepeatRun,
                            }
                          ),
                          coreXp: activeStructuredLessonCoreXp,
                          comboXp: activeStructuredLessonComboXp,
                          maxCoreXp: activeStructuredLessonMaxCoreXp,
                          corePercent: computeCorePercent(
                            activeStructuredLessonCoreXp,
                            activeStructuredLessonMaxCoreXp
                          ),
                          previousCorePercent: structuredLessonFinaleContext?.previousCorePercent ?? null,
                          profileMedal: structuredLessonFinaleContext?.profileMedal ?? null,
                          firstTryCount: activeStructuredLessonFirstTryCount,
                          totalScoredUnits: activeStructuredLessonTotalScoredUnits,
                          coinAward: lessonFinaleCoinAward,
                        }
                      : null
                  }
                  postLessonMenuResetKey={postLessonMenuResetKey}
                  onPostLessonAction={handlePostLessonAction}
                  onBackToLessonList={backToLessonList}
                  onOpenFinaleTips={handleFinaleOpenTips}
                  postLessonBusy={postLessonBusy}
                  postLessonOverlayOpen={lessonOverlay != null}
                  audience={settings.audience}
                  voiceId={settings.voiceId}
                  choiceShuffleSeed={structuredLessonChoiceShuffleSeed}
                  onPuzzleProgressChange={handleStructuredLessonPuzzleProgressChange}
                  puzzleSubIndex={activeStructuredLessonPuzzleProgress?.subIndex}
                  puzzleSubAdvanceToken={activeStructuredLessonPuzzleSubAdvanceToken}
                  lessonRevealSessionId={
                    activeStructuredLesson
                      ? `${activeStructuredLesson.id}:${activeStructuredLesson.runKey ?? 'static'}`
                      : 'static'
                  }
                  isAdvancingToNextStep={activeStructuredLessonIsAdvancingToNextStep}
                  isAdvancingToNextVariant={activeStructuredLessonIsAdvancingToNextVariant}
                  coinBalance={rewardsState.currencies.coins}
                  forgivenessUsedThisRun={activeStructuredLessonForgivenessUsedThisRun}
                  forgivenessConfirmPending={activeStructuredLessonForgivenessConfirmPending}
                  forgivenessAppliedAckActive={activeStructuredLessonForgivenessAppliedAckActive}
                  forgivenessPendingCorrectAnswer={activeStructuredLessonForgivenessPendingCorrectAnswer}
                  forgivenessAppliedBalanceAfter={activeStructuredLessonForgivenessAppliedBalanceAfter}
                  onRequestCoinForgiveness={requestStructuredLessonCoinForgiveness}
                  onConfirmCoinForgiveness={handleStructuredLessonConfirmCoinForgiveness}
                  onContinueCoinForgiveness={handleStructuredLessonContinueCoinForgiveness}
                  onDeclineCoinForgiveness={declineStructuredLessonForgivenessOffer}
                  onCancelCoinForgivenessConfirm={cancelStructuredLessonCoinForgivenessConfirm}
                  onZeroBalanceCoinForgivenessHelp={handleStructuredLessonZeroBalanceForgivenessHelp}
                  puzzleAttemptForgivenessToken={activeStructuredLessonPuzzleAttemptForgivenessToken}
                  forgivenessAutofillAnswer={activeStructuredLessonForgivenessAutofillAnswer}
                  forgivenessAutofillChoice={activeStructuredLessonForgivenessAutofillChoice}
                  forgivenessAutofillNonce={activeStructuredLessonForgivenessAutofillNonce}
                  introBlocks={resolveLessonIntroBlocks(activeStructuredLesson.intro)}
                />
              ) : (
                <Chat
                  appColumnAnchorRef={chatGlassRef}
                  messages={messages}
                  settings={settings}
                  defaultTtsSpeechRate={defaultTtsSpeechRate}
                  loading={loading}
                  searchingInternet={searchingInternet}
                  searchingInternetLang={searchingInternetLang}
                  atLimit={atLimit}
                  onSend={handleSend}
                  firstMessageError={ERROR_FIRST_MESSAGE}
                  onRetryFirstMessage={retryFirstMessage}
                  lastMessageIsError={lastMessageIsError}
                  onRetryLastMessage={retryLastMessage}
                  retryMessage={retryMessage}
                  onRequestTranslation={handleRequestTranslation}
                  loadingTranslationIndex={loadingTranslationIndex}
                  onLanguageNoteInfoPress={handleLanguageNoteInfoPress}
                  onRequestEngvoCallTranslation={handleRequestEngvoCallTranslation}
                  loadingEngvoCallTranslationIndex={loadingEngvoCallTranslationIndex}
                  engvoCallTranslationPrefetchText={engvoCallTranslationPrefetchText}
                  forceNextMicLang={forceNextMicLang}
                  onConsumeForceNextMicLang={() => setForceNextMicLang(null)}
                  communicationVoiceInputMode={communicationVoiceInputMode}
                  learningActions={
                    activeLearningLessonId && !activeStructuredLesson && !structuredLessonLoadingId
                      ? getLearningLessonActions(activeLearningLessonId)
                      : []
                  }
                  onSelectLearningAction={activeLearningLessonId ? handleSelectLearningAction : undefined}
                  composerSessionKey={composerSessionKey}
                  engvo={{
                    active: engvoVoiceMode,
                    callPhase: engvoCallPhase,
                    realtimeVoice: engvoRealtimeVoice,
                    cefrLevel: engvoCefrLevel,
                    interimUserText: engvoUserInterimText,
                    localAudioStream: engvoLocalAudioStream,
                    remoteAudioStream: engvoRemoteAudioStream,
                    remoteAssistantPlaybackActive: engvoRemotePlaybackActive,
                    callStartedAt: engvoCallStartedAt,
                    showAssistantPending: showEngvoBootstrapServiceIndicator,
                    assistantIndicatorText: engvoBootstrapServiceIndicatorText ?? 'Engvo говорит…',
                    onStartCall: () => {
                      void startEngvoCall()
                    },
                    onHangUp: hangUpEngvoCall,
                    onVoiceChange: handleEngvoVoiceChange,
                    onLevelChange: handleEngvoLevelChange,
                  }}
                />
              )}
              </div>
            </div>
          </>
        )}
      </main>

      <RewardPopup
        text={rewardPopupText ?? ''}
        visible={Boolean(rewardPopupText)}
        onDismiss={() => setRewardPopupText(null)}
      />

      {/* В чате - спейсер под fixed-футер; на главной отступ только у колонки контента. */}
      {dialogStarted ? (
        <div
          className={`shrink-0 ${
            isIosWebKitClient
              ? 'bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]'
              : ''
          }`}
          style={{ height: 'var(--app-bottom-offset)' }}
          aria-hidden
        />
      ) : null}
      <footer className="app-dialog-chrome-footer pointer-events-none fixed bottom-0 left-0 right-0 z-[55] flex flex-col overflow-visible">
        <div className="app-footer-surface h-[var(--app-footer-row-height)] min-h-[var(--app-footer-row-height)] shrink-0 border-t border-[var(--app-footer-border)]">
          <AppFooter
            dynamicText={footerDisplayDynamicText}
            staticText={footerDisplayStaticText}
            variantProgress={footerDisplayVariantProgress}
            typingKey={footerDisplayTypingKey}
            audience={settings.audience}
            dynamicTone={footerHydrated ? footerVoiceTone : 'neutral'}
            dynamicEmphasis={footerHydrated ? footerVoiceEmphasis : 'none'}
            hideDynamicMarker={engvoVoiceMode}
            instantDynamicText={engvoVoiceMode}
            isLessonActive={isLessonActive}
            isDialogStarted={dialogStarted}
            showWhenIdle={!dialogStarted}
            lessonFooterLessonTitle={footerDisplayLessonTitle}
            lessonFooterSegments={footerDisplayLessonSegments}
            onFooterRowPress={handleFooterRowPress}
          />
        </div>
        <div
          className="shrink-0 bg-[var(--app-footer-bg)]"
          style={{ height: 'var(--app-footer-safe-inset)' }}
          aria-hidden
        />
      </footer>

      <SlideOutMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        hideButton
        chatActive={dialogStarted}
        engvoVoiceMode={engvoVoiceMode}
        settings={settings}
        onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
        usage={usage}
        dialogueCorrectAnswers={dialogueCorrectAnswers}
        rewardsState={rewardsState}
        onRewardsStateChange={setRewardsState}
        onStartChat={handleStartChatFromMenu}
        onOpenEngvoVoiceChat={handleOpenEngvoVoiceChat}
        engvoProvider={engvoProvider}
        engvoRealtimeVoice={engvoRealtimeVoice}
        engvoXaiVoice={engvoXaiVoice}
        engvoXaiVoiceRotationMode={engvoXaiVoiceRotationMode}
        engvoCefrLevel={engvoCefrLevel}
        engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
        onEngvoProviderChange={handleEngvoProviderChange}
        onEngvoVoiceChange={handleEngvoVoiceChange}
        onEngvoXaiVoiceChange={handleEngvoXaiVoiceChange}
        onEngvoXaiVoiceRotationModeChange={handleEngvoXaiVoiceRotationModeChange}
        onEngvoLevelChange={handleEngvoLevelChange}
        onEngvoSpeechSpeedChange={handleEngvoSpeechSpeedChange}
        engvoSessionKind={engvoSessionKind}
        engvoTeacherTense={engvoTeacherTense}
        engvoTeacherSentenceType={engvoTeacherSentenceType}
        engvoSettingsLocked={
          engvoVoiceMode &&
          (engvoCallPhase === 'connecting' ||
            engvoCallPhase === 'listening' ||
            engvoCallPhase === 'assistantPending' ||
            engvoCallPhase === 'assistantSpeaking' ||
            engvoCallPhase === 'userFinalizing')
        }
        onEngvoSessionKindChange={handleEngvoSessionKindChange}
        onEngvoTeacherTenseChange={handleEngvoTeacherTenseChange}
        onEngvoTeacherSentenceTypeChange={handleEngvoTeacherSentenceTypeChange}
        practiceTtsSpeedDefaultIndex={practiceTtsSpeedDefaultIndex}
        onPracticeTtsSpeedDefaultChange={handlePracticeTtsSpeedDefaultChange}
        chatPatternId={chatPatternId}
        onChatPatternChange={handleChatPatternChange}
        chatPatternTuningMap={chatPatternTuningMap}
        onChatPatternTuningChange={handleChatPatternTuningChange}
        onChatPatternTuningReset={handleChatPatternTuningReset}
        onGoHome={goToStartScreen}
        onOpenLearningLesson={openOrContinueLearningLesson}
        onOpenReferenceTopic={openReferenceTopic}
        onOpenQuickTest={openQuickTest}
        onGenerateLearningLesson={openGeneratedLearningLesson}
        onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}
        onDebugSkipToPracticeFinale={handleDebugSkipToPracticeFinale}
        practiceSessionActiveForDebug={practiceSessionActiveForDebug}
        activePracticeMenuSnapshot={activePracticeMenuSnapshot}
        onOpenPracticeSession={openPracticeSession}
        onGeneratePracticeSession={generatePracticeSession}
        onOpenAccentTrainer={openAccentTrainer}
        onOpenVocabularyWorlds={openVocabularyWorlds}
        onOpenVocabularyByLevel={openVocabularyByLevel}
        onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}
        onMarkOpenedFromMyPlan={markOpenedFromMyPlan}
        onOpenTutorLesson={openTutorLesson}
        onAdaptiveFooterViewChange={setAdaptiveFooterView}
        onPracticeTheoryTagFilterPersist={persistPracticeTheoryTagFilter}
        lessonMenuContext={lessonMenuContext}
        restoreLessonMenuOnNextOpenRef={restoreLessonMenuOnNextOpenRef}
        practiceProgressRevision={practiceProgressRevision}
        topOffset="var(--app-top-offset)"
        bottomOffset="var(--app-menu-panel-bottom)"
        columnBounds={appColumnBounds}
      />

      {lessonOverlay ? (
        <CenterMessageOverlay
          title={lessonOverlay.title}
          lines={lessonOverlay.lines}
          onClose={() => {
            setLessonOverlay(null)
            setPostLessonBusy(false)
            setSelectedPostLessonAction(null)
            setPostLessonMenuResetKey((current) => current + 1)
          }}
        />
      ) : null}

      {coinForgivenessHelpOverlay ? (
        <CenterMessageOverlay
          title={coinForgivenessHelpOverlay.title}
          lines={coinForgivenessHelpOverlay.lines}
          onClose={() => setCoinForgivenessHelpOverlay(null)}
        />
      ) : null}

      <FooterDetailSheet
        ref={footerSheetRef}
        context={footerSheetContext}
        columnBounds={appColumnBounds}
        onClose={() => {
          abortLanguageNoteRequest()
          setFooterSheetContext(null)
        }}
        onLanguageNoteRetry={handleLanguageNoteRetry}
      />
    </div>
    </AppShellProvider>
  )
}

