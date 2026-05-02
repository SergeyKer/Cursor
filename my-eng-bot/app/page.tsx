'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useState } from 'react'
import type { AiChatPanel } from '@/lib/aiChatPanel'
import { getHomeMenuInstruction } from '@/lib/homeMenuInstruction'
import { featureFlags } from '@/lib/featureFlags'
import HomeWelcomeBubble from '@/components/HomeWelcomeBubble'
import { HomeMenuInstructionBubble } from '@/components/HomeMenuInstructionBubble'
import HomeEmptyBubble from '@/components/HomeEmptyBubble'
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
  saveFreeTalkTopicRotationState,
} from '@/lib/storage'
import { countDialogueFinalCorrectAnswers } from '@/lib/dialogueStats'
import { TOPICS, LEVELS, TENSES } from '@/lib/constants'
import { allowedTensesForAudience } from '@/lib/levelAllowedTenses'
import { detectCommunicationUserMessageLang, getExpectedCommunicationReplyLang } from '@/lib/communicationReplyLanguage'
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
import { saveLessonProgress } from '@/lib/lessonProgressStorage'
import {
  findStaticLessonByTopic,
  getLearningLessonActions,
  getLearningLessonById,
  getLearningLessonFollowupPlaceholder,
  registerRuntimeLearningLesson,
  type LearningLessonActionId,
} from '@/lib/learningLessons'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import { getPracticeLessonById, pickQuickStartPracticeTopic } from '@/lib/lessonCatalog'
import { buildFallbackLessonIntro } from '@/lib/lessonIntro'
import { buildTutorStructuredLesson } from '@/lib/tutorStructuredLesson'
import type { LessonBlueprint } from '@/lib/lessonBlueprint'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { LessonMenuContext } from '@/components/SlideOutMenu'
import type { LessonData, PostLessonAction } from '@/types/lesson'
import type {
  PracticeBuildConfig,
  PracticeEntrySource,
  PracticeMode,
  PracticeQuestion,
  PracticeSession,
  PracticeSource,
} from '@/types/practice'
import AppFooter from '@/components/AppFooter'
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
import { pickFooterVoice, type FooterVoiceCandidate } from '@/lib/footerVoice'
import { isIosChromeBrowser } from '@/lib/sttClient'

import MenuSectionPanels, { type LessonsPanel, type MenuView } from '@/components/MenuSectionPanels'

const Chat = dynamic(() => import('@/components/Chat'))
const SlideOutMenu = dynamic(() => import('@/components/SlideOutMenu'))
type StructuredLessonRuntimeMode = 'generate' | 'repeat'
type LessonRepeatFallbackReason = 'provider' | 'parse' | 'validation' | 'exception' | 'no_steps'
type PracticeOpenRequest = {
  lessonId?: string
  mode: PracticeMode
  entrySource: PracticeEntrySource
  customTopic?: string
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

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

/** Жирная стрелка Ru↔En в шапке: на мобильных Unicode → почти не видна. */
function CommunicationLangDirectionArrow() {
  return (
    <svg
      className="mx-px h-[11px] w-[11px] shrink-0 translate-y-px text-[var(--text)] sm:h-3 sm:w-3 sm:translate-y-[1.5px]"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

const API_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2500
/** При 429 OpenRouter даёт 20 запросов в минуту — пауза должна увести попытку в следующую минуту. */
const RETRY_DELAY_RATE_LIMIT_MS = 20_000
const RETRY_DELAY_RATE_LIMIT_BASE_MS = 5_000
const RETRY_MESSAGES = ['Пробую ещё раз…', 'Вот-вот, почти!']
const ERROR_FIRST_MESSAGE = 'Не удалось загрузить ответ. Проверьте сеть и настройки сервера.'
const EMPTY_RESPONSE_FALLBACK = 'ИИ не отвечает. Проверьте сеть и попробуйте снова.'

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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 50 })
  const [initialized, setInitialized] = useState(false)
  const [dialogStarted, setDialogStarted] = useState(false)
  const [homeMenuView, setHomeMenuView] = useState<MenuView>('root')
  const [homeAiChatPanel, setHomeAiChatPanel] = useState<AiChatPanel>('summary')
  const [homeAudienceChosen, setHomeAudienceChosen] = useState(false)
  /** На стартовом экране при выходе из чата домой сбрасывается в false. */
  const [welcomeCompact, setWelcomeCompact] = useState(false)
  /** Смена «сессии» старта: новый факт из очереди (в т.ч. после выхода из чата домой). */
  const [greetingNonce, setGreetingNonce] = useState(0)
  const [welcomeFactLine, setWelcomeFactLine] = useState<string | null>(null)
  const [homeVoiceLine, setHomeVoiceLine] = useState<string | null>(null)
  const welcomeFactInitRef = React.useRef<number | null>(null)
  const [storageLoaded, setStorageLoaded] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [loadingTranslationIndex, setLoadingTranslationIndex] = useState<number | null>(null)
  const [forceNextMicLang, setForceNextMicLang] = useState<'ru' | 'en' | null>(null)
  const [searchingInternet, setSearchingInternet] = useState(false)
  const [searchingInternetLang, setSearchingInternetLang] = useState<'ru' | 'en'>('ru')
  /** Увеличение сбрасывает поле ввода/голос (меню «Начать …»). */
  const [composerSessionKey, setComposerSessionKey] = useState(0)
  const [lessonMenuContext, setLessonMenuContext] = useState<LessonMenuContext | null>(null)
  const [activeLearningLessonId, setActiveLearningLessonId] = useState<string | null>(null)
  const [activeStructuredLessonRuntime, setActiveStructuredLessonRuntime] = useState<LessonData | null>(null)
  const [structuredLessonLoadingId, setStructuredLessonLoadingId] = useState<string | null>(null)
  const [pendingTutorLessonTitle, setPendingTutorLessonTitle] = useState<string | null>(null)
  const [activeLessonVariantNumber, setActiveLessonVariantNumber] = useState(1)
  /** Если у урока нет runKey, порядок вариантов fill_choice зависит от nonce на каждый новый вход. */
  const [structuredLessonShuffleNonce, setStructuredLessonShuffleNonce] = useState(0)
  const [postLessonBusy, setPostLessonBusy] = useState(false)
  const [selectedPostLessonAction, setSelectedPostLessonAction] = useState<PostLessonAction | null>(null)
  const [lessonOverlay, setLessonOverlay] = useState<LessonOverlayState | null>(null)
  const [lessonViewStage, setLessonViewStage] = useState<'intro' | 'tips' | 'lesson'>('intro')
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
    blockProgress: activeStructuredLessonBlockProgress,
    footerDynamicText: activeStructuredLessonFooterDynamicText,
    footerStaticText: activeStructuredLessonFooterStaticText,
    footerVariantProgress: activeStructuredLessonFooterVariantProgress,
    footerTypingKey: activeStructuredLessonFooterTypingKey,
    footerVoiceTone: activeStructuredLessonFooterVoiceTone,
    footerVoiceEmphasis: activeStructuredLessonFooterVoiceEmphasis,
    handleAnswer: handleStructuredLessonAnswer,
    completeCurrentStep: completeStructuredLessonStep,
    xp: activeStructuredLessonXp,
    combo: activeStructuredLessonCombo,
    exerciseErrors: activeStructuredLessonExerciseErrors,
    mistakes: activeStructuredLessonMistakes,
    completedSteps: activeStructuredLessonCompletedSteps,
  } = useLessonEngine(activeStructuredLesson)
  const practiceSession = usePracticeSession()
  const { abandonSession: abandonPracticeSession, startSession: startPracticeSession } = practiceSession
  const [accentTrainerActive, setAccentTrainerActive] = useState(false)
  const [accentFooterView, setAccentFooterView] = useState<AccentFooterView | null>(null)
  const structuredLessonChoiceShuffleSeed =
    activeStructuredLesson == null
      ? undefined
      : (activeStructuredLesson.runKey ??
          `static-${activeStructuredLesson.id}-${activeStructuredLesson.variantId ?? ''}-${structuredLessonShuffleNonce}`)
  const dialogueCorrectAnswers = React.useMemo(() => countDialogueFinalCorrectAnswers(messages), [messages])
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
  /** Настройки при открытии меню: режим + поля для сравнения при закрытии (без уровня). */
  const menuOpenSnapshotRef = React.useRef<MenuOpenSnapshot | null>(null)
  const prevMenuOpenForSnapshotRef = React.useRef(false)
  /** Не показывать баннер «настройки изменены» сразу после автоперезапуска из меню (до синхронизации с отправкой). */
  const suppressSettingsChangeBannerRef = React.useRef(false)
  const structuredLessonVariantHistoryRef = React.useRef<Record<string, string[]>>({})
  const prefetchedStructuredLessonRuntimeRef = React.useRef<Record<string, LessonData | null>>({})
  const structuredLessonRuntimeInFlightRef = React.useRef<Record<string, Promise<LessonData | null>>>({})
  const lessonOpenRequestIdRef = React.useRef(0)
  /** iPhone / iPad / iPod и iPadOS с десктопным UA (Macintosh + Mobile). */
  const isIosClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) return true
    return /Macintosh/i.test(ua) && /Mobile/i.test(ua)
  }, [])
  /** Только iOS Safari: исключаем iOS Chrome/Edge/Firefox/Opera, чтобы правка не влияла на другие браузеры. */
  const isIosSafariClient = React.useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))
    if (!isIosDevice) return false
    if (isIosChromeBrowser(ua)) return false
    if (/FxiOS\/\d+/i.test(ua)) return false
    if (/EdgiOS\/\d+/i.test(ua)) return false
    if (/OPiOS\/\d+/i.test(ua)) return false
    return /Safari\/\d+/i.test(ua)
  }, [])

  function normalizeSettingsForAudience(s: Settings): Settings {
    const normalizedLevel: Settings['level'] = s.level === 'starter' ? 'a1' : s.level
    const normalizedTopic = s.topic

    if (s.audience !== 'child') {
      return {
        ...s,
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
    if (dialogStarted) return
    if (welcomeFactInitRef.current === greetingNonce) return
    welcomeFactInitRef.current = greetingNonce

    try {
      setWelcomeFactLine(consumeNextGreetingFactLine())
    } catch {
      setWelcomeFactLine('Интересный факт скоро появится.')
    }

    try {
      setHomeVoiceLine(consumeNextHomeVoiceLine())
    } catch {
      setHomeVoiceLine('Я снова здесь. Продолжим?')
    }
  }, [dialogStarted, greetingNonce])

  const handleHomeMenuViewChange = useCallback(
    (v: MenuView) => {
      if (v === 'root' && homeMenuView !== 'root' && !dialogStarted) {
        setWelcomeCompact(false)
        setGreetingNonce((n) => n + 1)
      }
      setHomeMenuView(v)
    },
    [homeMenuView, dialogStarted]
  )

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

  function getCommunicationInputExpectedFromText(text: string, current: Settings['communicationInputExpectedLang']) {
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
    [settings]
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

  const resetStructuredLessonSession = useCallback(() => {
    lessonOpenRequestIdRef.current += 1
    abandonPracticeSession()
    setAccentTrainerActive(false)
    setAccentFooterView(null)
    setLessonMenuContext(null)
    setActiveLearningLessonId(null)
    setActiveStructuredLessonRuntime(null)
    setStructuredLessonLoadingId(null)
    setPendingTutorLessonTitle(null)
    setActiveLessonVariantNumber(1)
    setSelectedPostLessonAction(null)
    setPostLessonBusy(false)
    setLessonOverlay(null)
    setLessonViewStage('intro')
    setLessonIntroDepth('quick')
    setLessonExtraTipsStatus('idle')
    setLessonExtraTipsState(null)
  }, [abandonPracticeSession])

  const restartChatForNewModeFromMenu = useCallback(() => {
    suppressSettingsChangeBannerRef.current = true
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
  }, [ensureFirstMessage, resetStructuredLessonSession])

  const handleStartChatFromMenu = useCallback(() => {
    setComposerSessionKey((k) => k + 1)
    if (!dialogStarted) {
      resetStructuredLessonSession()
      setDialogStarted(true)
      setMenuOpen(false)
      return
    }
    resetStructuredLessonSession()
    restartChatForNewModeFromMenu()
    setMenuOpen(false)
  }, [dialogStarted, restartChatForNewModeFromMenu, resetStructuredLessonSession])

  const handleStartChatFromHome = useCallback(() => {
    setComposerSessionKey((k) => k + 1)
    resetStructuredLessonSession()
    setDialogStarted(true)
  }, [resetStructuredLessonSession])

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
      saveLessonProgress({
        lessonId: activeStructuredLesson.id,
        topic: activeStructuredLesson.topic,
        level: activeStructuredLesson.level,
        completedSteps: activeStructuredLessonCompletedSteps,
        completedVariants: buildCompletedVariants(activeStructuredLessonStatus, activeLessonVariantNumber),
        xp: activeStructuredLessonXp,
        combo: activeStructuredLessonCombo,
        mistakes: activeStructuredLessonMistakes,
        lastCompleted:
          overrides?.lastCompleted ?? (activeStructuredLessonStatus === 'completed' ? new Date().toISOString() : ''),
        ...(overrides?.postLessonChoice ? { postLessonChoice: overrides.postLessonChoice } : {}),
      })
    },
    [
      activeStructuredLesson,
      activeStructuredLessonCompletedSteps,
      activeStructuredLessonStatus,
      activeLessonVariantNumber,
      activeStructuredLessonXp,
      activeStructuredLessonCombo,
      activeStructuredLessonMistakes,
      buildCompletedVariants,
      lessonViewStage,
    ]
  )

  const openLearningLesson = useCallback(
    async (lessonId: string, lessonsPanel: LessonsPanel = 'a2') => {
      const lesson = getLearningLessonById(lessonId)
      if (!lesson) return
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
      setPendingTutorLessonTitle(null)
      setActiveLessonVariantNumber(1)
      setSelectedPostLessonAction(null)
      setPostLessonBusy(false)
      setLessonOverlay(null)
      setLessonViewStage('intro')
      setLessonIntroDepth('quick')
      setLessonExtraTipsStatus('idle')
      setLessonExtraTipsState(null)
      setLessonMenuContext({ menuView: 'lessons', lessonsPanel })
      setActiveLearningLessonId(lessonId)
      setMessages(structuredLesson ? [] : [{ role: 'assistant', content: lesson.theoryIntro }])

      if (structuredLesson) {
        setStructuredLessonShuffleNonce((n) => n + 1)
        if (requestId !== lessonOpenRequestIdRef.current) return
        setMessages([])
        setActiveStructuredLessonRuntime(cloneStructuredLessonWithRunKey(structuredLesson))
      }
    },
    [abandonPracticeSession]
  )

  const openGeneratedLearningLesson = useCallback(
    async (lessonId: string, lessonsPanel: LessonsPanel = 'a2') => {
      const baseLesson = getLearningLessonById(lessonId)
      const structuredLesson = getStructuredLessonById(lessonId)
      if (!baseLesson || !structuredLesson) {
        throw new Error('Для выбранного урока пока нет алгоритма генерации.')
      }

      const requestId = ++lessonOpenRequestIdRef.current
      const fetchStartedAt = Date.now()
      setStructuredLessonLoadingId(lessonId)
      setLoading(true)
      setRetryMessage(null)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS)

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
          throw new Error(data.error ?? 'Не удалось сгенерировать урок через LLM.')
        }
        if (!data.generated || data.fallback || !data.lesson) {
          console.warn('lesson-repeat returned fallback for menu generation:', {
            lessonId,
            generated: data.generated,
            fallback: data.fallback,
            fallbackReason: data.fallbackReason,
          })
          throw new Error(getMenuGenerationFallbackMessage(data.fallbackReason))
        }
        if (requestId !== lessonOpenRequestIdRef.current) return

        abandonPracticeSession()

        if (data.lesson.variantId) {
          const history = structuredLessonVariantHistoryRef.current[lessonId] ?? []
          structuredLessonVariantHistoryRef.current[lessonId] = appendLessonVariantHistory(history, data.lesson.variantId)
        }

        firstMessageRequestIdRef.current += 1
        firstMessageInFlightRef.current = false
        suppressSettingsChangeBannerRef.current = true
        setDialogStarted(true)
        setMenuOpen(false)
        setHomeMenuView('lessons')
        setRetryMessage(null)
        setSearchingInternet(false)
        setLoadingTranslationIndex(null)
        setForceNextMicLang(null)
        setSettingsAtLastSend(null)
        setActiveLearningLessonId(lessonId)
        setActiveStructuredLessonRuntime(data.lesson)
        setActiveLessonVariantNumber(1)
        setSelectedPostLessonAction(null)
        setPostLessonBusy(false)
        setLessonOverlay(null)
        setLessonViewStage('intro')
        setLessonIntroDepth('quick')
        setLessonExtraTipsStatus('idle')
        setLessonExtraTipsState(null)
        setLessonMenuContext({ menuView: 'lessons', lessonsPanel })
        setMessages([])
        console.info(`[lesson-ui] mode=menu-generate lesson=${lessonId} source=llm fetch_ms=${Date.now() - fetchStartedAt}`)
      } catch (error) {
        console.warn('menu lesson generation failed:', error)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Генерация заняла слишком много времени. Попробуйте ещё раз.')
        }
        throw error
      } finally {
        clearTimeout(timeoutId)
        if (requestId === lessonOpenRequestIdRef.current) {
          setStructuredLessonLoadingId(null)
          setLoading(false)
        }
      }
    },
    [abandonPracticeSession, settings.provider, settings.openAiChatPreset, settings.audience]
  )

  const openTutorLesson = useCallback(
    async (request: {
      requestedTopic: string
      originalQuery?: string
      selectedIntent?: TutorLearningIntent
      analysisSummary?: string
    }) => {
      const topic = request.requestedTopic.trim()
      if (!topic) return

      const staticLesson = findStaticLessonByTopic(topic)
      if (staticLesson) {
        openLearningLesson(staticLesson.id, 'tutor')
        return
      }

      const requestId = ++lessonOpenRequestIdRef.current
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
      setPendingTutorLessonTitle(request.selectedIntent?.title ?? topic)
      setActiveLessonVariantNumber(1)
      setSelectedPostLessonAction(null)
      setPostLessonBusy(false)
      setLessonOverlay(null)
      setLessonViewStage('intro')
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
    [abandonPracticeSession, openLearningLesson, settings.provider, settings.openAiChatPreset, settings.level, settings.audience]
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
      const customTopic = request.customTopic?.trim()
      let resolvedLessonId = request.lessonId ?? null
      let lesson: LessonData | null = null
      let source: PracticeSource | null = null

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

      resolvedLessonId = resolvedLessonId ?? pickQuickStartPracticeTopic('A2')?.id ?? null
      if (!lesson && resolvedLessonId) {
        lesson = getPracticeLessonById(resolvedLessonId)
        source = { kind: 'static_lesson', lessonId: resolvedLessonId }
      }

      if (!lesson) {
        throw new Error('Для этой темы пока нет практики.')
      }

      let questions: PracticeQuestion[] | undefined
      if (generationSource === 'ai_generated') {
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
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (!response.ok) {
          throw new Error(data.error ?? 'Не удалось сгенерировать практику.')
        }
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          questions = data.questions
        }
      }

      return {
        source: source ?? { kind: 'static_lesson', lessonId: lesson.id },
        lesson,
        mode: request.mode,
        entrySource: request.entrySource,
        generationSource,
        questions,
      }
    },
    [settings.audience, settings.level, settings.openAiChatPreset, settings.provider]
  )

  const openPracticeSession = useCallback(
    async (request: PracticeOpenRequest) => {
      const config = await resolvePracticeRequest(request, 'local')
      startPracticeFromLesson(config)
    },
    [resolvePracticeRequest, startPracticeFromLesson]
  )

  const openAccentTrainer = useCallback(() => {
    resetStructuredLessonSession()
    setAccentTrainerActive(true)
    setDialogStarted(true)
    setMenuOpen(false)
    setHomeMenuView('lessons')
    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'summary' })
  }, [resetStructuredLessonSession])

  const generatePracticeSession = useCallback(
    async (request: PracticeOpenRequest) => {
      const config = await resolvePracticeRequest(request, 'ai_generated')
      startPracticeFromLesson(config)
    },
    [resolvePracticeRequest, startPracticeFromLesson]
  )

  const restartPracticeFromExistingSession = useCallback(
    async (session: PracticeSession, mode: PracticeMode, generationSource: PracticeBuildConfig['generationSource']) => {
      if (session.source.kind === 'static_lesson') {
        const request = { lessonId: session.source.lessonId, mode, entrySource: 'menu' as const }
        if (generationSource === 'ai_generated') {
          await generatePracticeSession(request)
        } else {
          await openPracticeSession(request)
        }
        return
      }

      let questions: PracticeQuestion[] | undefined
      const lesson = session.source.lesson
      if (generationSource === 'ai_generated') {
        const response = await fetch('/api/practice-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: settings.provider,
            openAiChatPreset: settings.openAiChatPreset,
            audience: settings.audience,
            lesson,
            mode,
          }),
        })
        const data = (await response.json()) as PracticeGenerateResponse
        if (response.ok && Array.isArray(data.questions) && data.questions.length > 0) {
          questions = data.questions
        }
      }

      startPracticeFromLesson({
        source: session.source,
        lesson,
        mode,
        entrySource: 'menu',
        generationSource,
        questions,
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
      setPostLessonBusy(true)

      if (action === 'learn_interesting') {
        setLessonOverlay({
          title: 'Интересный факт',
          lines: [
            activeStructuredLessonStep.postLesson.interestingFact ??
              'Для этой темы интересный факт появится следующим этапом.',
          ],
        })
        setPostLessonBusy(false)
        return
      }

      if (action === 'repeat_variant') {
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
        return
      }

      if (action === 'independent_practice') {
        if (!featureFlags.practiceEngineV1) {
          const nextMode: Settings['mode'] = 'translation'
          setLessonOverlay(null)
          setSettings((prev) => ({
            ...prev,
            mode: nextMode,
          }))
          setTimeout(() => {
            restartChatForNewModeFromMenu()
          }, 0)
          return
        }
        const source: PracticeSource =
          lessonMenuContext?.lessonsPanel === 'tutor' || !getStructuredLessonById(activeStructuredLesson.id)
            ? {
                kind: 'runtime_lesson',
                lesson: activeStructuredLesson,
                origin: 'tutor',
                tutorIntent: activeStructuredLesson.tutorIntent,
              }
            : { kind: 'static_lesson', lessonId: activeStructuredLesson.id }
        startPracticeFromLesson({
          source,
          lesson: activeStructuredLesson,
          mode: 'relaxed',
          entrySource: lessonMenuContext?.lessonsPanel === 'tutor' ? 'tutor_after_lesson' : 'after_lesson',
          generationSource: 'local',
        })
        setPostLessonBusy(false)
        return
      }

      const nextMode: Settings['mode'] = 'communication'
      setLessonOverlay(null)
      setSettings((prev) => ({
        ...prev,
        mode: nextMode,
      }))
      setTimeout(() => {
        restartChatForNewModeFromMenu()
      }, 0)
    },
    [
      activeStructuredLesson,
      activeStructuredLessonStep,
      fetchStructuredLessonRuntime,
      lessonMenuContext?.lessonsPanel,
      restartChatForNewModeFromMenu,
      startPracticeFromLesson,
    ]
  )

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

  useEffect(() => {
    if (!selectedPostLessonAction) return
    persistActiveStructuredLessonProgress({ postLessonChoice: selectedPostLessonAction })
  }, [selectedPostLessonAction, persistActiveStructuredLessonProgress])

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
    if (snap === null) return
    if (snap.mode !== settings.mode) {
      restartChatForNewModeFromMenu()
      return
    }
    if (menuSettingsRestartNeeded(snap, settings)) {
      restartChatForNewModeFromMenu()
    }
  }, [menuOpen, dialogStarted, settings, restartChatForNewModeFromMenu])

  const goToStartScreen = useCallback(() => {
    firstMessageRequestIdRef.current += 1
    firstMessageInFlightRef.current = false
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
    resetStructuredLessonSession()
    dialogSeedRef.current = createDialogSeed()
    newDialogRef.current = false
    setWelcomeCompact(false)
    setGreetingNonce((n) => n + 1)
    saveState([], settings)
  }, [resetStructuredLessonSession, settings])

  const backToLessonList = useCallback(() => {
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
    resetStructuredLessonSession()
  }, [resetStructuredLessonSession])

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

  useEffect(() => {
    const state = loadState()
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      setMessages([])
      setSettings(normalizeSettingsForAudience(state.settings))
      setDialogStarted(false)
    }
    setInitialized(true)
    setStorageLoaded(true)
  }, [])

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
    if (!storageLoaded) return
    if (newDialogRef.current) return
    if (loading) return
    if (activeStructuredLesson) return
    if (initialized && dialogStarted && messages.length === 0) ensureFirstMessage()
  }, [storageLoaded, initialized, dialogStarted, messages.length, loading, ensureFirstMessage, activeStructuredLesson])

  useEffect(() => {
    if (!storageLoaded) return
    if (messages.length === 0 && !dialogStarted) return
    saveState(messages, settings)
  }, [storageLoaded, messages, settings, dialogStarted])

  const handleSend = useCallback(
    async (text: string) => {
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
      if (settings.mode === 'communication') {
        setSettings((prev) => ({
          ...prev,
          communicationInputExpectedLang: getCommunicationInputExpectedFromText(text, prev.communicationInputExpectedLang),
        }))
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
          inputPreference: settings.communicationInputExpectedLang,
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
    [messages, atLimit, sendToApi, fetchUsage, settings, ensureFirstMessage]
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

  const handleRequestTranslation = useCallback(async (index: number, text: string) => {
    if (!text.trim()) return
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
      const resolvedIndex = findAssistantIndexByTranslationText(prev, index, text)
      setLoadingTranslationIndex(resolvedIndex)
      const next = [...prev]
      if (next[resolvedIndex]?.role === 'assistant') {
        next[resolvedIndex] = { ...next[resolvedIndex], translation: undefined, translationError: undefined }
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

    const providerOrder: TranslateProvider[] =
      settings.provider === 'openai' ? ['openai', 'openrouter'] : ['openrouter', 'openai']

    const requestTranslateOnce = async (provider: TranslateProvider): Promise<AttemptResult> => {
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
    let attemptedFallback = false
    let allowProviderFallback = true
    for (let pIdx = 0; pIdx < providerOrder.length && !translated; pIdx++) {
      const provider = providerOrder[pIdx]
      const maxAttemptsForProvider = provider === 'openrouter' ? MAX_ATTEMPTS : 1

      for (let attempt = 0; attempt < maxAttemptsForProvider; attempt++) {
        const result = await requestTranslateOnce(provider)
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
          allowProviderFallback = false
          break
        }

        const canRetryThisProvider =
          attempt < maxAttemptsForProvider - 1 && (isRateLimit || isNetworkLike || isRetryableTranslationError(lastError))
        if (!canRetryThisProvider) break

        await sleep(150)
        const backoffMs = isRateLimit ? RETRY_DELAY_RATE_LIMIT_MS : RETRY_DELAY_MS
        await sleep(backoffMs)
      }

      if (!translated && !allowProviderFallback) break
      if (!translated && pIdx < providerOrder.length - 1) {
        attemptedFallback = true
      }
    }

    if (attemptedFallback && !translated && !/Попробуйте снова|Проверьте/i.test(lastError)) {
      lastError = `${lastError} Попробуйте другого провайдера в меню.`
    }

    if (!translated) {
      setLoadingTranslationIndex(null)
      setResult(undefined, lastError)
    }
  }, [settings.provider, settings.openAiChatPreset, settings.audience, settings.mode, settings.tenses])

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
        return settings.communicationInputExpectedLang === 'en' ? 'Chat с MyEng' : 'Чат с MyEng'
      }
      const levelEntry = LEVELS.find((l) => l.id === settings.level)
      const levelShort = levelEntry ? (levelEntry.label.split(' - ')[0]?.trim() ?? levelEntry.label) : settings.level
      const lang = getExpectedCommunicationReplyLang(messages, {
        inputPreference: settings.communicationInputExpectedLang,
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
  const isPracticeActive = Boolean(practiceSession.session)
  const isAccentActive = accentTrainerActive
  const activeLessonIntro =
    activeStructuredLesson?.intro ??
    activeLearningLesson?.intro ??
    (activeLearningLessonId ? getStructuredLessonById(activeLearningLessonId)?.intro ?? null : null)
  const activeTutorIntent = activeStructuredLesson?.tutorIntent ?? activeLearningLesson?.tutorIntent ?? null
  const isTutorLessonPending = structuredLessonLoadingId === 'tutor' && Boolean(pendingTutorLessonTitle)
  const isLessonIntroActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'intro')
  const isLessonTipsActive = Boolean(activeLessonIntro && activeLearningLesson && lessonViewStage === 'tips')
  const isStructuredLessonActive = Boolean(activeStructuredLesson && activeStructuredLessonStep && lessonViewStage === 'lesson')
  const activeLessonTitle = activeLearningLesson?.title ?? null
  const activeLessonTipsKey = activeLearningLessonId
    ? `${activeLearningLessonId}:${activeStructuredLesson?.runKey ?? activeStructuredLesson?.variantId ?? activeLessonVariantNumber}`
    : 'lesson'
  const isTutorLessonHeader = activeLessonTitle && lessonMenuContext?.lessonsPanel === 'tutor'
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
    ? getPracticeFooterView(practiceSession.session, practiceSession.state === 'active' ? 'idle' : practiceSession.state)
    : null
  const chatFooterVoice = React.useMemo(() => {
    if (!dialogStarted || isLessonActive) return null
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
            key: `chat-communication-${settings.communicationInputExpectedLang}`,
            priority: 40,
            text:
              settings.communicationInputExpectedLang === 'en'
                ? 'Можно говорить по-английски.'
                : 'Можно говорить как удобно.',
            compactText: settings.communicationInputExpectedLang === 'en' ? 'Говорим по-английски.' : 'Слушаю вас.',
            tone: 'neutral',
          }
        : null,
    ]
    return pickFooterVoice(
      candidates.filter((candidate): candidate is FooterVoiceCandidate => candidate !== null),
      { maxLength: 46 }
    )
  }, [
    dialogStarted,
    isLessonActive,
    lastMessageIsError,
    loading,
    loadingTranslationIndex,
    retryMessage,
    searchingInternet,
    settings.communicationInputExpectedLang,
    settings.mode,
  ])
  const homeFooterVoice = React.useMemo(() => {
    if (dialogStarted) return null
    const candidates: Array<FooterVoiceCandidate | null> = [
      homeVoiceLine
        ? {
            key: `home-${greetingNonce}`,
            priority: 100,
            text: homeVoiceLine,
            compactText: homeVoiceLine,
            tone: 'neutral',
          }
        : null,
    ]
    return pickFooterVoice(
      candidates.filter((candidate): candidate is FooterVoiceCandidate => candidate !== null),
      { maxLength: 46 }
    )
  }, [dialogStarted, greetingNonce, homeVoiceLine])
  const introFooterDynamicText = lessonMenuContext?.lessonsPanel === 'tutor'
    ? 'MyEng собрал тему. Сначала быстро поймём смысл.'
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
      : lessonExtraTipsStatus === 'loading'
        ? 'Добавляю свежие примеры без повторов.'
        : lessonExtraTipsStatus === 'fallback'
          ? 'Показываю базовые фишки, AI догружается.'
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
  const footerDynamicText = isAccentActive
    ? accentFooterView?.dynamicText ?? null
    : isPracticeActive
    ? practiceFooterView?.dynamicText ?? null
    : isLessonIntroActive
      ? introFooterDynamicText
      : isLessonTipsActive
      ? tipsFooterDynamicText
      : isStructuredLessonActive
      ? activeStructuredLessonFooterDynamicText
      : isLessonActive
      ? learningLessonFooterDynamicText
      : dialogStarted
        ? chatFooterVoice?.text ?? null
        : homeFooterVoice?.text ?? null
  const footerStaticText = isAccentActive
    ? accentFooterView?.staticText ?? 'Произношение'
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
        ? getMenuSummary(false)
        : 'Главная'
  const footerTypingKey = isAccentActive
    ? accentFooterView?.typingKey ?? 'accent-footer'
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
      : homeFooterVoice?.typingKey ?? 'home-footer'
  const footerVoiceTone = isAccentActive
    ? accentFooterView?.tone ?? 'neutral'
    : isPracticeActive
    ? practiceSession.state === 'correction'
      ? 'hint'
      : practiceSession.state === 'completed'
        ? 'support'
        : 'neutral'
    : isLessonIntroActive
      ? 'neutral'
      : isLessonTipsActive
      ? lessonExtraTipsStatus === 'loading' || lessonExtraTipsStatus === 'more-loading'
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
      : (homeFooterVoice?.tone ?? 'neutral')
  const footerVoiceEmphasis = isAccentActive
    ? accentFooterView?.emphasis ?? 'none'
    : isPracticeActive
    ? practiceSession.state === 'completed'
      ? 'pulse'
      : 'none'
    : isLessonIntroActive
      ? 'none'
      : isLessonTipsActive
      ? lessonExtraTipsStatus === 'loading' ||
        lessonExtraTipsStatus === 'more-loading' ||
        lessonExtraTipsStatus === 'quiz-correct' ||
        lessonExtraTipsStatus === 'more-ready'
        ? 'pulse'
        : 'none'
      : isStructuredLessonActive
      ? activeStructuredLessonFooterVoiceEmphasis
      : dialogStarted
      ? (chatFooterVoice?.emphasis ?? 'none')
      : (homeFooterVoice?.emphasis ?? 'none')
  const pageTitle = !dialogStarted
    ? 'MyEng - мой английский друг'
    : isPracticeActive
      ? 'Практика MyEng'
    : isTutorLessonHeader
      ? 'Репетитор с MyEng'
      : activeLessonTitle
      ? `Урок: ${activeLessonTitle}`
      : storageLoaded
        ? getMenuSummary(true)
        : 'MyEng'
  /** Совпадает с фактической высотой шапки: safe-area + строка меню + нижний border (см. `header` без minHeight на внешнем блоке). */
  const appTopOffset =
    'calc(var(--app-safe-top-inset) + var(--app-header-row-height) + var(--app-header-border-width))'
  const appBottomInset = isIosClient
    ? 'max(env(safe-area-inset-bottom, 0px), var(--vv-bottom-inset))'
    : 'env(safe-area-inset-bottom, 0px)'
  const appLayoutVars = {
    '--app-safe-top-inset': 'env(safe-area-inset-top, 0px)',
    '--app-header-row-height': '2.75rem',
    '--app-header-border-width': '1px',
    '--app-footer-row-height': '5.25rem',
    '--app-bottom-inset': appBottomInset,
    '--app-bottom-offset': 'calc(var(--app-footer-row-height) + var(--app-bottom-inset))',
    '--app-top-offset': appTopOffset,
  } as React.CSSProperties

  const rootShellClass =
    'flex min-h-[100dvh] flex-col ' + (isIosClient ? 'h-full' : 'h-[100dvh]')

  return (
    <div data-audience={settings.audience} className={rootShellClass} style={appLayoutVars}>
      <header
        className="app-header-surface fixed left-0 right-0 top-0 z-[60] border-b border-[var(--app-header-border)]"
        style={{
          paddingTop: 'var(--app-safe-top-inset)',
        }}
      >
        <div className="chat-shell-x flex w-full min-h-[var(--app-header-row-height)] items-center">
          <div
            className={`mx-auto flex w-full items-center justify-between ${
              dialogStarted ? 'max-w-[29rem]' : 'max-w-[23.2rem]'
            }`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="app-header-control chat-action-button flex h-10 w-10 min-h-[36px] min-w-[36px] shrink-0 items-center justify-center border text-[var(--app-header-text)] touch-manipulation"
              style={{ borderRadius: 'var(--app-header-control-radius)' }}
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              title={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              <MenuIcon />
            </button>
            <div className="pointer-events-auto flex h-10 min-h-[36px] shrink-0 items-center justify-end gap-1.5">
              {dialogStarted && settings.mode === 'communication' && !isLessonActive && (
                <button
                  type="button"
                  onClick={() =>
                    setSettings((s) => {
                      const nextLang = s.communicationInputExpectedLang === 'ru' ? 'en' : 'ru'
                      setForceNextMicLang(nextLang)
                      return {
                        ...s,
                        communicationInputExpectedLang: nextLang,
                      }
                    })
                  }
                  className="app-header-control chat-action-button flex h-10 min-h-[36px] min-w-[3.25rem] shrink-0 items-center justify-center gap-px border px-1.5 text-[11px] font-semibold leading-none text-[var(--app-header-text)] touch-manipulation sm:min-w-[3.5rem]"
                  style={{ borderRadius: 'var(--app-header-control-radius)' }}
                  aria-label={
                    settings.communicationInputExpectedLang === 'ru'
                      ? 'Ожидается русский ввод. Переключить на английский'
                      : 'Ожидается английский ввод. Переключить на русский'
                  }
                  title={
                    settings.communicationInputExpectedLang === 'ru'
                      ? 'Сейчас ожидается русский ввод. Нажмите для ожидания английского'
                      : 'Сейчас ожидается английский ввод. Нажмите для ожидания русского'
                  }
                >
                  {settings.communicationInputExpectedLang === 'ru' ? (
                    <span className="inline-flex items-center">
                      <span>Ru</span>
                      <CommunicationLangDirectionArrow />
                      <span>En</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <span>En</span>
                      <CommunicationLangDirectionArrow />
                      <span>Ru</span>
                    </span>
                  )}
                </button>
              )}
              {dialogStarted && (
                <span className="app-header-avatar mr-2 flex h-10 w-10 shrink-0 items-center justify-center p-1" aria-hidden>
                  <Image
                    src="/header-robot.png"
                    alt=""
                    width={1024}
                    height={1024}
                    className="h-full w-full object-contain"
                    sizes="36px"
                  />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14 sm:px-[4.25rem]">
          <h1
            className="text-[16px] font-semibold tracking-normal leading-[1.32] text-[var(--app-header-text)] truncate max-w-full"
            style={{ fontFamily: 'var(--app-header-font-family)' }}
            title={pageTitle}
          >
            {!dialogStarted || !storageLoaded || activeLessonTitle ? (
              pageTitle
            ) : (
              <>
                <span className="hidden sm:inline">{getMenuSummary(true)}</span>
                <span className="sm:hidden">{getMenuSummary(false)}</span>
              </>
            )}
          </h1>
        </div>
      </header>

      <main
        className={`flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)] ${
          dialogStarted ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
        style={{
          paddingTop: 'var(--app-top-offset)',
          ...(isIosSafariClient && !dialogStarted
            ? { scrollPaddingTop: 'var(--app-top-offset)' }
            : {}),
          paddingBottom: dialogStarted
            // iOS: иногда появляется серый зазор снизу, если safe-area не учтён на уровне контейнера.
            // Контент чата тоже учитывает safe-area, но внешний контейнер при dialogStarted=true держим с paddingBottom.
            ? '0px'
            : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {!dialogStarted ? (
          <div
            className="start-screen chat-shell-x flex min-h-0 flex-1 flex-col items-center bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]"
            style={{
              // Для экрана меню держим одинаковый (и чуть более компактный) верхний и межблочный шаг.
              gap: homeMenuView === 'root' ? 'clamp(1rem, 2.5vh, 1.75rem)' : 'clamp(0.5rem, 1.5vh, 0.9rem)',
              paddingTop:
                homeMenuView === 'root' ? 'clamp(1rem, 2.5vh, 1.75rem)' : 'clamp(0.5rem, 1.5vh, 0.9rem)',
              paddingBottom: 'clamp(1rem, 2.5vh, 1.75rem)',
            }}
          >
            {homeMenuView === 'root' && (
              <div className="flex w-full max-w-[23.2rem] shrink-0 justify-center">
                <div className="w-1/4">
                  <Image
                    src="/robot-no-background.png"
                    alt="MyEng logo"
                    width={512}
                    height={512}
                    className="block h-auto w-full object-contain"
                    sizes="(max-width: 640px) 25vw, 6rem"
                    priority
                  />
                </div>
              </div>
            )}
            {homeMenuView === 'root' && (
              <div className="flex w-full max-w-[23.2rem] flex-col items-center gap-[clamp(1rem,3.2vh,2rem)]">
                <HomeWelcomeBubble text={buildCompactGreeting()} />
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
                            Начать Чат с MyEng
                          </button>
                        </div>
                        <div className="flex w-full items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setHomeMenuView('lessons')}
                            className={`${PAGE_HOME_START_PRIMARY_BUTTON_CLASS} shrink-0`}
                          >
                            Начать делать Уроки
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {!welcomeCompact && welcomeFactLine && (
                  <HomeEmptyBubble text={welcomeFactLine} />
                )}
              </div>
            )}
            {homeMenuView !== 'root' && (
              <>
                <div className="flex w-full max-w-[23.2rem] shrink-0 flex-row items-center gap-2.5 sm:gap-3">
                  <div className="w-[22%] max-w-[5.5rem] shrink-0">
                    <Image
                      src="/robot-no-background.png"
                      alt="MyEng logo"
                      width={512}
                      height={512}
                      className="block h-auto w-full object-contain"
                      sizes="(max-width: 640px) 25vw, 6rem"
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
                <div className="flex w-full max-w-[23.2rem] shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--home-menu-bg)] px-3 py-3 shadow-sm">
                  <MenuSectionPanels
                    menuView={homeMenuView}
                    onMenuViewChange={handleHomeMenuViewChange}
                    settings={settings}
                    onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
                    usage={usage}
                    dialogueCorrectAnswers={dialogueCorrectAnswers}
                    idPrefix="home-"
                    className="flex min-h-0 flex-col"
                    homeLayout
                    onStartHomeChat={handleStartChatFromHome}
                    onGoHome={goToStartScreen}
                    onAiChatPanelChange={setHomeAiChatPanel}
                    onOpenLearningLesson={openLearningLesson}
                    onGenerateLearningLesson={openGeneratedLearningLesson}
                    onOpenPracticeSession={openPracticeSession}
                    onGeneratePracticeSession={generatePracticeSession}
                    onOpenAccentTrainer={openAccentTrainer}
                    onOpenTutorLesson={openTutorLesson}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {!isStructuredLessonActive &&
              !isLessonTipsActive &&
              dialogStarted &&
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
            <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)]">
              {isAccentActive ? (
                <AccentTrainer
                  audience={settings.audience}
                  onClose={goToStartScreen}
                  onFooterViewChange={setAccentFooterView}
                />
              ) : isPracticeActive && practiceSession.session ? (
                <PracticeScreen
                  session={practiceSession.session}
                  state={practiceSession.state}
                  currentQuestion={practiceSession.currentQuestion}
                  canSubmit={practiceSession.canSubmit}
                  onSubmitAnswer={practiceSession.submitAnswer}
                  onNextQuestion={practiceSession.nextQuestion}
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
                    practiceSession.abandonSession()
                    setDialogStarted(false)
                    setHomeMenuView('lessons')
                    setLessonMenuContext({ menuView: 'lessons', lessonsPanel: 'practice' })
                  }}
                  generationBusy={loading}
                />
              ) : isTutorLessonPending ? (
                <div className="flex h-full min-h-0 items-center justify-center bg-[linear-gradient(180deg,var(--chat-wallpaper)_0%,var(--chat-wallpaper-soft)_100%)] px-4">
                  <div className="lesson-enter glass-surface w-full max-w-[24rem] rounded-[1.5rem] border border-[var(--chat-section-neutral-border)] bg-white/95 px-4 py-5 text-center shadow-sm">
                    <p className="text-[15px] font-semibold text-[var(--text)]">MyEng составляет урок...</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                      Тема: {pendingTutorLessonTitle}. Сейчас подготовлю короткие примеры и задания по выбранному смыслу.
                    </p>
                  </div>
                </div>
              ) : isLessonIntroActive && activeLessonIntro ? (
                <LessonIntroScreen
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
                    setLessonViewStage('lesson')
                  }}
                  onShowExtras={() => setLessonViewStage('tips')}
                  onBack={backToLessonList}
                />
              ) : isLessonTipsActive && activeLessonIntro ? (
                <LessonExtraTipsScreen
                  lessonKey={activeLessonTipsKey}
                  intro={activeLessonIntro}
                  intent={activeTutorIntent}
                  provider={settings.provider}
                  openAiChatPreset={settings.openAiChatPreset}
                  audience={settings.audience}
                  level={settings.level}
                  savedState={lessonExtraTipsState}
                  onSavedStateChange={setLessonExtraTipsState}
                  onFooterStatusChange={setLessonExtraTipsStatus}
                  onBack={() => setLessonViewStage('intro')}
                  onStartLesson={() => {
                    if (!activeStructuredLesson) return
                    setLessonViewStage('lesson')
                  }}
                />
              ) : isStructuredLessonActive && activeStructuredLessonStep ? (
                <LessonStepRenderer
                  timeline={activeStructuredLessonTimeline}
                  status={activeStructuredLessonStatus}
                  blockProgress={activeStructuredLessonBlockProgress}
                  exerciseErrors={activeStructuredLessonExerciseErrors}
                  onAnswer={handleStructuredLessonAnswer}
                  onCompleteStep={completeStructuredLessonStep}
                  onPostLessonAction={handlePostLessonAction}
                  postLessonBusy={postLessonBusy}
                  audience={settings.audience}
                  choiceShuffleSeed={structuredLessonChoiceShuffleSeed}
                />
              ) : (
                <Chat
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
                  forceNextMicLang={forceNextMicLang}
                  onConsumeForceNextMicLang={() => setForceNextMicLang(null)}
                  learningActions={
                    activeLearningLessonId && !activeStructuredLesson && !structuredLessonLoadingId
                      ? getLearningLessonActions(activeLearningLessonId)
                      : []
                  }
                  onSelectLearningAction={handleSelectLearningAction}
                  composerSessionKey={composerSessionKey}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Как и шапка: футер — fixed поверх бокового меню (z-50); спейсер оставляет тот же запас, что и блок в потоке. */}
      <div className="shrink-0" style={{ height: 'var(--app-bottom-offset)' }} aria-hidden />
      <footer
        className="app-footer-surface pointer-events-none fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--app-footer-border)]"
        style={{
          minHeight: 'var(--app-footer-row-height)',
          paddingBottom: 'var(--app-bottom-inset)',
        }}
      >
        <AppFooter
          dynamicText={footerDynamicText}
          staticText={footerStaticText}
          variantProgress={activeStructuredLessonFooterVariantProgress}
          typingKey={footerTypingKey}
          audience={settings.audience}
          dynamicTone={footerVoiceTone}
          dynamicEmphasis={footerVoiceEmphasis}
          isLessonActive={isLessonActive}
          isDialogStarted={dialogStarted}
          showWhenIdle={!dialogStarted}
        />
      </footer>

      <SlideOutMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        hideButton
        chatActive={dialogStarted}
        settings={settings}
        onSettingsChange={(s) => setSettings(normalizeSettingsForAudience(s))}
        usage={usage}
        dialogueCorrectAnswers={dialogueCorrectAnswers}
        onStartChat={handleStartChatFromMenu}
        onGoHome={goToStartScreen}
        onOpenLearningLesson={openLearningLesson}
        onGenerateLearningLesson={openGeneratedLearningLesson}
        onOpenPracticeSession={openPracticeSession}
        onGeneratePracticeSession={generatePracticeSession}
        onOpenAccentTrainer={openAccentTrainer}
        onOpenTutorLesson={openTutorLesson}
        lessonMenuContext={lessonMenuContext}
        topOffset="var(--app-top-offset)"
        bottomOffset="var(--app-bottom-offset)"
      />

      {lessonOverlay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-[var(--text)]">{lessonOverlay.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setLessonOverlay(null)
                  setPostLessonBusy(false)
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

