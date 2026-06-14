'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiChatPanel } from '@/lib/aiChatPanel'
import { getHomeMenuInstruction } from '@/lib/homeMenuInstruction'
import { featureFlags } from '@/lib/featureFlags'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import HomeEmptyBubble from '@/components/HomeEmptyBubble'
import { MenuToggleIcon } from '@/components/MenuToggleIcon'
import { HomeMenuInstructionBubble } from '@/components/HomeMenuInstructionBubble'
import { AppIconFrame } from '@/components/AppIconFrame'
import MenuSectionPanels, {
  type LessonMenuContext,
  type LessonsPanel,
  type LearningLessonMenuMeta,
  type MenuView,
} from '@/components/MenuSectionPanels'
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
  loadRewardsState,
  reconcileModeGoalSessions,
  saveRewardsState,
  formatGlobalFooterStats,
  formatModeGoalFooter,
  type RewardsState,
} from '@/lib/rewardsState'
import { applyRewardsEvent } from '@/lib/rewardsEvents'
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
  buildLessonReturnHint,
  buildLessonReturnHintBannerLine,
  type LessonReturnHintContext,
} from '@/lib/lessonReturnHint'
import {
  formatLessonHeaderProgressAriaLabel,
  formatLessonHeaderProgressLabel,
} from '@/lib/lessonHeaderProgress'
import {
  beginLessonCycle1,
  capLessonMedalForRun,
  closeLessonCycle1,
  isLocalStructuredLessonRun,
  resolveLessonSilverCapForRun,
} from '@/lib/lessonAntiFarm'
import { buildLessonCycle1Hint } from '@/lib/lessonCycle1Hint'
import { buildLessonMedalRevealCopy } from '@/lib/lessonMedalRevealCopy'
import { computeCorePercent, resolveMedalFromCoreXp, type LessonMedalTierOrNull } from '@/lib/lessonScore'
import { getLessonBadgeDefinition, resolveLessonBadgeProgress } from '@/lib/lessonBadges'
import { mergeLessonProgressOnComplete, migrateUserLessonProgress } from '@/lib/lessonProgressMigration'
import { loadLessonProgress, saveLessonProgress } from '@/lib/lessonProgressStorage'
import {
  findStaticLessonByTopic,
  getLearningLessonActions,
  getLearningLessonById,
  getLearningLessonFollowupPlaceholder,
  registerRuntimeLearningLesson,
  type LearningLessonActionId,
} from '@/lib/learningLessons'
import { getStructuredLessonById } from '@/lib/structuredLessons'
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
import RewardPopup from '@/components/RewardPopup'
import LessonIntroScreen, { type LessonIntroDepth } from '@/components/LessonIntroScreen'
import LessonExtraTipsScreen, {
  type LessonExtraTipsFooterStatus,
  type LessonExtraTipsSavedState,
} from '@/components/LessonExtraTipsScreen'
import LessonStepRenderer from '@/components/LessonStepRenderer'
import { useLessonEngine } from '@/hooks/useLessonEngine'
import { usePracticeSession } from '@/hooks/usePracticeSession'
import PracticeScreen from '@/components/practice/PracticeScreen'
import AccentTrainer, { type AccentFooterView } from '@/components/accent/AccentTrainer'
import { getPracticeFooterView } from '@/lib/practice/practiceFooter'
import { isPracticeWrongLimitAdvance } from '@/lib/practice/practiceFooterCopy'
import { buildPracticeFooterLive, mapPracticeFlowToFooterState } from '@/lib/practice/practiceFooterLive'
import { resolvePracticeCompletion } from '@/lib/practice/resolvePracticeCompletion'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import { resolvePracticeEconomyTier } from '@/lib/practice/practiceEconomyTier'
import type { PracticeRewardUi } from '@/lib/practice/practiceRewardUi'
import { getPracticeModePlan } from '@/lib/practice/engine/sessionPlan'
import { buildPracticeQuestionFingerprintFromQuestion } from '@/lib/practice/questionFingerprint'
import { FOOTER_DYNAMIC_MAX_LENGTH, pickFooterVoice, type FooterVoiceCandidate } from '@/lib/footerVoice'
import type { AdaptiveFooterView } from '@/types/adaptiveRetention'
import { isIosChromeBrowser } from '@/lib/sttClient'
import { isIosSafariUserAgent, isIosWebKitBrowser } from '@/lib/iosSafariViewport'
import type { VocabularyFooterView } from '@/types/vocabulary'
import {
  buildEngvoInputAudioTranscriptionConfig,
  ENGVO_DEFAULT_LEVEL,
  ENGVO_DEFAULT_VOICE,
  ENGVO_INACTIVITY_HANGUP_MS,
  ENGVO_REALTIME_MODEL,
  ENGVO_INTERRUPT_DEBOUNCE_MS,
  ENGVO_REALTIME_SERVER_VAD_TURN_DETECTION,
  clampEngvoRealtimeSpeed,
  engvoSpeechSpeedFromPreset,
  getEngvoDefaultSpeechSpeedPreset,
  type EngvoCefrLevel,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
  ENGVO_CALL_FINISHED_ASSISTANT_TEXT,
  ENGVO_DIALING_ASSISTANT_TEXT,
} from '@/lib/engvo/constants'
import type { EngvoRealtimeReplayItem } from '@/lib/engvo/realtimeReplay'
import {
  buildEngvoContinuationResponseInstructions,
  buildEngvoFirstTurnResponseInstructions,
} from '@/lib/engvo/instructions'
import { buildEngvoRealtimeInstructionsClient } from '@/lib/engvo/instructionsClient'
import { normalizeEngvoRealtimeUserMessage } from '@/lib/engvo/errors'
import {
  insertEngvoUserMessage,
  shouldCancelEngvoAssistantOnUserAudioCommitted,
  shouldInsertEngvoUserBeforeAssistant,
} from '@/lib/engvo/callMessageOrder'
import { buildEngvoClientSessionUpdate } from '@/lib/engvo/realtimeSession'
import {
  loadEngvoCefrLevel,
  loadEngvoRealtimeVoice,
  loadEngvoSpeechSpeedPreset,
  resolveEngvoSpeechSpeedPreset,
  saveEngvoCefrLevel,
  saveEngvoRealtimeVoice,
  saveEngvoSpeechSpeedPreset,
} from '@/lib/engvo/preferences'
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
import { engvoVoiceTranscriptIsLikelyNoise, shouldShowEngvoVoiceUserTranscript } from '@/lib/engvo/transcriptGuard'
import { consumeNextEngvoWelcomeMessage } from '@/lib/engvo/welcomeMessageRotation'
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
  lessonMenuGenerateClientTimeoutMs,
} from '@/lib/lessonProviderTimeouts'

const Chat = dynamic(() => import('@/components/Chat'))
import SlideOutMenu from '@/components/SlideOutMenu'
const VocabularyWorldsScreen = dynamic(() => import('@/components/vocabulary/VocabularyWorldsScreen'))
const VocabularyByLevelScreen = dynamic(() => import('@/components/vocabulary/VocabularyByLevelScreen'))
type StructuredLessonRuntimeMode = 'generate' | 'repeat'
type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'
type PracticeOpenRequest = {
  lessonId?: string
  mode: PracticeMode
  entrySource: PracticeEntrySource
  customTopic?: string
  referenceExerciseType?: PracticeExerciseType
}
type PracticeGenerateResponse = {
  questions?: PracticeQuestion[]
  generated?: boolean
  fallback?: boolean
  fallbackReason?: string
  error?: string
}
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

const PRACTICE_AI_INITIAL_BATCH_SIZE = 2
const PRACTICE_PREFETCH_BUFFER_TARGET = 1
const PRACTICE_SEEN_KEYS_LIMIT = 80
const PRACTICE_PREFETCH_TIMEOUT_MS = 12_000
const PRACTICE_GENERATE_NEXT_TIMEOUT_MS = 16_000

function buildSeenPracticeKeys(questions: PracticeQuestion[]): string[] {
  const unique = new Set<string>()
  for (const question of questions) {
    const key = buildPracticeQuestionFingerprintFromQuestion(question)
    if (!key) continue
    unique.add(key)
  }
  return Array.from(unique).slice(-PRACTICE_SEEN_KEYS_LIMIT)
}

function pickUniquePracticeQuestions(candidates: PracticeQuestion[], existing: PracticeQuestion[]): PracticeQuestion[] {
  const seen = new Set(buildSeenPracticeKeys(existing))
  const fresh: PracticeQuestion[] = []
  for (const candidate of candidates) {
    const key = buildPracticeQuestionFingerprintFromQuestion(candidate)
    if (!key || seen.has(key)) continue
    seen.add(key)
    fresh.push(candidate)
  }
  return fresh
}

function getMenuGenerationFallbackMessage(reason: LessonRepeatFallbackReason | undefined): string {
  if (reason === 'provider') return 'Проблема с доступом к модели. Попробуйте сгенерировать урок ещё раз.'
  if (reason === 'parse') return 'Модель вернула ответ не в том формате. Попробуйте сгенерировать урок ещё раз.'
  if (reason === 'validation') return 'Модель сгенерировала урок низкого качества. Повторите генерацию.'
  if (reason === 'no_steps') return 'Для этого урока пока нет шагов для генерации.'
  return 'Не удалось сгенерировать новый урок. Попробуйте ещё раз.'
}

function cloneStructuredLessonWithRunKey(lesson: LessonData): LessonData {
  const cloned = typeof structuredClone === 'function' ? structuredClone(lesson) : JSON.parse(JSON.stringify(lesson))
  return {
    ...cloned,
    runKey: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
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
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500
/** При 429 OpenRouter даёт 20 запросов в минуту — пауза должна увести попытку в следующую минуту. */
const RETRY_DELAY_RATE_LIMIT_MS = 20_000
const RETRY_DELAY_RATE_LIMIT_BASE_MS = 5_000
const RETRY_MESSAGES = ['Пробую ещё раз…', 'Вот-вот, почти!']
const ERROR_FIRST_MESSAGE = 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.'
const EMPTY_RESPONSE_FALLBACK = 'ИИ не отвечает. Проверьте сеть и попробуйте снова.'
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
const LESSON_RETURN_HINT_VISIBLE_MS = 10_000

type StructuredLessonRunOrigin = 'menu_reopen' | 'menu_generate' | 'post_lesson_repeat' | 'repeat_api'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [rewardsState, setRewardsState] = useState<RewardsState>(createDefaultRewardsState)
  /** После useLayoutEffect storage — иначе hydration mismatch (localStorage только на клиенте). */
  const [footerHydrated, setFooterHydrated] = useState(false)
  const [rewardPopupText, setRewardPopupText] = useState<string | null>(null)
  const [lessonReturnHintText, setLessonReturnHintText] = useState<string | null>(null)
  const [lastStructuredLessonGlobalDelta, setLastStructuredLessonGlobalDelta] = useState(0)
  const [footerSessionContextNonce, setFooterSessionContextNonce] = useState(0)
  const [streakHintConsumedForMode, setStreakHintConsumedForMode] = useState<string | null>(null)
  const [footerTransitionText, setFooterTransitionText] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [communicationVoiceDropdownOpen, setCommunicationVoiceDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [homeMenuView, setHomeMenuView] = useState<MenuView>('root')
  const [homeAiChatPanel, setHomeAiChatPanel] = useState<AiChatPanel>('summary')
  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)
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
  /** Одноразовое восстановление панели уроков в боковом меню после «Назад». */
  const restoreLessonMenuOnNextOpenRef = React.useRef(false)
  /** Одноразовое восстановление встроенного меню уроков на главной после «Назад». */
  const [pendingHomeLessonMenuRestore, setPendingHomeLessonMenuRestore] = useState(false)
  const [activeLearningLessonId, setActiveLearningLessonId] = useState<string | null>(null)
  const [activeStructuredLessonRuntime, setActiveStructuredLessonRuntime] = useState<LessonData | null>(null)
  const [structuredLessonLoadingId, setStructuredLessonLoadingId] = useState<string | null>(null)
  /** Ошибка фоновой генерации варианта урока (меню «Сгенерировать урок»); урок уже открыт со статическим клоном. */
  const [menuLessonBgError, setMenuLessonBgError] = useState<string | null>(null)
  /** Фоновая генерация варианта structured-урока: кнопка «Начать урок» на intro/tips. */
  const [structuredLessonVariantRegenerating, setStructuredLessonVariantRegenerating] = useState(false)
  /** Урок открыт из меню «Сгенерировать урок» — подпись основной кнопки на intro/tips. */
  const [startLessonCtaFromMenuGenerate, setStartLessonCtaFromMenuGenerate] = useState(false)
  const [pendingTutorLessonTitle, setPendingTutorLessonTitle] = useState<string | null>(null)
  const [activeLessonVariantNumber, setActiveLessonVariantNumber] = useState(1)
  const structuredLessonRunOriginRef = React.useRef<StructuredLessonRunOrigin>('menu_reopen')
  /** Если у урока нет runKey, порядок вариантов fill_choice зависит от nonce на каждый новый вход. */
  const [structuredLessonShuffleNonce, setStructuredLessonShuffleNonce] = useState(0)
  const [postLessonBusy, setPostLessonBusy] = useState(false)
  const [selectedPostLessonAction, setSelectedPostLessonAction] = useState<PostLessonAction | null>(null)
  const [postLessonMenuResetKey, setPostLessonMenuResetKey] = useState(0)
  const [lessonOverlay, setLessonOverlay] = useState<LessonOverlayState | null>(null)
  const [lessonViewStage, setLessonViewStage] = useState<'intro' | 'tips' | 'lesson'>('intro')
  const [lessonTipsReturnStage, setLessonTipsReturnStage] = useState<'intro' | 'lesson'>('intro')
  const [lessonIntroDepth, setLessonIntroDepth] = useState<LessonIntroDepth>('quick')
  const [lessonExtraTipsStatus, setLessonExtraTipsStatus] = useState<LessonExtraTipsFooterStatus>('idle')
  const [lessonExtraTipsState, setLessonExtraTipsState] = useState<LessonExtraTipsSavedState | null>(null)
  const activeStructuredLesson =
    activeStructuredLessonRuntime ??
    (structuredLessonLoadingId ? null : activeLearningLessonId ? getStructuredLessonById(activeLearningLessonId) : null)
  const {
    step: activeStructuredLessonStep,
    timeline: activeStructuredLessonTimeline,
    status: activeStructuredLessonStatus,
    feedback: activeStructuredLessonFeedback,
    blockProgress: activeStructuredLessonBlockProgress,
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
  } = useLessonEngine(activeStructuredLesson)
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
  }, [activeStructuredLessonStatus, activeStructuredLesson?.id, activeStructuredLesson?.runKey])
  const lessonFirstAnswerTrackedRef = React.useRef(false)
  const lessonCycle1ActiveSessionRef = React.useRef(false)
  const finalizeLessonCycle1OnLeaveRef = React.useRef<() => void>(() => {})
  // DEBUG: удалить после редактирования урока
  const debugFinalePendingRef = React.useRef<string | null>(null)

  const practiceSession = usePracticeSession({ audience: settings.audience })
  const { abandonSession: abandonPracticeSession, startSession: startPracticeSession } = practiceSession
  const [accentTrainerActive, setAccentTrainerActive] = useState(false)
  const [activeAccentLessonId, setActiveAccentLessonId] = useState<string | null>(null)
  const [accentLessonRequestKey, setAccentLessonRequestKey] = useState(0)
  const [accentFooterView, setAccentFooterView] = useState<AccentFooterView | null>(null)
  const [vocabularyWorldsActive, setVocabularyWorldsActive] = useState(false)
  const [vocabularyByLevelActive, setVocabularyByLevelActive] = useState(false)
  const [vocabularyFooterView, setVocabularyFooterView] = useState<VocabularyFooterView | null>(null)
  const [adaptiveFooterView, setAdaptiveFooterView] = useState<AdaptiveFooterView | null>(null)
  const [engvoVoiceMode, setEngvoVoiceMode] = useState(false)
  const [engvoRealtimeVoice, setEngvoRealtimeVoice] = useState<EngvoRealtimeVoice>(ENGVO_DEFAULT_VOICE)
  const [engvoCefrLevel, setEngvoCefrLevel] = useState<EngvoCefrLevel>(ENGVO_DEFAULT_LEVEL)
  const [engvoSpeechSpeedPreset, setEngvoSpeechSpeedPreset] =
    useState<EngvoSpeechSpeedPresetId>('conversational')
  const [engvoCallPhase, setEngvoCallPhase] = useState<EngvoCallPhase>('idle')
  const [engvoErrorText, setEngvoErrorText] = useState<string | null>(null)
  const [engvoUserInterimText, setEngvoUserInterimText] = useState('')
  const [engvoAssistantPendingText, setEngvoAssistantPendingText] = useState('')
  const [engvoSessionUpdateTick, setEngvoSessionUpdateTick] = useState(0)
  const [engvoBootstrapServiceStatusVisible, setEngvoBootstrapServiceStatusVisible] = useState(false)
  const [engvoLocalAudioStream, setEngvoLocalAudioStream] = useState<MediaStream | null>(null)
  const [engvoRemoteAudioStream, setEngvoRemoteAudioStream] = useState<MediaStream | null>(null)
  /** Пока `<audio>` реально играет удалённый WebRTC-поток — метер в чате должен смотреть на remote, даже если фаза уже `listening` (эхо/VAD). */
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
    ringCount: number
    gemsPending: boolean
    cupClaimed: boolean
  } | null>(null)
  const [practiceProgressRevision, setPracticeProgressRevision] = React.useState(0)
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
    return resolveLessonSilverCapForRun({
      origin: structuredLessonRunOriginRef.current,
      variantNumber: activeLessonVariantNumber,
      cycle1Closed: progress?.cycle1Closed === true,
      isRepeatRun: isStructuredLessonRepeatRun,
    })
  }, [activeStructuredLesson, activeLessonVariantNumber, isStructuredLessonRepeatRun])
  const processedLessonXpAwardNonceRef = React.useRef(0)
  const processedLessonXpAwardKeyRef = React.useRef<string | null>(null)
  const globalLessonXpAwardedThisRunRef = React.useRef(0)
  const lessonReturnHintShownForRunRef = React.useRef<string | null>(null)
  const rewardPopupSeenRef = React.useRef<string | null>(null)
  const footerContextSignatureRef = React.useRef<string | null>(null)
  const footerTransitionTimeoutRef = React.useRef<number | null>(null)
  /** Настройки на момент последней отправки сообщения; для баннера «настройки изменены». */
  const [settingsAtLastSend, setSettingsAtLastSend] = useState<Settings | null>(null)
  const initialLoadDoneRef = React.useRef(false)
  const usageRequestStartedRef = React.useRef(false)
  const newDialogRef = React.useRef(false)
  const firstMessageRequestIdRef = React.useRef(0)
  /** Не запускать второй запрос первого сообщения, пока первый в полёте (защита от двойного вызова из эффекта). */
  const firstMessageInFlightRef = React.useRef(false)
  const ensureFirstMessageRef = React.useRef<(() => Promise<void>) | null>(null)
  const dialogSeedRef = React.useRef(createDialogSeed())
  /** Актуальный язык ожидаемого ввода в общении — для тела fetch без гонки замыкания sendToApi/setTimeout. */
  const communicationInputExpectedLangRef = React.useRef(settings.communicationInputExpectedLang)
  communicationInputExpectedLangRef.current = settings.communicationInputExpectedLang
  const communicationVoiceInputMode = getCommunicationVoiceInputMode(settings)
  const communicationVoiceDropdownRef = React.useRef<HTMLDivElement | null>(null)
  const appColumnRef = React.useRef<HTMLDivElement | null>(null)
  const homeColumnRef = React.useRef<HTMLDivElement | null>(null)
  const chatGlassRef = React.useRef<HTMLDivElement>(null)
  const headerColumnBounds = useAppColumnBounds(appColumnRef, { remeasureWhen: menuOpen })
  const homeColumnBounds = useAppColumnBounds(homeColumnRef, { remeasureWhen: menuOpen })
  const chatColumnBounds = useAppColumnBounds(chatGlassRef, { remeasureWhen: menuOpen })
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
  const engvoPendingRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | null>(null)
  const engvoPendingRealtimeSpeedRef = React.useRef<number | null>(null)
  const engvoLastAppliedRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | null>(null)
  const engvoLastAppliedRealtimeSpeedRef = React.useRef<number | null>(null)
  const engvoApplyingRealtimeVoiceRef = React.useRef<EngvoRealtimeVoice | null>(null)
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
  /** iOS Safari + Chrome (CriOS) — общая WebKit-ветка dialog layout. */
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
    const finalText = guardEngvoAssistantContent(cleanNewlines(engvoFinalAssistantTextRef.current))
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
    setEngvoCallPhase('listening')
    setEngvoErrorText(null)
  }, [guardEngvoAssistantContent, markEngvoAssistantAheadOfPendingUserTranscript, resetEngvoAssistantTurn])

  const commitEngvoAssistantText = useCallback(
    (text: string, responseId?: string | null) => {
      const cleanText = guardEngvoAssistantContent(cleanNewlines(text))
      if (!cleanText) return
      if (responseId) {
        if (engvoCommittedResponseIdsRef.current.has(responseId)) return
        engvoCommittedResponseIdsRef.current.add(responseId)
      }

      markEngvoAssistantAheadOfPendingUserTranscript()
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
            if (responseId) {
              const pending = engvoPendingTranslationByResponseIdRef.current.get(responseId)
              if (pending) {
                engvoPendingTranslationByResponseIdRef.current.delete(responseId)
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
        const lastTrimmed = last?.content.trim() ?? ''
        if (
          last?.role === 'assistant' &&
          last.engvoLocalWelcome !== true &&
          !last.engvoServiceLine &&
          lastTrimmed !== ENGVO_CALL_FINISHED_ASSISTANT_TEXT &&
          lastTrimmed === cleanText.trim()
        ) {
          return withoutDial
        }
        const assistantMsg: ChatMessage = { role: 'assistant', content: cleanText }
        const nextMessages = [...withoutDial, assistantMsg]
        if (responseId) {
          const pending = engvoPendingTranslationByResponseIdRef.current.get(responseId)
          if (pending) {
            engvoPendingTranslationByResponseIdRef.current.delete(responseId)
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
      setEngvoCallPhase('listening')
      setEngvoErrorText(null)
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
    clearEngvoTimeout(engvoInactivityTimeoutRef)
  }, [clearEngvoTimeout])

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
      const dataChannel = engvoDataChannelRef.current
      if (hasActiveAssistantResponse && dataChannel?.readyState === 'open') {
        try {
          dataChannel.send(JSON.stringify({ type: 'response.cancel' }))
          dataChannel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }))
        } catch {
          // ignore
        }
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
    [clearEngvoInactivityTimeout, clearEngvoSessionUpdateRetry, clearEngvoTimeout, stopEngvoPlayback]
  )

  const finishEngvoCall = useCallback(() => {
    engvoRedialWithoutWelcomeRef.current = true
    cleanupEngvoRuntime({ markIgnoredCurrent: true })
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

  const sendEngvoRealtimeEvent = useCallback((payload: Record<string, unknown>): boolean => {
    const dataChannel = engvoDataChannelRef.current
    if (!dataChannel || dataChannel.readyState !== 'open') return false
    try {
      dataChannel.send(JSON.stringify(payload))
      return true
    } catch {
      return false
    }
  }, [])

  const updateEngvoRealtimeSession = useCallback(
    (payload: { voice?: EngvoRealtimeVoice; level?: EngvoCefrLevel; speed?: number }): boolean => {
      const speechSpeed = clampEngvoRealtimeSpeed(
        payload.speed ?? engvoSpeechSpeedFromPreset(engvoSpeechSpeedPreset)
      )
      return sendEngvoRealtimeEvent({
        type: 'session.update',
        session: buildEngvoClientSessionUpdate({
          model: ENGVO_REALTIME_MODEL,
          voice: payload.voice ?? engvoRealtimeVoice,
          speed: speechSpeed,
          instructions: buildEngvoRealtimeInstructionsClient({
            audience: settings.audience,
            level: payload.level ?? engvoCefrLevel,
            topic: settings.topic,
            speechSpeed,
          }),
          inputAudioTranscription: {
            ...buildEngvoInputAudioTranscriptionConfig(),
            language: 'ru',
          },
        }),
      })
    },
    [
      engvoCefrLevel,
      engvoRealtimeVoice,
      engvoSpeechSpeedPreset,
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

      if (parsed.type === 'session.created' || parsed.type === 'session.updated') {
        markEngvoSessionUpdateAck()
        clearEngvoTimeout(engvoSessionAckTimeoutRef)
        console.info('[engvo] session-ack', parsed.type)
        engvoSessionStartedRef.current = true
        setEngvoErrorText(null)
        setEngvoCallPhase('listening')
        setEngvoSessionUpdateTick((prev) => prev + 1)

        if (parsed.type === 'session.created') {
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
            }
            setMessages((prev) => prev.filter((m) => !m.engvoServiceLine))
          } else if (!engvoGreetingTriggeredRef.current) {
            const greetingSent = sendEngvoRealtimeEvent({
              type: 'response.create',
              response: {
                instructions: buildEngvoFirstTurnResponseInstructions({
                  audience: settings.audience,
                  level: engvoCefrLevel,
                  topic: settings.topic,
                }),
              },
            })
            if (greetingSent) {
              engvoGreetingTriggeredRef.current = true
            }
          }
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_started') {
        const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
          responseId: engvoAssistantResponseIdRef.current,
          responseDone: engvoAssistantResponseDoneRef.current,
        })
        const debounceInterrupt = shouldDebounceEngvoBargeIn({
          callPhase: engvoCallPhase,
          hasActiveAssistantResponse,
        })
        clearEngvoTimeout(engvoInterruptDebounceTimeoutRef)
        if (debounceInterrupt) {
          markEngvoInterruptDebouncePending(engvoInterruptDebounceStateRef.current)
          engvoInterruptDebounceTimeoutRef.current = window.setTimeout(() => {
            engvoInterruptDebounceTimeoutRef.current = null
            markEngvoInterruptCommitted(engvoInterruptDebounceStateRef.current)
            stopEngvoPlayback(true)
            setEngvoCallPhase('listening')
          }, ENGVO_INTERRUPT_DEBOUNCE_MS)
        } else {
          resetEngvoInterruptDebounceState(engvoInterruptDebounceStateRef.current)
          stopEngvoPlayback(true)
          setEngvoCallPhase('listening')
        }
        return
      }

      if (parsed.type === 'input_audio_buffer.speech_stopped') {
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
          typeof parsed.item_id === 'string' &&
          !engvoCommittedUserItemIdsRef.current.has(parsed.item_id)
        ) {
          const itemId = parsed.item_id
          const itemFromState = engvoTranscriptStateRef.current.items[itemId]
          const transcript =
            (parsed.transcript ?? '').trim() || itemFromState?.completedText?.trim() || ''
          setEngvoUserInterimText('')
          const hasActiveAssistantResponse = hasActiveEngvoAssistantResponse({
            responseId: engvoAssistantResponseIdRef.current,
            responseDone: engvoAssistantResponseDoneRef.current,
          })
          const interruptCommitted = engvoInterruptDebounceStateRef.current.committed
          const isLikelyNoise = !transcript || engvoVoiceTranscriptIsLikelyNoise(transcript)
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
            (normalizedTranscript === normalizedAssistantPending || normalizedTranscript === normalizedLastAssistant)
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
          if (transcript && !shouldShowEngvoVoiceUserTranscript(transcript)) {
            engvoCommittedUserItemIdsRef.current.add(itemId)
            restorePhaseAfterNoiseReject('listening')
            return
          }
          engvoCommittedUserItemIdsRef.current.add(itemId)
          setEngvoCallPhase('userFinalizing')
          if (transcript) {
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
          }
          setEngvoCallPhase('assistantPending')
        }
        return
      }

      if (parsed.type === 'response.created') {
        clearEngvoTimeout(engvoResponseDoneFallbackTimeoutRef)
        if (hasActiveAssistantTurn && responseId && responseId !== activeResponseId) {
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
            if (engvoAssistantResponseDoneRef.current) return
            const fallbackText = engvoFinalAssistantTextRef.current || cleanFinalText
            if (!fallbackText.trim()) return
            engvoAssistantResponseDoneRef.current = true
            commitEngvoAssistantText(fallbackText, responseId)
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
            if (engvoAssistantResponseDoneRef.current) return
            const fallbackText = engvoFinalAssistantTextRef.current || finalTranscript
            if (!fallbackText.trim()) return
            engvoAssistantResponseDoneRef.current = true
            commitEngvoAssistantText(fallbackText, responseId)
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
        commitEngvoAssistantText(fallbackText, responseId)
      }
    },
    [
      clearEngvoTimeout,
      sendEngvoRealtimeEvent,
      commitEngvoAssistantText,
      engvoCefrLevel,
      messages,
      engvoAssistantPendingText,
      resetEngvoAssistantTurn,
      setEngvoSessionError,
      isEngvoDeferredSessionUpdateConflict,
      markEngvoSessionUpdateAck,
      bumpEngvoGoal,
      settings.audience,
      settings.topic,
      scheduleEngvoSessionUpdateRetry,
      stopEngvoPlayback,
      engvoCallPhase,
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
    engvoLastAppliedRealtimeVoiceRef.current = engvoRealtimeVoice
    const speechSpeedForCall = engvoSpeechSpeedFromPreset(presetForCall)
    engvoLastAppliedRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(speechSpeedForCall)

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
        clearEngvoTimeout(engvoDcOpenTimeoutRef)
        console.info('[engvo] dc-open')
        const speechSpeed = clampEngvoRealtimeSpeed(speechSpeedForCall)
        const sent = sendEngvoRealtimeEvent({
          type: 'session.update',
          session: buildEngvoClientSessionUpdate({
            model: ENGVO_REALTIME_MODEL,
            voice: engvoRealtimeVoice,
            speed: speechSpeed,
            instructions: buildEngvoRealtimeInstructionsClient({
              audience: settings.audience,
              level: engvoCefrLevel,
              topic: settings.topic,
              speechSpeed,
            }),
            inputAudioTranscription: {
              ...buildEngvoInputAudioTranscriptionConfig(),
              language: 'ru',
            },
          }),
        })
        if (!sent) {
          setEngvoSessionError('Не удалось отправить параметры Realtime-сессии.')
          return
        }
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
          speed: clampEngvoRealtimeSpeed(speechSpeedForCall),
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
    engvoRealtimeVoice,
    engvoSpeechSpeedPreset,
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
      setEngvoCallStartedAt(Date.now())
    }
  }, [engvoCallPhase, engvoCallStartedAt])

  useEffect(() => {
    if (!engvoVoiceMode) {
      clearEngvoInactivityTimeout()
      return
    }
    if (engvoCallPhase !== 'listening' || engvoUserInterimText.trim()) {
      clearEngvoInactivityTimeout()
      return
    }
    engvoInactivityTimeoutRef.current = window.setTimeout(() => {
      finishEngvoCall()
    }, ENGVO_INACTIVITY_HANGUP_MS)
    return clearEngvoInactivityTimeout
  }, [clearEngvoInactivityTimeout, engvoCallPhase, engvoUserInterimText, engvoVoiceMode, finishEngvoCall])

  useEffect(() => {
    if (!engvoVoiceMode) {
      setEngvoBootstrapServiceStatusVisible(false)
    }
  }, [engvoVoiceMode])

  const handleEngvoVoiceChange = useCallback(
    (voice: EngvoRealtimeVoice) => {
      setEngvoRealtimeVoice(voice)
      saveEngvoRealtimeVoice(voice)
      if (engvoVoiceMode) {
        engvoPendingRealtimeVoiceRef.current = voice
        setEngvoSessionUpdateTick((prev) => prev + 1)
      }
    },
    [engvoVoiceMode]
  )

  const handleEngvoLevelChange = useCallback(
    (level: EngvoCefrLevel) => {
      setEngvoCefrLevel(level)
      if (!loadEngvoSpeechSpeedPreset()) {
        const nextPreset = getEngvoDefaultSpeechSpeedPreset(settings.audience, level)
        setEngvoSpeechSpeedPreset(nextPreset)
        if (engvoVoiceMode) {
          engvoPendingRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(nextPreset))
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
        engvoPendingRealtimeSpeedRef.current = clampEngvoRealtimeSpeed(engvoSpeechSpeedFromPreset(preset))
        setEngvoSessionUpdateTick((prev) => prev + 1)
      }
    },
    [engvoVoiceMode]
  )

  useEffect(() => {
    if (!engvoVoiceMode || !engvoSessionStartedRef.current) return
    updateEngvoRealtimeSession({ level: engvoCefrLevel })
  }, [engvoVoiceMode, engvoCefrLevel, settings.audience, settings.topic, updateEngvoRealtimeSession])

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

              // 429: ретраим только для OpenRouter (как было), для OpenAI — без ретраев.
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
  }, [messages, sendToApi, fetchUsage])

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
    setLessonViewStage('intro')
    setLessonTipsReturnStage('intro')
    setLessonIntroDepth('quick')
    setLessonExtraTipsStatus('idle')
    setLessonExtraTipsState(null)
    setStartLessonCtaFromMenuGenerate(false)
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
        content: consumeNextEngvoWelcomeMessage(settings.audience, engvoCefrLevel),
        engvoLocalWelcome: true,
      },
    ])
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
  }, [cleanupEngvoRuntime, engvoCefrLevel, resetStructuredLessonSession, settings.audience])

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
          const response = await fetch(mode === 'repeat' ? '/api/lesson-repeat' : '/api/structured-lesson-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: settings.provider,
              openAiChatPreset: settings.openAiChatPreset,
              audience: settings.audience,
              lessonId,
              recentVariantIds,
            }),
          })
          const data = (await response.json()) as { lesson?: LessonData }
          if (response.ok && data.lesson) {
            if (data.lesson.variantId && !options?.cacheResult) {
              const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
              structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, data.lesson.variantId)
            }
            if (options?.cacheResult) {
              prefetchedStructuredLessonRuntimeRef.current[requestKey] = cloneLessonData(data.lesson)
            }
            console.info(
              `[lesson-ui] mode=${mode} lesson=${lessonId} source=network fetch_ms=${Date.now() - fetchStartedAt}`
            )
            return data.lesson
          }
        } catch (error) {
          console.warn(mode === 'repeat' ? 'lesson-repeat failed:' : 'structured-lesson-generate failed:', error)
        }
        const clonedFallback = cloneStructuredLessonWithRunKey(fallbackLesson)
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
    async (lessonId: string, lessonsPanel: LessonsPanel = 'a2', meta?: LearningLessonMenuMeta) => {
      const lesson = getLearningLessonById(lessonId)
      if (!lesson) return
      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      menuLessonGenerateCleanupRef.current?.()
      menuLessonBgFetchEpochRef.current += 1
      setStructuredLessonVariantRegenerating(false)
      setStartLessonCtaFromMenuGenerate(false)
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
      setLessonViewStage('intro')
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
    [abandonPracticeSession, bumpFooterSessionContext, menuOpen]
  )

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
      if (!getStructuredLessonById(lessonId)) return
      setMenuOpen(false)
      if (
        dialogStarted &&
        activeStructuredLessonRuntime != null &&
        activeStructuredLesson?.id === lessonId
      ) {
        setLessonViewStage('lesson')
        goToStructuredLessonFinale()
        return
      }
      debugFinalePendingRef.current = lessonId
      void openLearningLesson(lessonId, lessonsPanel)
      setLessonViewStage('lesson')
    },
    [
      activeStructuredLesson?.id,
      activeStructuredLessonRuntime,
      dialogStarted,
      goToStructuredLessonFinale,
      openLearningLesson,
    ]
  )

  const openGeneratedLearningLesson = useCallback(
    async (lessonId: string, lessonsPanel: LessonsPanel = 'a2', meta?: LearningLessonMenuMeta) => {
      const baseLesson = getLearningLessonById(lessonId)
      const structuredLesson = getStructuredLessonById(lessonId)
      if (!baseLesson || !structuredLesson) {
        throw new Error('Для выбранного урока пока нет алгоритма генерации.')
      }

      lessonMenuLaunchSurfaceRef.current = menuOpen ? 'slide' : 'home'
      setStartLessonCtaFromMenuGenerate(true)
      menuLessonGenerateCleanupRef.current?.()

      abandonPracticeSession()
      const requestId = ++lessonOpenRequestIdRef.current
      const fetchStartedAt = Date.now()
      setMenuLessonBgError(null)
      setRetryMessage(null)

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
      setLessonViewStage('intro')
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

      menuLessonBgFetchEpochRef.current += 1
      const fetchEpoch = menuLessonBgFetchEpochRef.current
      setStructuredLessonVariantRegenerating(true)

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
            }),
          })
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

          if (data.lesson.variantId) {
            const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
            structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, data.lesson.variantId)
          }

          setActiveStructuredLessonRuntime(data.lesson)
          setMenuLessonBgError(null)
          console.info(
            `[lesson-ui] mode=menu-generate-bg lesson=${lessonId} source=${menuGenerationFallback ? 'fallback' : 'llm'} fetch_ms=${Date.now() - fetchStartedAt}`
          )
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            if (!timedOutRef.current) return
            setMenuLessonBgError(
              'Генерация нового варианта заняла слишком много времени. Урок уже открыт — позже можно снова нажать «Сгенерировать урок».'
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
          }
        }
      })()
    },
    [abandonPracticeSession, menuOpen, settings.provider, settings.openAiChatPreset, settings.audience]
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
      setStartLessonCtaFromMenuGenerate(false)
      abandonPracticeSession()
      let lesson: LessonBlueprint | null = null
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
      try {
        const response = await fetch('/api/lesson-generate', {
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
        })
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
      if (requestId !== lessonOpenRequestIdRef.current) return

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
      setStructuredLessonLoadingId(null)
      setPendingTutorLessonTitle(null)
      setLoading(false)
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
      // Закрытие меню после запуска практики триггерит эффект «снимок настроек при открытии меню»:
      // при расхождении он вызывает restartChatForNewModeFromMenu → abandonPracticeSession и сносит сессию.
      // Сбрасываем снимок: переход в практику — намеренное действие, не «закрыли меню после правок чата».
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
      setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'practice' })
      startPracticeSession(config)
    },
    [resetStructuredLessonSession, startPracticeSession]
  )

  const resolvePracticeRequest = useCallback(
    async (request: PracticeOpenRequest, generationSource: PracticeBuildConfig['generationSource']): Promise<PracticeBuildConfig> => {
      if (request.mode === 'reference' && generationSource !== 'ai_generated') {
        throw new Error('Эталонный режим доступен только с генерацией от ИИ.')
      }
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
      if (generationSource === 'ai_generated') {
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
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (!response.ok) {
          throw new Error(data.error ?? 'Не удалось сгенерировать практику.')
        }
        const nextQuestions = Array.isArray(data.questions) ? pickUniquePracticeQuestions(data.questions, []) : []
        if (nextQuestions.length === 0) {
          throw new Error('Не удалось получить стартовые задания для сгенерированного варианта.')
        }
        questions = nextQuestions
      }

      return {
        source: source ?? { kind: 'static_lesson', lessonId: lesson.id },
        lesson,
        mode: request.mode,
        entrySource: request.entrySource,
        generationSource,
        questions,
        targetQuestionCount: generationSource === 'ai_generated' ? totalQuestionCount : undefined,
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
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (response.ok && Array.isArray(data.questions) && data.questions.length > 0) {
          const fresh = pickUniquePracticeQuestions(data.questions, [])
          if (fresh.length > 0) {
            questions = fresh
          }
        }
      }

      startPracticeFromLesson({
        source: session.source,
        lesson,
        mode,
        entrySource: 'menu',
        generationSource,
        questions,
        targetQuestionCount: generationSource === 'ai_generated' ? totalQuestionCount : undefined,
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

    const target = session.targetQuestionCount ?? getPracticeModePlan(session.mode).length
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
            recentPrompts: session.mode === 'reference' ? session.questions.slice(-3).map((item) => item.prompt) : undefined,
            count: fetchCount,
            fromIndex: session.questions.length,
            seenKeys: buildSeenPracticeKeys(session.questions),
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
          return
        }
        const freshQuestions = pickUniquePracticeQuestions(data.questions, session.questions)
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

    const target = session.targetQuestionCount ?? getPracticeModePlan(session.mode).length
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
            recentPrompts: session.mode === 'reference' ? session.questions.slice(-3).map((item) => item.prompt) : undefined,
            count: 1,
            fromIndex: session.questions.length,
            seenKeys: buildSeenPracticeKeys(session.questions),
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error(data.error ?? 'Не удалось подготовить следующее задание.')
        }
        const freshQuestions = pickUniquePracticeQuestions(data.questions, session.questions)
        if (freshQuestions.length === 0) {
          throw new Error('Не удалось получить уникальное следующее задание.')
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

      if (action === 'independent_practice' || action === 'myeng_training') {
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
          title: action === 'independent_practice' ? 'Практика' : 'Тренировка в Engvo',
          lines: [
            finaleCopy.goalLine ?? 'Практика с генерацией вариантов — по подписке.',
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

  // DEBUG: удалить после редактирования урока
  useEffect(() => {
    const pendingLessonId = debugFinalePendingRef.current
    if (!pendingLessonId) return
    if (lessonViewStage !== 'lesson') return
    if (!activeStructuredLesson || activeStructuredLesson.id !== pendingLessonId) return
    debugFinalePendingRef.current = null
    goToStructuredLessonFinale()
  }, [activeStructuredLesson, lessonViewStage, goToStructuredLessonFinale])

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
      },
    }
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, lessonMenuContext])

  React.useEffect(() => {
    if (!pendingHomeLessonMenuRestore || dialogStarted || homeMenuView !== 'lessons') return
    setPendingHomeLessonMenuRestore(false)
  }, [pendingHomeLessonMenuRestore, dialogStarted, homeMenuView, homeLessonMenuRestore])

  const backToLessonList = useCallback(() => {
    const launchSurface = lessonMenuLaunchSurfaceRef.current
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
    resetStructuredLessonSession({ keepLessonMenuContext: true })
    setFooterTransitionText(null)
    bumpFooterSessionContext()
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
        })
        setSettings(mergedSettings)
        setDialogStarted(false)
        setMenuOpen(false)
        setEngvoRealtimeVoice(loadEngvoRealtimeVoice())
        const loadedEngvoLevel = loadEngvoCefrLevel(mergedSettings.audience)
        setEngvoCefrLevel(loadedEngvoLevel)
        setEngvoSpeechSpeedPreset(
          resolveEngvoSpeechSpeedPreset({
            audience: mergedSettings.audience,
            level: loadedEngvoLevel,
          })
        )
      }
      setRewardsState(rewards)
      setInitialized(true)
    } catch (error) {
      console.error('Failed to load persisted app state', error)
    } finally {
      setStorageLoaded(true)
      setFooterHydrated(true)
    }
  }, [])

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

  // Если пользователь переключил аудиторию на "Ребёнок" — автоматически принудим тему и уровень.
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
    if (!storageLoaded) return
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
      lessonReturnHintShownForRunRef.current = null
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
    if (!storageLoaded || lessonViewStage !== 'lesson' || !activeStructuredLesson) return
    const progress = loadLessonProgress(activeStructuredLesson.id)
    const runKey = `${activeStructuredLesson.id}:${activeStructuredLesson.runKey ?? 'static'}`
    if (lessonReturnHintShownForRunRef.current === runKey) return

    const origin = structuredLessonRunOriginRef.current
    let hintText: string | null = null

    if (progress?.cycle1Closed && !progress.medal) {
      hintText = buildLessonCycle1Hint({
        audience: settings.audience,
        origin,
      })
    } else if (progress?.medal) {
      const hintContext: LessonReturnHintContext =
        origin === 'post_lesson_repeat' || origin === 'repeat_api'
          ? 'post_lesson_repeat'
          : 'menu_reopen'
      hintText = buildLessonReturnHint({
        medal: progress.medal,
        audience: settings.audience,
        context: hintContext,
        bestTotalXp: progress.bestTotalXp ?? 0,
        cycle1Closed: progress.cycle1Closed === true,
        silverCapThisRun: resolveLessonSilverCapForRun({
          origin,
          variantNumber: activeLessonVariantNumber,
          cycle1Closed: progress.cycle1Closed === true,
          isRepeatRun: isStructuredLessonRepeatRun,
        }),
      })
    }

    if (!hintText) return

    lessonReturnHintShownForRunRef.current = runKey
    const showTimerId = window.setTimeout(() => {
      setLessonReturnHintText(hintText)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS)
    const hideTimerId = window.setTimeout(() => {
      setLessonReturnHintText(null)
    }, REWARD_POPUP_DELAY_AFTER_MESSAGE_MS + LESSON_RETURN_HINT_VISIBLE_MS)
    return () => {
      window.clearTimeout(showTimerId)
      window.clearTimeout(hideTimerId)
    }
  }, [
    storageLoaded,
    lessonViewStage,
    activeStructuredLesson,
    activeStructuredLesson?.runKey,
    activeLessonVariantNumber,
    isStructuredLessonRepeatRun,
    settings.audience,
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
      ringCount: resolved.reward.progress.ringCount,
      gemsPending: resolved.reward.progress.gemsPending,
      cupClaimed: resolved.reward.progress.cupClaimed,
    })
    setPracticeProgressRevision((n) => n + 1)

    if (resolved.globalXpToAward > 0) {
      setRewardsState((prev) =>
        applyRewardsEvent(prev, {
          type: 'practice_completed',
          amount: resolved.globalXpToAward,
          ticker: resolved.reward.ticker,
        })
      )
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

    /** Строго выбранный в меню провайдер — без автоматического переключения OpenAI ↔ OpenRouter. */
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

  /** Сравнение для баннера в шапке. В «Диалог» и «Перевод»: предупреждение только если изменился только уровень (без перезапуска из меню). Смена темы/времени/ребёнок–взрослый/типа даёт новый чат — баннер не нужен. */
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
  const isAccentActive = accentTrainerActive
  const isVocabularyHubActive = vocabularyWorldsActive || vocabularyByLevelActive
  const activeLessonIntro =
    activeStructuredLesson?.intro ??
    activeLearningLesson?.intro ??
    (activeLearningLessonId ? getStructuredLessonById(activeLearningLessonId)?.intro ?? null : null)
  const activeTutorIntent = activeStructuredLesson?.tutorIntent ?? activeLearningLesson?.tutorIntent ?? null
  const isTutorLessonPending = structuredLessonLoadingId === 'tutor' && Boolean(pendingTutorLessonTitle)
  const isLessonIntroActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'intro')
  const isLessonTipsActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'tips')
  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')

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

  const structuredLessonRunBannerText = useMemo(() => {
    if (!isStructuredLessonActive || !isStructuredLessonRepeatRun || !activeStructuredLesson) return null
    const progress = loadLessonProgress(activeStructuredLesson.id)
    if (!progress?.medal) return null
    return buildLessonReturnHintBannerLine({
      audience: settings.audience,
      bestTotalXp: progress.bestTotalXp ?? 0,
    })
  }, [
    isStructuredLessonActive,
    isStructuredLessonRepeatRun,
    activeStructuredLesson,
    settings.audience,
  ])

  const activeLessonTitle = activeLearningLesson?.title ?? null
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
    isLessonIntroActive || isLessonTipsActive || isStructuredLessonActive || isTutorLessonPending
  const headerLessonTopicTitle =
    activeLessonTitle ?? (isTutorLessonPending ? pendingTutorLessonTitle : null)

  const lessonPageTitleStage = React.useMemo(() => {
    if (!headerLessonTopicTitle) return null
    if (isStructuredLessonActive) return 'lesson' as const
    if (isLessonTipsActive) return 'tips' as const
    if (
      isLessonIntroActive ||
      isTutorLessonPending ||
      (isLessonActive && !isStructuredLessonActive && !isLessonTipsActive)
    ) {
      return 'intro' as const
    }
    return null
  }, [
    headerLessonTopicTitle,
    isStructuredLessonActive,
    isLessonTipsActive,
    isLessonIntroActive,
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
    const lessonNowActive = isLessonActive || isLessonIntroActive || isLessonTipsActive || isStructuredLessonActive
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
    isPracticeActive,
    isStructuredLessonActive,
    settings.audience,
  ])

  React.useEffect(() => {
    if (
      isLessonActive ||
      isLessonIntroActive ||
      isLessonTipsActive ||
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
    isPracticeActive,
    isStructuredLessonActive,
  ])

  const chatFooterVoice = React.useMemo(() => {
    if (!dialogStarted || isLessonActive) return null
    if (engvoVoiceMode) {
      const engvoFooter = getEngvoFooterView({
        phase: engvoCallPhase,
        userInterimText: engvoUserInterimText,
        errorText: engvoErrorText,
      })
      if (!engvoFooter.text) return null
      return {
        typingKey: `engvo-${engvoCallPhase}`,
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
                ? 'En/Ru — говори, я помогу.'
                : settings.communicationInputExpectedLang === 'en'
                  ? 'En: говори — я помогу.'
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
    engvoUserInterimText,
    engvoVoiceMode,
    isLessonActive,
    lastMessageIsError,
    loading,
    loadingTranslationIndex,
    retryMessage,
    searchingInternet,
    communicationVoiceInputMode,
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
        ? 'Локальные фишки — смотри карточки.'
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
  // Тикер награды (например «Хороший шаг. +8 к уровню») — только в активной сессии (чат, шаги урока, практика).
  // На доме, введении и фишках не подмешиваем: иначе после возврата на intro остаётся текст прошлого урока до TTL.
  const footerContextRewardTicker =
    (dialogStarted ||
      isLessonActive ||
      isStructuredLessonActive ||
      isPracticeActive ||
      isAccentActive ||
      isVocabularyHubActive) &&
    !isLessonIntroActive &&
    !isLessonTipsActive
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
    if (isLessonIntroActive || isLessonTipsActive) return 'lesson-intro'
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
        practiceRewardUi?.topLine ?? footerContextRewardTicker
      )
    : isLessonIntroActive
      ? resolveFooterWithStreakLayer(introFooterDynamicText, null, null)
      : isLessonTipsActive
      ? resolveFooterWithStreakLayer(tipsFooterDynamicText, null, null)
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
    if ((isLessonIntroActive || isLessonTipsActive) && activeLearningLessonId) {
      return resolveLessonCardMedal(loadLessonProgress(activeLearningLessonId))
    }
    return null
  }, [
    isStructuredLessonActive,
    isLessonIntroActive,
    isLessonTipsActive,
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
  const footerSsrPlaceholderStatic = formatGlobalFooterStats(createDefaultRewardsState())
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
  const engvoBootstrapServiceIndicatorText = getEngvoBootstrapServiceIndicatorText(engvoCallPhase)
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
    isLessonPreSteps: isLessonIntroActive || isLessonTipsActive || isTutorLessonPending,
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
                : 'Challenge'
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
            {homeMenuView === 'root' && (
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
            )}
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
                          onClick={() => {
                            setSettings((prev) =>
                              normalizeSettingsForAudience({
                                ...prev,
                                audience: 'child',
                              })
                            )
                            setHomeAudienceChosen(true)
                          }}
                          className={PAGE_HOME_AUDIENCE_CHILD_BUTTON_CLASS}
                        >
                          Я - ребёнок
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettings((prev) =>
                              normalizeSettingsForAudience({
                                ...prev,
                                audience: 'adult',
                              })
                            )
                            setHomeAudienceChosen(true)
                          }}
                          className={PAGE_HOME_AUDIENCE_ADULT_BUTTON_CLASS}
                        >
                          Я - взрослый
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setHomeAudienceChosen(false)}
                            className={PAGE_HOME_BACK_TO_AUDIENCE_BUTTON_CLASS}
                            aria-label="Главная: вернуться к выбору ребёнок или взрослый"
                          >
                            <span className="mr-1" aria-hidden>
                              &lt;
                            </span>
                            Главная
                          </button>
                          <button
                            type="button"
                            onClick={() => setHomeMenuView('aiChat')}
                            className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                          >
                            Начать чат с Engvo AI
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
                    engvoRealtimeVoice={engvoRealtimeVoice}
                    engvoCefrLevel={engvoCefrLevel}
                    engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
                    onEngvoVoiceChange={handleEngvoVoiceChange}
                    onEngvoLevelChange={handleEngvoLevelChange}
                    onEngvoSpeechSpeedChange={handleEngvoSpeechSpeedChange}
                    onOpenLearningLesson={openOrContinueLearningLesson}
                    onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}
                    onGenerateLearningLesson={openGeneratedLearningLesson}
                    onOpenPracticeSession={openPracticeSession}
                    onGeneratePracticeSession={generatePracticeSession}
                    onOpenAccentTrainer={openAccentTrainer}
                    onOpenVocabularyWorlds={openVocabularyWorlds}
                    onOpenVocabularyByLevel={openVocabularyByLevel}
                    onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}
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
                  audience={settings.audience}
                  state={practiceSession.state}
                  feedback={practiceSession.feedback}
                  pendingAnswer={practiceSession.pendingAnswer}
                  currentQuestion={practiceSession.currentQuestion}
                  canSubmit={practiceSession.canSubmit}
                  completionMeta={practiceCompletionMeta}
                  onSubmitAnswer={practiceSession.submitAnswer}
                  onAcknowledgeInstruction={practiceSession.acknowledgeInstruction}
                  onRetryAfterError={() => {
                    if (!practiceSession.session) return
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
                  <div className="lesson-enter glass-surface w-full max-w-[24rem] rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-white/95 px-4 py-5 text-center shadow-sm">
                    <p className="text-[15px] font-semibold text-[var(--text)]">Engvo составляет урок...</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                      Тема: {pendingTutorLessonTitle}. Сейчас подготовлю короткие примеры и задания по выбранному смыслу.
                    </p>
                  </div>
                </div>
              ) : isLessonIntroActive && activeLessonIntro ? (
                <LessonIntroScreen
                  key={activeLessonTipsKey}
                  intro={activeLessonIntro}
                  depth={lessonIntroDepth}
                  loadingLesson={Boolean(structuredLessonLoadingId) || loading || !activeStructuredLesson}
                  provider={settings.provider}
                  openAiChatPreset={settings.openAiChatPreset}
                  audience={settings.audience}
                  onShowDetails={() => setLessonIntroDepth('details')}
                  onShowDeepDive={() => setLessonIntroDepth('deep')}
                  onStartLesson={() => {
                    if (!activeStructuredLesson) return
                    setLastStructuredLessonGlobalDelta(0)
                    bumpFooterSessionContext()
                    setLessonViewStage('lesson')
                  }}
                  onShowExtras={() => {
                    setLessonTipsReturnStage('intro')
                    setLessonViewStage('tips')
                  }}
                  onBack={backToLessonList}
                  footerVariantRegenerating={structuredLessonVariantRegenerating}
                  startLessonCtaFromMenuGenerate={startLessonCtaFromMenuGenerate}
                />
              ) : isLessonTipsActive && activeLessonIntro ? (
                <LessonExtraTipsScreen
                  lessonKey={activeLessonTipsKey}
                  intro={activeLessonIntro}
                  footerVariantRegenerating={structuredLessonVariantRegenerating}
                  startLessonCtaFromMenuGenerate={startLessonCtaFromMenuGenerate}
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
                  onStartLesson={() => {
                    if (!activeStructuredLesson) return
                    setLastStructuredLessonGlobalDelta(0)
                    bumpFooterSessionContext()
                    setLessonViewStage('lesson')
                  }}
                />
              ) : isStructuredLessonActive && activeStructuredLesson && activeStructuredLessonStep ? (
                <LessonStepRenderer
                  timeline={activeStructuredLessonTimeline}
                  status={activeStructuredLessonStatus}
                  blockProgress={activeStructuredLessonBlockProgress}
                  exerciseErrors={activeStructuredLessonExerciseErrors}
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
                  runBannerText={structuredLessonRunBannerText}
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
                />
              ) : (
                <Chat
                  appColumnAnchorRef={chatGlassRef}
                  messages={messages}
                  settings={settings}
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
                    assistantIndicatorText: engvoBootstrapServiceIndicatorText ?? 'Engvo отвечает...',
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
      <RewardPopup
        text={lessonReturnHintText ?? ''}
        visible={Boolean(lessonReturnHintText)}
        onDismiss={() => setLessonReturnHintText(null)}
      />

      {/* В чате — спейсер под fixed-футер; на главной отступ только у колонки контента. */}
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
            isLessonActive={isLessonActive}
            isDialogStarted={dialogStarted}
            showWhenIdle={!dialogStarted}
            lessonFooterLessonTitle={footerDisplayLessonTitle}
            lessonFooterSegments={footerDisplayLessonSegments}
          />
        </div>
        <div
          className="shrink-0 bg-[var(--app-header-bg)]"
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
        engvoRealtimeVoice={engvoRealtimeVoice}
        engvoCefrLevel={engvoCefrLevel}
        engvoSpeechSpeedPreset={engvoSpeechSpeedPreset}
        onEngvoVoiceChange={handleEngvoVoiceChange}
        onEngvoLevelChange={handleEngvoLevelChange}
        onEngvoSpeechSpeedChange={handleEngvoSpeechSpeedChange}
        onGoHome={goToStartScreen}
        onOpenLearningLesson={openOrContinueLearningLesson}
        onGenerateLearningLesson={openGeneratedLearningLesson}
        onDebugSkipToLessonFinale={handleDebugSkipToLessonFinale}
        onOpenPracticeSession={openPracticeSession}
        onGeneratePracticeSession={generatePracticeSession}
        onOpenAccentTrainer={openAccentTrainer}
        onOpenVocabularyWorlds={openVocabularyWorlds}
        onOpenVocabularyByLevel={openVocabularyByLevel}
        onOpenAdaptivePracticeTopic={openAdaptivePracticeTopic}
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

      {lessonOverlay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white/95 p-5 shadow-xl backdrop-blur-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-[var(--text)]">{lessonOverlay.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setLessonOverlay(null)
                  setPostLessonBusy(false)
                  setSelectedPostLessonAction(null)
                  setPostLessonMenuResetKey((current) => current + 1)
                }}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/70"
              >
                Закрыть
              </button>
            </div>
            <div className="space-y-2 text-sm leading-6 text-[var(--text)]">
              {lessonOverlay.lines.map((line, index) => (
                <p key={`${lessonOverlay.title}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

