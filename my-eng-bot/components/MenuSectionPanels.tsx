'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import React from 'react'
import { manropeHome } from '@/lib/manropeHome'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import { getAllowedTensesForLevel, normalizeSingleTenseSelection } from '@/lib/levelAllowedTenses'
import type {
  Settings,
  UsageInfo,
  AppMode,
  AiProvider,
  TenseId,
  SentenceType,
  TopicId,
  LevelId,
} from '@/lib/types'
import type { AiChatPanel } from '@/lib/aiChatPanel'
import {
  APP_BTN_SECONDARY_MENU,
  APP_BTN_SECONDARY_SMALL,
  MENU_PRIMARY_CTA_CLASS,
} from '@/lib/homeCtaStyles'
import { featureFlags } from '@/lib/featureFlags'
import { getLessonBadgeDefinition } from '@/lib/lessonBadges'
import { resolveLessonCardMedal, type LessonCardMedalDisplay } from '@/lib/lessonFooter'
import { loadLessonProgressMap } from '@/lib/lessonProgressStorage'
import { aggregateMedals } from '@/lib/lessonScore'
import {
  PRACTICE_TOPICS_BY_AUDIENCE,
  getLessonTopicById,
  getPracticeLessonTopics,
  getTheoryLessonTopics,
  type LessonCatalogLevel,
} from '@/lib/lessonCatalog'
import { getStructuredLessonById } from '@/lib/structuredLessons'
import {
  resolveLessonVariantDualCtaLayout,
} from '@/lib/lessonVariantCtaCopy'
import LessonMenuVariantDualCta from '@/components/LessonMenuVariantDualCta'
import { getGrammarCategoryById } from '@/lib/grammarTaxonomy'
import { getAllTheoryTagsForMenu, getTheoryTagById } from '@/lib/lessonTheoryTags'
import { findPracticeTopicCandidatesByMenuKeys, type PracticeTopicCandidate } from '@/lib/lessonTopicSearch'
import { getTheoryLessonsForTagIdsUnion, groupTheoryLessonsByLevel } from '@/lib/theoryLessonsByTagIds'
import { findTheoryTagCandidatesGlobally } from '@/lib/theoryTagSearch'
import { ACCENT_SECTIONS, RUSSIAN_SPEAKER_GROUPS, getAccentLessonById, getFirstAccentLessonId } from '@/lib/accent/soundCatalog'
import AccentProgressBadge from '@/components/accent/AccentProgressBadge'
import type { ImageAnalysisResult } from '@/lib/types'
import { useTheme } from '@/contexts/ThemeContext'
import type { Theme } from '@/lib/theme'
import type { TutorLearningIntent } from '@/lib/tutorLearningIntent'
import type { PracticeEntrySource, PracticeExerciseType, PracticeMode } from '@/types/practice'
import type { AdaptiveFooterView } from '@/types/adaptiveRetention'
import {
  ENGVO_DEFAULT_VOICE,
  ENGVO_LEVEL_OPTIONS,
  ENGVO_REALTIME_VOICES,
  ENGVO_SPEECH_SPEED_PRESETS,
  type EngvoCefrLevel,
  type EngvoRealtimeVoice,
  type EngvoSpeechSpeedPresetId,
} from '@/lib/engvo/constants'
import {
  getPracticeTtsSpeedPreset,
  PRACTICE_TTS_SPEED_PRESETS,
} from '@/lib/practice/practiceTtsSpeedPresets'
import { DAILY_STREAK_GLYPH, DAILY_STREAK_LABEL } from '@/lib/gamificationGlyphs'
import { formatStreakProgressCopy } from '@/lib/streakProgressCopy'
import { pickFocusModeGoal } from '@/lib/progressFocusGoal'
import {
  formatPracticeProgressBadge,
  pickBestPracticeRewardOpportunity,
  pickDefaultLessonIdForMenu,
  resolveLessonMenuRewardIconsFromProgress,
} from '@/lib/practice/pickBestPracticeRewardOpportunity'
import LessonMenuRewardIcons from '@/components/LessonMenuRewardIcons'
import type { LessonMenuRewardIconsState } from '@/lib/practice/pickBestPracticeRewardOpportunity'
import { countTopicCupStats } from '@/lib/practice/topicCupStats'
import { getPracticeTopicProgress } from '@/lib/practice/practiceTopicProgressStorage'
import { REFERENCE_EXERCISE_OPTIONS } from '@/lib/practice/referenceExerciseOptions'
import type { RewardsState } from '@/lib/rewardsState'
import { createDefaultRewardsState } from '@/lib/rewardsState'
import { buildMyPlanLiveInput } from '@/lib/myPlan/buildInput'
import { getMyPlanRecommendations } from '@/lib/myPlan/recommendations'
import MyPlanPanel from '@/components/MyPlanPanel'

const AdaptiveDailyHub = dynamic(() => import('@/components/adaptiveRetention/AdaptiveDailyHub'), { ssr: false })

const CHILD_TENSE_SET = new Set(CHILD_TENSES)
const CHILD_SAFE_TOPICS = new Set<TopicId>([
  'free_talk',
  'family_friends',
  'hobbies',
  'movies_series',
  'music',
  'sports',
  'food',
  'daily_life',
  'travel',
])

export type MenuView = 'root' | 'lessons' | 'aiChat' | 'settings' | 'progress' | 'myPlan' | 'profile' | 'engvo'

export type { AiChatPanel }

export type TheoryLessonNavigationSource = 'cef_levels' | 'tag_browse'

export type LessonsPanel =
  | 'summary'
  | 'theory'
  | 'theoryCefrLevels'
  | 'theoryGrammarCategories'
  /** Теория по теме: шаг 1 - только уровни, на которых есть уроки по выбранным тегам. */
  | 'theoryTagLevels'
  /** Теория по теме: шаг 2 - список уроков выбранного уровня (как экран A1/A2 по CEFR). */
  | 'theoryTagLessons'
  | 'a1'
  | 'a2'
  | 'practice'
  | 'practiceLevelsHub'
  | 'practiceLevel'
  | 'practiceLevelTopics'
  | 'practiceFormat'
  | 'practiceReferenceType'
  | 'pronunciation'
  | 'pronunciationRussian'
  | 'pronunciationRussianGroup'
  | 'pronunciationAll'
  | 'pronunciationSection'
  | 'tutor'
  | 'vocabulary'
  | 'words'
  | 'wordsAll'
  | 'wordsByLevel'

/** Контекст меню «Уроки» для восстановления после урока (теория по теме / практика). */
export type LessonMenuContext = {
  menuView: 'lessons'
  lessonsPanel: LessonsPanel
  activeGrammarCategoryId?: string | null
  activeTheoryTagId?: string | null
  /** Текст поиска в хабе «По теме», если урок открыт из union по запросу. */
  theorySearchQuery?: string | null
  /** Все теги, по которым собран список уроков (union). */
  activeTheoryTagIds?: string[] | null
  theoryLessonSource?: TheoryLessonNavigationSource | null
  practiceTheoryTagFilterId?: string | null
  /** Уровень CEFR на шаге «теория по теме → урок» (восстановление меню после урока). */
  theoryTagBrowseLevel?: LessonCatalogLevel | null
  /** Выбранный урок при запуске (восстановление подсветки в списке). */
  selectedLessonId?: string | null
}

export type LearningLessonMenuMeta = Pick<
  LessonMenuContext,
  | 'activeGrammarCategoryId'
  | 'activeTheoryTagId'
  | 'theorySearchQuery'
  | 'activeTheoryTagIds'
  | 'theoryLessonSource'
  | 'theoryTagBrowseLevel'
>

const AI_CHAT_PANEL_TITLE: Record<AiChatPanel, string> = {
  summary: 'Чат с Engvo',
  mode: 'Режим',
  audience: 'Стиль общения',
  tense: 'Время',
  sentenceType: 'Тип предложений',
  topic: 'Тема',
  level: 'Уровень',
}

type SettingsMenuPanel = 'summary' | 'provider' | 'voice' | 'playbackSpeed' | 'theme'
type EngvoPanel = 'summary' | 'audience' | 'topic' | 'voice' | 'level' | 'speed'

const SETTINGS_PANEL_TITLE: Record<SettingsMenuPanel, string> = {
  summary: 'Настройки',
  provider: 'ИИ',
  voice: 'Голос',
  playbackSpeed: 'Скорость',
  theme: 'Внешний вид',
}
const ENGVO_PANEL_TITLE: Record<EngvoPanel, string> = {
  summary: 'Позвонить',
  audience: 'Стиль общения',
  topic: 'Тема',
  voice: 'Голос',
  level: 'Уровень',
  speed: 'Скорость речи',
}

const LESSONS_PANEL_TITLE: Record<LessonsPanel, string> = {
  summary: 'Уроки',
  theory: 'Теория',
  theoryCefrLevels: 'Уровни',
  theoryGrammarCategories: 'Темы',
  theoryTagLevels: 'Теория · уровень по теме',
  theoryTagLessons: 'Теория · урок по теме',
  a1: 'A1',
  a2: 'A2',
  practice: 'Практика',
  practiceLevelsHub: 'Практика · уровни',
  practiceLevel: 'Уровень',
  practiceLevelTopics: 'Темы',
  practiceFormat: 'Формат',
  practiceReferenceType: 'Эталон: тип упражнения',
  pronunciation: 'Произношение',
  pronunciationRussian: 'Для русскоговорящих',
  pronunciationRussianGroup: 'Группа звуков',
  pronunciationAll: 'Все звуки',
  pronunciationSection: 'Раздел звуков',
  tutor: 'Репетитор',
  vocabulary: 'Самые необходимые слова',
  words: 'Слова',
  wordsAll: 'Сегодня, темы и свои списки',
  wordsByLevel: 'Слова по уровням (A1-C2)',
}

type TheoryTopicLaunchState = { tagIds: string[]; searchQuery: string | null }

const THEORY_LEVELS: { id: string; label: string }[] = [
  { id: 'A1', label: 'A1 - начальный' },
  { id: 'A2', label: 'A2 - элементарный' },
  { id: 'B1', label: 'B1 - средний' },
  { id: 'B2', label: 'B2 - выше среднего' },
]

const CEFR_LEVEL_PANEL_ORDER: LessonCatalogLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const A2_THEORY_ITEMS = getTheoryLessonTopics('A2').map((item) => ({
  id: item.id,
  label: item.title,
  enabled: item.enabled,
}))

const A2_PRACTICE_ITEMS = getPracticeLessonTopics('A2').map((item) => ({
  id: item.id,
  label: item.title,
  enabled: item.enabled,
}))

const A1_THEORY_ITEMS = getTheoryLessonTopics('A1').map((item) => ({
  id: item.id,
  label: item.title,
  enabled: item.enabled,
}))

const A1_PRACTICE_ITEMS = getPracticeLessonTopics('A1').map((item) => ({
  id: item.id,
  label: item.title,
  enabled: item.enabled,
}))

const PRACTICE_MODE_OPTIONS: { id: PracticeMode; title: string; meta: string; description: string }[] = [
  {
    id: 'relaxed',
    title: 'Лёгкая',
    meta: '6 заданий',
    description: 'Быстро вспомнить правило без перегруза.',
  },
  {
    id: 'balanced',
    title: 'Обычная',
    meta: '9 заданий',
    description: 'Оптимальный вариант для закрепления.',
  },
  {
    id: 'challenge',
    title: 'Челлендж',
    meta: '12 заданий',
    description: 'Больше проверки и меньше подсказок.',
  },
  {
    id: 'reference',
    title: 'Эталон',
    meta: '7 повторов',
    description: 'Одно упражнение по кругу для отладки и полировки.',
  },
]

const ACCENT_QUICK_START_LESSON_ID = getFirstAccentLessonId()

const MODE_OPTIONS: { id: AppMode; label: string }[] = [
  { id: 'communication', label: 'Общение' },
  { id: 'dialogue', label: 'Диалог' },
  { id: 'translation', label: 'Перевод' },
]

const AUDIENCE_OPTIONS: { id: Settings['audience']; label: string }[] = [
  { id: 'child', label: 'Ребёнок' },
  { id: 'adult', label: 'Взрослый' },
]

const PROVIDER_OPTIONS: { id: AiProvider; label: string }[] = [
  { id: 'openai', label: 'ChatGPT' },
  { id: 'openrouter', label: 'Медленно (Free)' },
]

const THEME_OPTIONS: Array<{ id: Theme; name: string; description: string }> = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Минимализм, фокус на тексте и спокойные цвета.',
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Градиенты, glass-эффект и выразительный акцент.',
  },
  {
    id: 'bubble1',
    name: 'Bubble1',
    description: 'Пастельный glass-дизайн с отдельными adult/child палитрами.',
  },
  {
    id: 'bubble2',
    name: 'Bubble2',
    description: 'Liquid Glass / Glassmorphism 2026 с фиксированными adult/child палитрами.',
  },
  {
    id: 'glass1',
    name: 'Glass1',
    description: 'Стеклянный UI, зелёный акцент. Одна палитра для всех возрастов.',
  },
  {
    id: 'glass2',
    name: 'Glass2',
    description: 'Стеклянный UI, синий акцент. Одна палитра для всех возрастов.',
  },
  {
    id: 'glass3',
    name: 'Glass3',
    description: 'Нейтральное стекло, прозрачные бабблы. Одна палитра для всех возрастов.',
  },
]

const MENU_GROUP_CLASS =
  'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]'

/** Вертикальный воздух вокруг карточек списков. */
const MENU_GROUP_OUTER = 'py-1'

export const FIELD_SELECT =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--menu-control-bg)] pl-2 py-1 min-h-[40px] text-[13px] leading-normal text-[var(--text)] touch-manipulation select-chevron'

const MENU_VALUE_BOX =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-1 min-h-[40px] text-[15px] leading-normal text-[var(--text)] flex items-center justify-end'

export const MENU_FIELD_LABEL =
  'shrink-0 w-[6.3rem] text-[13px] font-medium leading-normal text-[var(--text-muted)] break-words'


const MENU_CHOICE_TEXT_CLASS =
  "text-[15px] font-normal [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"

/** Подпись строки меню (кликабельной и неактивной): системный стек, как MenuNavRow. */
const MENU_ROW_LABEL_CLASS = `${MENU_CHOICE_TEXT_CLASS} leading-snug text-[var(--text)]`

const VOICE_DROPDOWN_LANG_PREFIXES: string[] = ['en']

function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface MenuSectionPanelsProps {
  menuView: MenuView
  onMenuViewChange: (v: MenuView) => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  rewardsState?: RewardsState
  onRewardsStateChange?: (state: RewardsState) => void
  idPrefix?: string
  className?: string
  /** Slide-out на всю колонку: горизонтальный отступ у карточек, фон панели без px. */
  edgeToEdge?: boolean
  homeLayout?: boolean
  /** Slide-out: закрыть overlay-меню без сброса сессии. */
  onCloseMenu?: () => void
  onStartHomeChat?: () => void
  onGoHome?: () => void
  onOpenEngvoVoiceChat?: () => void
  engvoRealtimeVoice?: EngvoRealtimeVoice
  engvoCefrLevel?: EngvoCefrLevel
  engvoSpeechSpeedPreset?: EngvoSpeechSpeedPresetId
  onEngvoVoiceChange?: (voice: EngvoRealtimeVoice) => void
  onEngvoLevelChange?: (level: EngvoCefrLevel) => void
  onEngvoSpeechSpeedChange?: (preset: EngvoSpeechSpeedPresetId) => void
  practiceTtsSpeedDefaultIndex?: number
  onPracticeTtsSpeedDefaultChange?: (index: number) => void
  /** Стартовый экран: синхронизация подпанели «Чат с MyEng» для подсказки под меню. */
  onAiChatPanelChange?: (panel: AiChatPanel) => void
  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void | Promise<void>
  /** DEBUG: сразу к финалу выбранного structured-урока. Удалить после редактирования. */
  onDebugSkipToLessonFinale?: (lessonId: string, panel: LessonsPanel) => void
  /** DEBUG: сразу к финалу практики. Удалить после редактирования. */
  onDebugSkipToPracticeFinale?: (request?: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => void
  /** DEBUG: активная сессия практики (для skip-to-finale из меню). */
  practiceSessionActiveForDebug?: boolean
  /** Сгенерировать новый вариант урока через LLM, не открывая локальную версию. */
  onGenerateLearningLesson?: (lessonId: string, lessonsPanel?: LessonsPanel, meta?: LearningLessonMenuMeta) => void | Promise<void>
  onOpenPracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => void | Promise<void>
  onGeneratePracticeSession?: (request: {
    lessonId?: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    customTopic?: string
    referenceExerciseType?: PracticeExerciseType
  }) => void | Promise<void>
  onOpenAccentTrainer?: (lessonId?: string) => void
  onOpenVocabularyWorlds?: () => void | Promise<void>
  onOpenVocabularyByLevel?: () => void | Promise<void>
  /** Практика по теме из adaptive-хаба («Сегодня, темы и свои списки»). */
  onOpenAdaptivePracticeTopic?: (topic: string) => void
  onOpenTutorLesson?: (request: {
    requestedTopic: string
    originalQuery?: string
    selectedIntent?: TutorLearningIntent
    analysisSummary?: string
    catalogLessonId?: string
  }) => Promise<void> | void
  /** Сохранить фильтр практики по тегу теории в контексте приложения (страница). */
  onPracticeTheoryTagFilterPersist?: (tagId: string | null) => void
  /** Футер приложения при открытии «Мой путь» (AdaptiveDailyHub). */
  onAdaptiveFooterViewChange?: (view: AdaptiveFooterView | null) => void
  /** Стартовый уровень lessons-панели при открытии меню. */
  initialLessonsPanel?: LessonsPanel
  /** Поля контекста вместе со `initialLessonsPanel` (восстановление навигации). */
  /** Инкремент после практики - обновить бейджи 🏆 в списке уроков. */
  practiceProgressRevision?: number
  initialLessonMenuContext?: Pick<
    LessonMenuContext,
    | 'activeGrammarCategoryId'
    | 'activeTheoryTagId'
    | 'theorySearchQuery'
    | 'activeTheoryTagIds'
    | 'theoryLessonSource'
    | 'theoryTagBrowseLevel'
    | 'practiceTheoryTagFilterId'
    | 'selectedLessonId'
  > | null
}

export default function MenuSectionPanels({
  menuView,
  onMenuViewChange,
  settings,
  onSettingsChange,
  usage,
  dialogueCorrectAnswers,
  rewardsState,
  onRewardsStateChange,
  idPrefix = 'menu-',
  className,
  edgeToEdge = false,
  homeLayout = false,
  onCloseMenu,
  onStartHomeChat,
  onGoHome,
  onOpenEngvoVoiceChat,
  engvoRealtimeVoice,
  engvoCefrLevel,
  engvoSpeechSpeedPreset,
  onEngvoVoiceChange,
  onEngvoLevelChange,
  onEngvoSpeechSpeedChange,
  practiceTtsSpeedDefaultIndex = 0,
  onPracticeTtsSpeedDefaultChange,
  onAiChatPanelChange,
  onOpenLearningLesson,
  onDebugSkipToLessonFinale,
  onDebugSkipToPracticeFinale,
  practiceSessionActiveForDebug = false,
  onGenerateLearningLesson,
  onOpenPracticeSession,
  onGeneratePracticeSession,
  onOpenAccentTrainer,
  onOpenVocabularyWorlds,
  onOpenVocabularyByLevel,
  onOpenAdaptivePracticeTopic,
  onOpenTutorLesson,
  onAdaptiveFooterViewChange,
  onPracticeTheoryTagFilterPersist,
  initialLessonsPanel,
  initialLessonMenuContext,
  practiceProgressRevision = 0,
}: MenuSectionPanelsProps) {
  const { theme } = useTheme()
  const pid = (suffix: string) => `${idPrefix}${suffix}`

  const [aiChatPanel, setAiChatPanel] = React.useState<AiChatPanel>('summary')
  const [settingsPanel, setSettingsPanel] = React.useState<SettingsMenuPanel>('summary')
  const [engvoPanel, setEngvoPanel] = React.useState<EngvoPanel>('summary')
  const [lessonsPanel, setLessonsPanel] = React.useState<LessonsPanel>('summary')
  const [lessonProgressMap, setLessonProgressMap] = React.useState(loadLessonProgressMap)

  const resolveMenuVariantCtaForLesson = React.useCallback(
    (lessonId: string | null) =>
      resolveLessonVariantDualCtaLayout(lessonId ? lessonProgressMap[lessonId] : null),
    [lessonProgressMap]
  )

  React.useEffect(() => {
    if (menuView === 'lessons' || menuView === 'progress') {
      setLessonProgressMap(loadLessonProgressMap())
    }
  }, [menuView, lessonsPanel, practiceProgressRevision])

  const defaultA2LessonId = React.useMemo(
    () =>
      pickDefaultLessonIdForMenu(A2_THEORY_ITEMS, lessonProgressMap) ??
      A2_THEORY_ITEMS.find((item) => item.enabled)?.id ??
      null,
    [lessonProgressMap]
  )
  const defaultA1LessonId = React.useMemo(
    () =>
      pickDefaultLessonIdForMenu(A1_THEORY_ITEMS, lessonProgressMap) ??
      A1_THEORY_ITEMS.find((item) => item.enabled)?.id ??
      null,
    [lessonProgressMap]
  )
  const defaultPracticeLessonId = React.useMemo(
    () =>
      pickDefaultLessonIdForMenu(A2_PRACTICE_ITEMS, lessonProgressMap) ??
      A2_PRACTICE_ITEMS.find((item) => item.enabled)?.id ??
      null,
    [lessonProgressMap]
  )
  const [selectedA2LessonId, setSelectedA2LessonId] = React.useState<string | null>(defaultA2LessonId)
  const [selectedA1LessonId, setSelectedA1LessonId] = React.useState<string | null>(defaultA1LessonId)
  const [practiceCatalogLevel, setPracticeCatalogLevel] = React.useState<'A1' | 'A2'>('A2')
  const [selectedPracticeLessonId, setSelectedPracticeLessonId] = React.useState<string | null>(defaultPracticeLessonId)
  const [selectedAccentGroupId, setSelectedAccentGroupId] = React.useState<string | null>(null)
  const [selectedAccentSectionId, setSelectedAccentSectionId] = React.useState<string | null>(null)
  const [selectedPracticeMode, setSelectedPracticeMode] = React.useState<PracticeMode>('reference')
  const [selectedReferenceExerciseType, setSelectedReferenceExerciseType] = React.useState<PracticeExerciseType>('choice')
  const [customPracticeTopic, setCustomPracticeTopic] = React.useState('')
  const [customPracticeCandidates, setCustomPracticeCandidates] = React.useState<PracticeTopicCandidate[]>([])
  const [selectedCustomPracticeLessonId, setSelectedCustomPracticeLessonId] = React.useState<string | null>(null)
  const [customPracticeStep, setCustomPracticeStep] = React.useState<'input' | 'select'>('input')
  const [customPracticeSearchMessage, setCustomPracticeSearchMessage] = React.useState<string | null>(null)
  const [practiceBusy, setPracticeBusy] = React.useState(false)
  const [practiceError, setPracticeError] = React.useState<string | null>(null)
  const [tutorImageDataUrl, setTutorImageDataUrl] = React.useState<string | null>(null)
  const [tutorCustomFocus, setTutorCustomFocus] = React.useState('')
  const [tutorImageError, setTutorImageError] = React.useState<string | null>(null)
  const [tutorLoading, setTutorLoading] = React.useState(false)
  const [tutorResult, setTutorResult] = React.useState<ImageAnalysisResult | null>(null)
  const [tutorSuggestedTopics, setTutorSuggestedTopics] = React.useState<string[]>([])
  /** Параллельно tutorSuggestedTopics: id урока из каталога теории (если ответ API с catalogLessonIds). */
  const [tutorCatalogLessonIds, setTutorCatalogLessonIds] = React.useState<string[]>([])
  const [tutorTopicHintsByTopic, setTutorTopicHintsByTopic] = React.useState<Record<string, string>>({})
  const [tutorIntentOptions, setTutorIntentOptions] = React.useState<TutorLearningIntent[]>([])
  const [selectedTutorTopic, setSelectedTutorTopic] = React.useState<string | null>(null)
  const [selectedTutorIntent, setSelectedTutorIntent] = React.useState<TutorLearningIntent | null>(null)
  const [tutorClarifyPrompt, setTutorClarifyPrompt] = React.useState<string | null>(null)
  const [tutorStep, setTutorStep] = React.useState<'input' | 'select'>('input')
  const [tutorStartingLesson, setTutorStartingLesson] = React.useState(false)
  const [generatingLessonId, setGeneratingLessonId] = React.useState<string | null>(null)
  const [generateLessonError, setGenerateLessonError] = React.useState<string | null>(null)
  const [activeGrammarCategoryId, setActiveGrammarCategoryId] = React.useState<string | null>(null)
  const [activeTheoryTagId, setActiveTheoryTagId] = React.useState<string | null>(null)
  const [theoryLessonSourceNav, setTheoryLessonSourceNav] = React.useState<TheoryLessonNavigationSource | null>(null)
  const [practiceTheoryTagFilterId, setPracticeTheoryTagFilterId] = React.useState<string | null>(null)
  const [theoryTagsSearchQuery, setTheoryTagsSearchQuery] = React.useState('')
  const [profileSavedMessage, setProfileSavedMessage] = React.useState<string | null>(null)
  const [profileDraft, setProfileDraft] = React.useState<{
    name: string
    englishLevel: RewardsState['profile']['englishLevel']
    language: RewardsState['profile']['preferences']['language']
    notifications: boolean
    theme: RewardsState['profile']['preferences']['theme']
  }>({
    name: '',
    englishLevel: 'not_set',
    language: 'ru',
    notifications: true,
    theme: 'default',
  })
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)
  const a2PracticeTopicCopy = PRACTICE_TOPICS_BY_AUDIENCE[settings.audience]
  const a2TheoryItems = React.useMemo(
    () =>
      A2_THEORY_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? `Тема: ${item.label}`,
      })),
    [a2PracticeTopicCopy]
  )
  const a1TheoryItems = React.useMemo(
    () =>
      A1_THEORY_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? `Тема: ${item.label}`,
      })),
    [a2PracticeTopicCopy]
  )
  const a1PracticeItems = React.useMemo(
    () =>
      A1_PRACTICE_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? `Тема: ${item.label}`,
      })),
    [a2PracticeTopicCopy]
  )
  const a2PracticeItems = React.useMemo(
    () =>
      A2_PRACTICE_ITEMS.map((item) => ({
        ...item,
        short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
        long: a2PracticeTopicCopy[item.id]?.long ?? `Тема: ${item.label}`,
      })),
    [a2PracticeTopicCopy]
  )
  const catalogPracticeItems = React.useMemo(() => {
    const source = practiceCatalogLevel === 'A1' ? A1_PRACTICE_ITEMS : A2_PRACTICE_ITEMS
    return source.map((item) => ({
      ...item,
      short: a2PracticeTopicCopy[item.id]?.short ?? 'Тема урока',
      long: a2PracticeTopicCopy[item.id]?.long ?? `Тема: ${item.label}`,
    }))
  }, [a2PracticeTopicCopy, practiceCatalogLevel])

  const catalogPracticeItemsFiltered = React.useMemo(() => {
    if (!practiceTheoryTagFilterId) return catalogPracticeItems
    return catalogPracticeItems.filter((item) => {
      const meta = getLessonTopicById(item.id)
      return meta?.tagIds?.includes(practiceTheoryTagFilterId)
    })
  }, [catalogPracticeItems, practiceTheoryTagFilterId])

  const theoryTagGlobalSearchHits = React.useMemo(() => {
    if (!theoryTagsSearchQuery.trim()) return []
    return findTheoryTagCandidatesGlobally(theoryTagsSearchQuery, 12)
  }, [theoryTagsSearchQuery])

  const [theoryTopicLaunch, setTheoryTopicLaunch] = React.useState<TheoryTopicLaunchState | null>(null)
  const [selectedTheoryTopicLessonId, setSelectedTheoryTopicLessonId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLessonProgressMap(loadLessonProgressMap())
  }, [selectedA1LessonId, selectedA2LessonId, selectedTheoryTopicLessonId])

  const theoryTopicLessonCtaLayout = React.useMemo(
    () => resolveMenuVariantCtaForLesson(selectedTheoryTopicLessonId),
    [resolveMenuVariantCtaForLesson, selectedTheoryTopicLessonId]
  )
  const a1LessonCtaLayout = React.useMemo(
    () => resolveMenuVariantCtaForLesson(selectedA1LessonId),
    [resolveMenuVariantCtaForLesson, selectedA1LessonId]
  )
  const a2LessonCtaLayout = React.useMemo(
    () => resolveMenuVariantCtaForLesson(selectedA2LessonId),
    [resolveMenuVariantCtaForLesson, selectedA2LessonId]
  )

  const theoryTagsAlphabetical = React.useMemo(
    () => [...getAllTheoryTagsForMenu()].sort((a, b) => a.menuLabelRu.localeCompare(b.menuLabelRu, 'ru')),
    []
  )

  const theoryTopicLessonsFlat = React.useMemo(
    () => getTheoryLessonsForTagIdsUnion(theoryTopicLaunch?.tagIds ?? []),
    [theoryTopicLaunch]
  )
  const theoryTopicLessonsByLevel = React.useMemo(
    () => groupTheoryLessonsByLevel(theoryTopicLessonsFlat),
    [theoryTopicLessonsFlat]
  )

  const theoryLevelsWithLessons = React.useMemo(
    () => CEFR_LEVEL_PANEL_ORDER.filter((lvl) => (theoryTopicLessonsByLevel[lvl] ?? []).length > 0),
    [theoryTopicLessonsByLevel]
  )

  const [theoryTagBrowseLevel, setTheoryTagBrowseLevel] = React.useState<LessonCatalogLevel | null>(null)

  React.useEffect(() => {
    if (lessonsPanel !== 'theoryTagLevels') return
    setTheoryTagBrowseLevel(null)
  }, [lessonsPanel])

  React.useEffect(() => {
    if (lessonsPanel !== 'theoryTagLessons' || !theoryTopicLaunch?.tagIds.length || !theoryTagBrowseLevel) return
    const list = theoryTopicLessonsByLevel[theoryTagBrowseLevel] ?? []
    if (list.length === 0) {
      setSelectedTheoryTopicLessonId(null)
      return
    }
    setSelectedTheoryTopicLessonId((prev) => (prev && list.some((l) => l.id === prev) ? prev : list[0]!.id))
  }, [lessonsPanel, theoryTopicLaunch, theoryTopicLessonsByLevel, theoryTagBrowseLevel])

  const buildLearningLessonMeta = React.useCallback((): LearningLessonMenuMeta => {
    const source = theoryLessonSourceNav ?? 'cef_levels'
    if (source !== 'tag_browse') {
      return {
        theoryLessonSource: source,
        activeGrammarCategoryId: null,
        activeTheoryTagId: null,
        theorySearchQuery: null,
        activeTheoryTagIds: null,
        theoryTagBrowseLevel: null,
      }
    }
    const tagIdsFromLaunch = theoryTopicLaunch?.tagIds?.filter(Boolean) ?? []
    const tagIds =
      tagIdsFromLaunch.length > 0 ? [...tagIdsFromLaunch] : activeTheoryTagId ? [activeTheoryTagId] : null
    return {
      theoryLessonSource: 'tag_browse',
      activeGrammarCategoryId,
      activeTheoryTagId: activeTheoryTagId ?? tagIds?.[0] ?? null,
      theorySearchQuery: theoryTopicLaunch?.searchQuery ?? null,
      activeTheoryTagIds: tagIds,
      theoryTagBrowseLevel: theoryTagBrowseLevel ?? null,
    }
  }, [theoryLessonSourceNav, activeGrammarCategoryId, activeTheoryTagId, theoryTopicLaunch, theoryTagBrowseLevel])

  React.useEffect(() => {
    if (lessonsPanel !== 'theoryTagLessons') return
    if (theoryTagBrowseLevel) return
    setLessonsPanel('theoryTagLevels')
  }, [lessonsPanel, theoryTagBrowseLevel])

  React.useEffect(() => {
    if (menuView !== 'aiChat') setAiChatPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (menuView !== 'settings') setSettingsPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (menuView !== 'engvo') setEngvoPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (menuView !== 'lessons') setLessonsPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (lessonsPanel !== 'a1') return
    if (!selectedA1LessonId) {
      setSelectedA1LessonId(defaultA1LessonId)
      return
    }
    const selected = A1_THEORY_ITEMS.find((item) => item.id === selectedA1LessonId)
    if (!selected?.enabled) {
      setSelectedA1LessonId(defaultA1LessonId)
    }
  }, [lessonsPanel, selectedA1LessonId, defaultA1LessonId])

  React.useEffect(() => {
    if (lessonsPanel !== 'a2') return
    if (!selectedA2LessonId) {
      setSelectedA2LessonId(defaultA2LessonId)
      return
    }
    const selected = A2_THEORY_ITEMS.find((item) => item.id === selectedA2LessonId)
    if (!selected?.enabled) {
      setSelectedA2LessonId(defaultA2LessonId)
    }
  }, [lessonsPanel, selectedA2LessonId, defaultA2LessonId])

  React.useEffect(() => {
    if (lessonsPanel !== 'practice') return
    if (!selectedPracticeLessonId) {
      setSelectedPracticeLessonId(defaultPracticeLessonId)
      return
    }
    const meta = getLessonTopicById(selectedPracticeLessonId)
    if (!meta?.enabled || !meta.hasPractice) {
      setSelectedPracticeLessonId(defaultPracticeLessonId)
    }
  }, [lessonsPanel, selectedPracticeLessonId, defaultPracticeLessonId])

  const initialLessonMenuContextKey = React.useMemo(() => {
    if (!initialLessonMenuContext) return ''
    return JSON.stringify({
      ag: initialLessonMenuContext.activeGrammarCategoryId ?? null,
      at: initialLessonMenuContext.activeTheoryTagId ?? null,
      tsq: initialLessonMenuContext.theorySearchQuery ?? null,
      atids: initialLessonMenuContext.activeTheoryTagIds ?? null,
      tls: initialLessonMenuContext.theoryLessonSource ?? null,
      pt: initialLessonMenuContext.practiceTheoryTagFilterId ?? null,
      ttbl: initialLessonMenuContext.theoryTagBrowseLevel ?? null,
      sl: initialLessonMenuContext.selectedLessonId ?? null,
    })
  }, [initialLessonMenuContext])

  React.useEffect(() => {
    if (menuView !== 'lessons') return
    if (!initialLessonsPanel) return
    setLessonsPanel(initialLessonsPanel)
    if (!initialLessonMenuContext) return
    setActiveGrammarCategoryId(initialLessonMenuContext.activeGrammarCategoryId ?? null)
    setActiveTheoryTagId(initialLessonMenuContext.activeTheoryTagId ?? null)
    setTheoryLessonSourceNav(initialLessonMenuContext.theoryLessonSource ?? null)
    setPracticeTheoryTagFilterId(initialLessonMenuContext.practiceTheoryTagFilterId ?? null)

    const q = initialLessonMenuContext.theorySearchQuery ?? null
    const rawIds = initialLessonMenuContext.activeTheoryTagIds?.filter(Boolean) ?? null
    const tagIds =
      rawIds && rawIds.length > 0
        ? [...new Set(rawIds)]
        : initialLessonMenuContext.activeTheoryTagId
          ? [initialLessonMenuContext.activeTheoryTagId]
          : []

    if (initialLessonsPanel === 'theoryGrammarCategories') {
      setTheoryTagsSearchQuery(q ?? '')
      setTheoryTopicLaunch(null)
      setSelectedTheoryTopicLessonId(null)
    }

    if (
      initialLessonsPanel === 'theoryTagLevels' ||
      initialLessonsPanel === 'theoryTagLessons' ||
      ((initialLessonsPanel === 'a1' || initialLessonsPanel === 'a2') &&
        initialLessonMenuContext.theoryLessonSource === 'tag_browse')
    ) {
      if (tagIds.length > 0) {
        setTheoryTopicLaunch({ tagIds, searchQuery: q })
        setActiveTheoryTagId(initialLessonMenuContext.activeTheoryTagId ?? tagIds[0] ?? null)
      }
      const savedTagLevel = initialLessonMenuContext.theoryTagBrowseLevel ?? null
      if (tagIds.length > 0 && initialLessonsPanel === 'theoryTagLessons' && savedTagLevel) {
        setTheoryTagBrowseLevel(savedTagLevel)
      }
      if (
        tagIds.length > 0 &&
        initialLessonMenuContext.theoryLessonSource === 'tag_browse' &&
        (initialLessonsPanel === 'a1' || initialLessonsPanel === 'a2')
      ) {
        setTheoryTagBrowseLevel(initialLessonsPanel === 'a1' ? 'A1' : 'A2')
        setLessonsPanel('theoryTagLessons')
      }
    }

    const selectedLessonId = initialLessonMenuContext.selectedLessonId ?? null
    if (selectedLessonId) {
      if (initialLessonsPanel === 'a1') {
        setSelectedA1LessonId(selectedLessonId)
      } else if (initialLessonsPanel === 'a2') {
        setSelectedA2LessonId(selectedLessonId)
      } else if (initialLessonsPanel === 'theoryTagLessons') {
        setSelectedTheoryTopicLessonId(selectedLessonId)
      } else if (initialLessonsPanel === 'practice') {
        setSelectedPracticeLessonId(selectedLessonId)
      }
    }
  }, [menuView, initialLessonsPanel, initialLessonMenuContextKey, initialLessonMenuContext])

  React.useEffect(() => {
    if (!rewardsState) return
    setProfileDraft({
      name: rewardsState.profile.name ?? '',
      englishLevel: rewardsState.profile.englishLevel,
      language: rewardsState.profile.preferences.language,
      notifications: rewardsState.profile.preferences.notifications,
      theme: rewardsState.profile.preferences.theme,
    })
  }, [rewardsState])

  React.useEffect(() => {
    if (menuView === 'aiChat') onAiChatPanelChange?.(aiChatPanel)
  }, [menuView, aiChatPanel, onAiChatPanelChange])

  const hasProfileChanges = React.useMemo(() => {
    if (!rewardsState) return false
    return (
      profileDraft.name.trim() !== (rewardsState.profile.name ?? '').trim() ||
      profileDraft.englishLevel !== rewardsState.profile.englishLevel ||
      profileDraft.language !== rewardsState.profile.preferences.language ||
      profileDraft.notifications !== rewardsState.profile.preferences.notifications ||
      profileDraft.theme !== rewardsState.profile.preferences.theme
    )
  }, [profileDraft, rewardsState])

  const saveProfileDraft = React.useCallback(() => {
    if (!rewardsState || !onRewardsStateChange) return
    onRewardsStateChange({
      ...rewardsState,
      profile: {
        ...rewardsState.profile,
        name: profileDraft.name.trim(),
        englishLevel: profileDraft.englishLevel,
        preferences: {
          ...rewardsState.profile.preferences,
          language: profileDraft.language,
          notifications: profileDraft.notifications,
          theme: profileDraft.theme,
        },
      },
    })
    setProfileSavedMessage('Профиль сохранён.')
    window.setTimeout(() => setProfileSavedMessage(null), 1800)
  }, [onRewardsStateChange, profileDraft, rewardsState])

  const nextBestAction = React.useMemo(() => {
    const communication = rewardsState?.modeGoals.communication
    const engvo = rewardsState?.modeGoals.engvo
    const today = getTodayDateString()
    const activeToday = rewardsState?.progress.lastActiveDate === today
    const streakText = activeToday
      ? 'Серия дней на сегодня зафиксирована.'
      : 'Закройте хотя бы одну цель сегодня, чтобы сохранить серию дней.'
    if (communication?.status === 'in_progress' && !communication.completed) {
      const left = Math.max(0, communication.goalTarget - communication.goalProgress)
      return {
        title: `Довести «Общение» до ${communication.goalTarget}/${communication.goalTarget}`,
        detail: left > 0 ? `Осталось ${left} ответ(ов).` : 'Ещё один шаг до закрытия цикла.',
        streak: streakText,
      }
    }
    if (engvo?.status === 'in_progress' && !engvo.completed) {
      const left = Math.max(0, engvo.goalTarget - engvo.goalProgress)
      return {
        title: `Довести «Звонок» до ${engvo.goalTarget}/${engvo.goalTarget}`,
        detail: left > 0 ? `Осталось ${left} реплик.` : 'Ещё один шаг до закрытия цикла.',
        streak: streakText,
      }
    }
    if ((communication?.status === 'not_started' || communication?.status === 'abandoned') && communication) {
      return {
        title: 'Следующий лучший шаг: начать «Общение»',
        detail: `Цель: ${communication.goalTarget} ответов за короткую сессию.`,
        streak: streakText,
      }
    }
    if ((engvo?.status === 'not_started' || engvo?.status === 'abandoned') && engvo) {
      return {
        title: 'Следующий лучший шаг: начать «Звонок»',
        detail: `Цель: ${engvo.goalTarget} реплик за короткую сессию.`,
        streak: streakText,
      }
    }
    return {
      title: 'Цели дня закрыты',
      detail: 'Можно запустить новый цикл или перейти к уроку/практике.',
      streak: streakText,
    }
  }, [rewardsState])

  const myPlanRecommendations = React.useMemo(() => {
    if (menuView !== 'myPlan') return []
    return getMyPlanRecommendations(buildMyPlanLiveInput(settings, rewardsState ?? null))
  }, [menuView, settings, rewardsState])

  const isChild = settings.audience === 'child'
  const childAllowedLevels = new Set(['all', 'a1', 'a2'])
  const levelOptions = isChild ? LEVELS.filter((l) => childAllowedLevels.has(l.id)) : LEVELS
  const topicOptions = isChild ? TOPICS.filter((t) => CHILD_SAFE_TOPICS.has(t.id as TopicId)) : TOPICS
  const allowedTenseIdsForMenu = React.useMemo(() => {
    const base = getAllowedTensesForLevel(settings.level)
    return isChild ? base.filter((id) => CHILD_TENSE_SET.has(id)) : base
  }, [settings.level, isChild])
  const allowedTenseMenuSet = React.useMemo(() => new Set(allowedTenseIdsForMenu), [allowedTenseIdsForMenu])
  const tenseOptions = TENSES.filter((t) => allowedTenseMenuSet.has(t.id))
  const update = (patch: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...patch })
  }

  const applyAudienceSelection = (id: Settings['audience']) => {
    if (id === 'child') {
      const safeTopic = CHILD_SAFE_TOPICS.has(settings.topic) ? settings.topic : 'hobbies'
      update({ audience: id, level: 'all', tenses: ['present_simple'], topic: safeTopic })
      return
    }
    update({ audience: id })
  }

  const applyTopicSelection = (id: TopicId) => {
    update({ topic: id })
  }

  const runPracticeRequest = async (
    handler: MenuSectionPanelsProps['onOpenPracticeSession'] | MenuSectionPanelsProps['onGeneratePracticeSession'],
    request: {
      lessonId?: string
      mode: PracticeMode
      entrySource: PracticeEntrySource
      customTopic?: string
      referenceExerciseType?: PracticeExerciseType
    }
  ) => {
    if (!handler || practiceBusy) return
    setPracticeBusy(true)
    setPracticeError(null)
    try {
      await handler(request)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось подготовить практику.'
      setPracticeError(message)
    } finally {
      setPracticeBusy(false)
    }
  }

  const searchCustomPracticeTopics = () => {
    const query = customPracticeTopic.trim()
    if (!query) {
      setCustomPracticeSearchMessage('Введите тему, чтобы найти подходящие уроки.')
      setCustomPracticeCandidates([])
      setSelectedCustomPracticeLessonId(null)
      setCustomPracticeStep('input')
      return
    }
    const found = findPracticeTopicCandidatesByMenuKeys(query, settings.audience, 3)
    if (found.length === 0) {
      setCustomPracticeSearchMessage('Тему не нашли в каталоге практики. Уточните формулировку.')
      setCustomPracticeCandidates([])
      setSelectedCustomPracticeLessonId(null)
      setCustomPracticeStep('input')
      return
    }
    setCustomPracticeSearchMessage(`Найдено тем: ${found.length}. Выберите вариант ниже.`)
    setCustomPracticeCandidates(found)
    setSelectedCustomPracticeLessonId(found[0]?.lessonId ?? null)
    setCustomPracticeStep('select')
  }

  const openAccentLesson = (lessonId: string) => {
    onOpenAccentTrainer?.(lessonId)
  }

  const modeLabel = MODE_OPTIONS.find((m) => m.id === settings.mode)?.label ?? settings.mode
  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.id === settings.audience)?.label ?? settings.audience
  const levelLabel = levelOptions.find((l) => l.id === settings.level)?.label ?? settings.level
  const providerLabel = PROVIDER_OPTIONS.find((p) => p.id === settings.provider)?.label ?? settings.provider
  const tenseLabel =
    tenseOptions.find((t) => t.id === (settings.tenses[0] ?? 'present_simple'))?.label ??
    TENSES.find((t) => t.id === (settings.tenses[0] ?? 'present_simple'))?.label ??
    settings.tenses[0]
  const sentenceTypeLabel =
    SENTENCE_TYPES.find((t) => t.id === settings.sentenceType)?.label ?? settings.sentenceType
  const topicLabel = topicOptions.find((t) => t.id === settings.topic)?.label ?? settings.topic
  const themeLabel =
    theme === 'futuristic'
      ? 'Futuristic'
      : theme === 'bubble1'
        ? 'Bubble1'
        : theme === 'bubble2'
          ? 'Bubble2'
          : theme === 'glass1'
            ? 'Glass1'
            : theme === 'glass2'
              ? 'Glass2'
              : theme === 'glass3'
                ? 'Glass3'
                : 'Basic'
  const engvoVoiceLabel = engvoRealtimeVoice ?? ENGVO_DEFAULT_VOICE
  const engvoLevelLabel =
    ENGVO_LEVEL_OPTIONS.find((l) => l.id === (engvoCefrLevel ?? 'a2'))?.label ?? 'A2'
  const engvoSpeechSpeedLabel =
    ENGVO_SPEECH_SPEED_PRESETS.find((p) => p.id === (engvoSpeechSpeedPreset ?? 'conversational'))?.label ??
    'Разговорная'
  const practiceTtsSpeedLabel = getPracticeTtsSpeedPreset(practiceTtsSpeedDefaultIndex).label

  const handleMenuBack = () => {
    if (menuView === 'lessons' && lessonsPanel !== 'summary') {
      if (lessonsPanel === 'a1' || lessonsPanel === 'a2') {
        if (theoryLessonSourceNav === 'tag_browse') {
          setTheoryTagBrowseLevel(lessonsPanel === 'a1' ? 'A1' : 'A2')
          setLessonsPanel('theoryTagLessons')
          return
        }
        if (theoryLessonSourceNav === 'cef_levels') {
          setLessonsPanel('theoryCefrLevels')
          return
        }
        setLessonsPanel('theoryCefrLevels')
        return
      }
      if (lessonsPanel === 'theoryTagLessons') {
        setLessonsPanel('theoryTagLevels')
        return
      }
      if (lessonsPanel === 'theoryTagLevels') {
        setTheoryTopicLaunch(null)
        setSelectedTheoryTopicLessonId(null)
        setActiveTheoryTagId(null)
        setLessonsPanel('theoryGrammarCategories')
        return
      }
      if (lessonsPanel === 'theoryGrammarCategories') {
        setTheoryTagsSearchQuery('')
        setActiveGrammarCategoryId(null)
        setTheoryTopicLaunch(null)
        setSelectedTheoryTopicLessonId(null)
        setLessonsPanel('theory')
        return
      }
      if (lessonsPanel === 'theoryCefrLevels') {
        setLessonsPanel('theory')
        return
      }
      if (lessonsPanel === 'theory') {
        setLessonsPanel('summary')
        return
      }
      if (lessonsPanel === 'practiceLevelTopics') {
        setLessonsPanel('practiceLevel')
        return
      }
      if (lessonsPanel === 'practiceLevel') {
        setLessonsPanel('practiceLevelsHub')
        return
      }
      if (lessonsPanel === 'practiceLevelsHub') {
        setLessonsPanel('practice')
        return
      }
      if (lessonsPanel === 'practiceFormat' || lessonsPanel === 'practiceReferenceType') {
        setLessonsPanel('practice')
        return
      }
      if (lessonsPanel === 'pronunciationRussianGroup') {
        setLessonsPanel('pronunciationRussian')
        return
      }
      if (lessonsPanel === 'pronunciationSection') {
        setLessonsPanel('pronunciationAll')
        return
      }
      if (lessonsPanel === 'pronunciationRussian' || lessonsPanel === 'pronunciationAll') {
        setLessonsPanel('pronunciation')
        return
      }
      if (lessonsPanel === 'wordsAll') {
        setLessonsPanel('words')
        return
      }
      if (lessonsPanel === 'vocabulary') {
        setLessonsPanel('words')
        return
      }
      if (lessonsPanel === 'wordsByLevel') {
        setLessonsPanel('words')
        return
      }
      if (lessonsPanel === 'words') {
        setLessonsPanel('summary')
        return
      }
      if (lessonsPanel === 'tutor') {
        if (tutorStep === 'select') {
          setTutorStep('input')
          return
        }
        setLessonsPanel('summary')
        return
      }
      setLessonsPanel('summary')
      return
    }
    if (menuView === 'aiChat' && aiChatPanel !== 'summary') {
      setAiChatPanel('summary')
      return
    }
    if (menuView === 'settings' && settingsPanel !== 'summary') {
      setSettingsPanel('summary')
      return
    }
    if (menuView === 'engvo' && engvoPanel !== 'summary') {
      if (
        engvoPanel === 'audience' ||
        engvoPanel === 'topic' ||
        engvoPanel === 'voice' ||
        engvoPanel === 'level' ||
        engvoPanel === 'speed'
      ) {
        setEngvoPanel('summary')
        return
      }
    }
    onMenuViewChange('root')
  }

  const canMenuNavigateUp = menuView !== 'root'

  const menuBackAriaLabel =
    menuView === 'aiChat' && aiChatPanel !== 'summary'
      ? 'К настройкам чата'
      : menuView === 'settings' && settingsPanel !== 'summary'
        ? 'К настройкам'
        : menuView === 'engvo' &&
            (engvoPanel === 'audience' ||
              engvoPanel === 'topic' ||
              engvoPanel === 'voice' ||
              engvoPanel === 'level' ||
              engvoPanel === 'speed')
          ? 'К разделу «Позвонить»'
          : menuView === 'lessons' && lessonsPanel === 'tutor' && tutorStep === 'select'
            ? 'К форме репетитора'
            : 'К разделам'

  const menuNavIconButtonClass =
    'btn-3d-menu flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--text)]/[0.18] bg-[var(--menu-card-bg)] text-[var(--text)] touch-manipulation focus-visible:outline-none'

  const rootClass = [
    className ?? (homeLayout ? 'flex min-h-0 flex-col' : 'flex min-h-0 flex-1 flex-col'),
    edgeToEdge ? 'pl-0 pr-3' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const selectedAccentGroup = RUSSIAN_SPEAKER_GROUPS.find((group) => group.id === selectedAccentGroupId) ?? null
  const selectedAccentSection = ACCENT_SECTIONS.find((section) => section.id === selectedAccentSectionId) ?? null
  const selectedPracticeTopic =
    [...a1PracticeItems, ...a2PracticeItems].find((item) => item.id === selectedPracticeLessonId) ?? null
  const selectedPracticeModeOption =
    PRACTICE_MODE_OPTIONS.find((mode) => mode.id === selectedPracticeMode) ?? PRACTICE_MODE_OPTIONS[0]
  const isReferenceMode = selectedPracticeMode === 'reference'
  const selectedReferenceExerciseOption =
    REFERENCE_EXERCISE_OPTIONS.find((item) => item.id === selectedReferenceExerciseType) ?? REFERENCE_EXERCISE_OPTIONS[0]
  const selectedReferenceExerciseIndex = Math.max(
    0,
    REFERENCE_EXERCISE_OPTIONS.findIndex((item) => item.id === selectedReferenceExerciseOption?.id)
  )
  const selectedReferenceChallengeStep =
    selectedReferenceExerciseOption?.challengeStep ?? selectedReferenceExerciseIndex + 1
  const selectedPracticeLessonLabel = selectedPracticeTopic?.label ?? 'Выберите урок'
  const selectedPracticeModeLabel = selectedPracticeModeOption
    ? `${selectedPracticeModeOption.title} · ${selectedPracticeModeOption.meta}`
    : 'Выберите формат'

  const headerTitle = (() => {
    if (menuView === 'lessons' && lessonsPanel === 'pronunciationRussianGroup' && selectedAccentGroup) {
      return selectedAccentGroup.title
    }
    if (menuView === 'lessons' && lessonsPanel === 'pronunciationSection' && selectedAccentSection) {
      return selectedAccentSection.title
    }
    if (
      menuView === 'lessons' &&
      (lessonsPanel === 'theoryTagLevels' || lessonsPanel === 'theoryTagLessons') &&
      theoryTopicLaunch?.tagIds.length
    ) {
      const enLabels = theoryTopicLaunch.tagIds
        .map((id) => getTheoryTagById(id)?.menuLabelEn)
        .filter((x): x is string => Boolean(x))
      if (enLabels.length > 0) return enLabels.join(' · ')
      const q = theoryTopicLaunch.searchQuery?.trim()
      if (q) return q.length > 32 ? `${q.slice(0, 32)}…` : q
      return LESSONS_PANEL_TITLE[lessonsPanel]
    }
    if (menuView === 'lessons') return LESSONS_PANEL_TITLE[lessonsPanel]
    if (menuView === 'aiChat') return AI_CHAT_PANEL_TITLE[aiChatPanel]
    if (menuView === 'settings') return SETTINGS_PANEL_TITLE[settingsPanel]
    if (menuView === 'engvo') return ENGVO_PANEL_TITLE[engvoPanel]
    if (menuView === 'progress') return 'Прогресс'
    if (menuView === 'myPlan') return 'Мой план'
    if (menuView === 'profile') return 'Профиль'
    return !homeLayout ? 'Главная' : ''
  })()

  const lessonsUsesInnerScrollLayout =
    !homeLayout &&
    menuView === 'lessons' &&
    (lessonsPanel === 'a1' ||
      lessonsPanel === 'a2' ||
      lessonsPanel === 'theoryGrammarCategories' ||
      lessonsPanel === 'theoryTagLevels' ||
      lessonsPanel === 'theoryTagLessons')

  const panelScrollAreaEnter =
    'menu-panel-view-enter pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
  const lessonMenuInnerScrollClass =
    'min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
  const lessonMenuPanelShellClass = homeLayout
    ? 'flex flex-col gap-2'
    : 'flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden'
  const lessonMenuListRegionClass = homeLayout ? 'space-y-2' : lessonMenuInnerScrollClass
  const lessonMenuFooterRegionClass = homeLayout
    ? 'space-y-2 border-t border-[var(--border)]/70 pt-2'
    : 'shrink-0 space-y-2 border-t border-[var(--border)]/70 pt-2'
  const panelScrollAreaClass = homeLayout
    ? `${panelScrollAreaEnter} space-y-2.5`
    : lessonsUsesInnerScrollLayout
      ? `${panelScrollAreaEnter} flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden pb-1`
      : `${panelScrollAreaEnter} min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-1`

  const handleGoHome = () => {
    if (onGoHome) onGoHome()
    else onMenuViewChange('root')
  }

  // DEBUG: удалить после редактирования урока
  const debugSelectedLearningLesson = React.useMemo((): { lessonId: string; panel: LessonsPanel } | null => {
    if (menuView !== 'lessons') return null
    let candidate: { lessonId: string; panel: LessonsPanel } | null = null
    if (lessonsPanel === 'a2' && selectedA2LessonId) {
      candidate = { lessonId: selectedA2LessonId, panel: 'a2' }
    } else if (lessonsPanel === 'a1' && selectedA1LessonId) {
      candidate = { lessonId: selectedA1LessonId, panel: 'a1' }
    } else if (lessonsPanel === 'theoryTagLessons' && selectedTheoryTopicLessonId) {
      const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
      const panel: LessonsPanel = topicMeta?.level === 'A1' ? 'a1' : 'a2'
      candidate = { lessonId: selectedTheoryTopicLessonId, panel }
    }
    if (!candidate || !getStructuredLessonById(candidate.lessonId)) return null
    return candidate
  }, [
    menuView,
    lessonsPanel,
    selectedA2LessonId,
    selectedA1LessonId,
    selectedTheoryTopicLessonId,
  ])

  // DEBUG: удалить после редактирования практики
  const debugSelectedPractice = React.useMemo((): {
    lessonId: string
    mode: PracticeMode
    entrySource: PracticeEntrySource
    referenceExerciseType?: PracticeExerciseType
  } | null => {
    if (menuView !== 'lessons' || lessonsPanel !== 'practice') return null
    if (!selectedPracticeLessonId) return null
    if (selectedPracticeMode === 'reference' && !selectedReferenceExerciseType) return null
    return {
      lessonId: selectedPracticeLessonId,
      mode: selectedPracticeMode,
      entrySource: 'menu',
      referenceExerciseType:
        selectedPracticeMode === 'reference' ? selectedReferenceExerciseType : undefined,
    }
  }, [
    menuView,
    lessonsPanel,
    selectedPracticeLessonId,
    selectedPracticeMode,
    selectedReferenceExerciseType,
  ])

  const resetTutorState = React.useCallback(() => {
    setTutorImageError(null)
    setTutorLoading(false)
    setTutorResult(null)
    setTutorImageDataUrl(null)
    setTutorCustomFocus('')
    setTutorSuggestedTopics([])
    setTutorCatalogLessonIds([])
    setTutorTopicHintsByTopic({})
    setTutorIntentOptions([])
    setSelectedTutorTopic(null)
    setSelectedTutorIntent(null)
    setTutorClarifyPrompt(null)
    setTutorStep('input')
    setTutorStartingLesson(false)
  }, [])

  const handleTutorFile = React.useCallback((file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setTutorImageError('Нужен файл изображения (jpg, png, webp и т.д.).')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      setTutorImageError('Изображение слишком большое. Максимум 6 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      if (!result || !result.startsWith('data:image/')) {
        setTutorImageError('Не удалось прочитать изображение.')
        return
      }
      setTutorImageDataUrl(result)
      setTutorImageError(null)
      setTutorResult(null)
      setTutorSuggestedTopics([])
      setTutorCatalogLessonIds([])
      setTutorTopicHintsByTopic({})
      setTutorIntentOptions([])
      setSelectedTutorTopic(null)
      setSelectedTutorIntent(null)
      setTutorClarifyPrompt(null)
      setTutorStep('input')
    }
    reader.onerror = () => {
      setTutorImageError('Не удалось прочитать изображение.')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleTutorAnalyze = React.useCallback(async () => {
    async function resolveWithModel(query: string, analysisSummary?: string) {
      const response = await fetch('/api/tutor-resolve-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          openAiChatPreset: settings.openAiChatPreset ?? 'gpt-4o-mini',
          query,
          level: settings.level,
          audience: settings.audience,
          analysisSummary,
        }),
      })
      const data = (await response.json()) as {
        resolved?: boolean
        suggestions?: string[]
        catalogLessonIds?: string[]
        suggestionMeta?: Array<{ topic?: string; whyRu?: string }>
        intentOptions?: TutorLearningIntent[]
        primaryTopic?: string
        clarifyPrompt?: string
        error?: string
      }
      if (!response.ok) {
        throw new Error(data.error ?? 'Не удалось определить тему для урока.')
      }
      return {
        resolved: Boolean(data.resolved),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        catalogLessonIds: Array.isArray(data.catalogLessonIds) ? data.catalogLessonIds : [],
        suggestionMeta: Array.isArray(data.suggestionMeta) ? data.suggestionMeta : [],
        intentOptions: Array.isArray(data.intentOptions) ? data.intentOptions : [],
        primaryTopic: typeof data.primaryTopic === 'string' ? data.primaryTopic : undefined,
        clarifyPrompt: typeof data.clarifyPrompt === 'string' ? data.clarifyPrompt : undefined,
      }
    }

    const directInput = tutorCustomFocus.trim()
    if (!tutorImageDataUrl && !directInput) {
      setTutorImageError('Введите тему или добавьте фото для анализа.')
      setTutorStep('input')
      return
    }
    // Поддержка сценария "только текст": сначала готовые уроки, затем ИИ-распознавание темы.
    if (!tutorImageDataUrl && directInput) {
      setTutorLoading(true)
      try {
        const resolution = await resolveWithModel(directInput)
        if (!resolution.resolved || !resolution.primaryTopic) {
          setTutorSuggestedTopics([])
          setTutorCatalogLessonIds([])
          setTutorTopicHintsByTopic({})
          setTutorIntentOptions([])
          setSelectedTutorTopic(null)
          setSelectedTutorIntent(null)
          setTutorStep('input')
          setTutorClarifyPrompt(
            resolution.clarifyPrompt ??
              'ИИ: не удалось точно определить тему. Уточните, что хотите учить (например: Present Simple, Have/Has, Articles a/an/the).'
          )
          return
        }
        setTutorImageError(null)
        setTutorResult(null)
        setTutorClarifyPrompt(null)
        setTutorSuggestedTopics(resolution.suggestions)
        setTutorCatalogLessonIds(resolution.catalogLessonIds)
        setTutorIntentOptions(resolution.intentOptions)
        const hints: Record<string, string> = {}
        for (const item of resolution.suggestionMeta) {
          if (!item || typeof item.topic !== 'string' || typeof item.whyRu !== 'string') continue
          const topic = item.topic.trim()
          const whyRu = item.whyRu.trim()
          if (!topic || !whyRu) continue
          hints[topic] = whyRu
        }
        setTutorTopicHintsByTopic(hints)
        setSelectedTutorTopic(resolution.primaryTopic)
        const primaryIdx = resolution.suggestions.findIndex((s) => s === resolution.primaryTopic)
        setSelectedTutorIntent(
          primaryIdx >= 0
            ? (resolution.intentOptions[primaryIdx] ?? resolution.intentOptions[0] ?? null)
            : (resolution.intentOptions.find((intent) => intent.title === resolution.primaryTopic) ??
                resolution.intentOptions[0] ??
                null)
        )
        setTutorStep('select')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
        setTutorImageError(message)
        setTutorSuggestedTopics([])
        setTutorCatalogLessonIds([])
        setTutorTopicHintsByTopic({})
        setTutorIntentOptions([])
        setSelectedTutorTopic(null)
        setSelectedTutorIntent(null)
        setTutorStep('input')
      } finally {
        setTutorLoading(false)
      }
      return
    }
    setTutorLoading(true)
    setTutorImageError(null)
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          openAiChatPreset: settings.openAiChatPreset ?? 'gpt-4o-mini',
          imageDataUrl: tutorImageDataUrl,
          level: settings.level,
          audience: settings.audience,
          customFocus: tutorCustomFocus.trim() || undefined,
        }),
      })
      const data = (await response.json()) as { analysis?: ImageAnalysisResult; error?: string }
      if (!response.ok || !data.analysis) {
        setTutorImageError(data.error ?? 'Не удалось проанализировать изображение.')
        setTutorResult(null)
        return
      }
      setTutorResult(data.analysis)
      const topicInput = tutorCustomFocus.trim() || data.analysis.whatToLearn.focus[0]?.topic || ''
      const resolution = await resolveWithModel(topicInput, data.analysis.whatISee.summaryRu)
      if (!resolution.resolved || !resolution.primaryTopic) {
        setTutorSuggestedTopics([])
        setTutorCatalogLessonIds([])
        setTutorTopicHintsByTopic({})
        setTutorIntentOptions([])
        setSelectedTutorTopic(null)
        setSelectedTutorIntent(null)
        setTutorStep('input')
        setTutorClarifyPrompt(
          resolution.clarifyPrompt ??
            'ИИ: не удалось точно определить тему. Уточните, что хотите учить (например: Present Simple, Have/Has, Articles a/an/the).'
        )
        return
      }
      setTutorClarifyPrompt(null)
      setTutorSuggestedTopics(resolution.suggestions)
      setTutorCatalogLessonIds(resolution.catalogLessonIds)
      setTutorIntentOptions(resolution.intentOptions)
      const hints: Record<string, string> = {}
      for (const item of resolution.suggestionMeta) {
        if (!item || typeof item.topic !== 'string' || typeof item.whyRu !== 'string') continue
        const topic = item.topic.trim()
        const whyRu = item.whyRu.trim()
        if (!topic || !whyRu) continue
        hints[topic] = whyRu
      }
      setTutorTopicHintsByTopic(hints)
      setSelectedTutorTopic(resolution.primaryTopic)
      const primaryIdx = resolution.suggestions.findIndex((s) => s === resolution.primaryTopic)
      setSelectedTutorIntent(
        primaryIdx >= 0
          ? (resolution.intentOptions[primaryIdx] ?? resolution.intentOptions[0] ?? null)
          : (resolution.intentOptions.find((intent) => intent.title === resolution.primaryTopic) ??
              resolution.intentOptions[0] ??
              null)
      )
      setTutorStep('select')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
      setTutorImageError(message)
      setTutorResult(null)
      setTutorSuggestedTopics([])
      setTutorCatalogLessonIds([])
      setTutorIntentOptions([])
      setSelectedTutorIntent(null)
    } finally {
      setTutorLoading(false)
    }
  }, [
    tutorImageDataUrl,
    tutorCustomFocus,
    settings.provider,
    settings.openAiChatPreset,
    settings.level,
    settings.audience,
  ])

  return (
    <div className={`${rootClass} ${manropeHome.className}`.trim()}>
      {(menuView !== 'root' || !homeLayout) && (
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/70 pb-1.5">
          <div className="flex shrink-0 items-center gap-2">
            {canMenuNavigateUp ? (
              <button
                type="button"
                onClick={handleMenuBack}
                className={menuNavIconButtonClass}
                aria-label={menuBackAriaLabel}
                title={menuBackAriaLabel}
              >
                <ChevronLeftIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            ) : null}
            {onCloseMenu ? (
              <button
                type="button"
                onClick={onCloseMenu}
                className={menuNavIconButtonClass}
                aria-label="Закрыть меню"
                title="Закрыть меню"
              >
                <CloseMenuIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleGoHome}
              className={menuNavIconButtonClass}
              aria-label="На стартовый экран"
              title="Стартовая страница"
            >
              <HomeIcon className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
            {onDebugSkipToLessonFinale && debugSelectedLearningLesson ? (
              <button
                type="button"
                onClick={() =>
                  onDebugSkipToLessonFinale(
                    debugSelectedLearningLesson.lessonId,
                    debugSelectedLearningLesson.panel
                  )
                }
                className={menuNavIconButtonClass}
                aria-label="DEBUG: финал урока"
                title="DEBUG: финал урока"
              >
                <span className="text-[13px] font-bold leading-none text-[var(--text-muted)]">⏭</span>
              </button>
            ) : null}
            {onDebugSkipToPracticeFinale && (practiceSessionActiveForDebug || debugSelectedPractice) ? (
              <button
                type="button"
                onClick={() => {
                  if (practiceSessionActiveForDebug) {
                    onDebugSkipToPracticeFinale()
                    return
                  }
                  if (debugSelectedPractice) {
                    onDebugSkipToPracticeFinale(debugSelectedPractice)
                  }
                }}
                className={menuNavIconButtonClass}
                aria-label="DEBUG: финал практики"
                title="DEBUG: финал практики"
              >
                <span className="text-[13px] font-bold leading-none text-[var(--text-muted)]">⏭</span>
              </button>
            ) : null}
          </div>
          <h2 className="min-w-0 flex-1 truncate pr-2 text-right [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif] text-[18px] font-semibold leading-[1.25] tracking-normal text-[var(--text)] sm:pr-3">
            {headerTitle}
          </h2>
        </div>
      )}

      <div
        key={
          menuView === 'aiChat'
            ? `aiChat-${aiChatPanel}`
            : menuView === 'lessons'
              ? `lessons-${lessonsPanel}`
              : menuView === 'settings'
                ? `settings-${settingsPanel}`
                : menuView === 'engvo'
                  ? `engvo-${engvoPanel}`
                : menuView
        }
        className={panelScrollAreaClass}
      >
        {menuView === 'root' && !homeLayout && (
          <div className={MENU_GROUP_OUTER}>
            <div className={MENU_GROUP_CLASS}>
              <MenuNavRow label="Чат с Engvo" onClick={() => onMenuViewChange('aiChat')} />
              {featureFlags.engvoVoiceV1 && onOpenEngvoVoiceChat && (
                <MenuNavRow label="Позвонить" onClick={() => onMenuViewChange('engvo')} />
              )}
              <MenuNavRow
                label="Уроки"
                onClick={() => {
                  setLessonsPanel('summary')
                  onMenuViewChange('lessons')
                }}
              />
              <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />
              <MenuNavRow label="Мой план" onClick={() => onMenuViewChange('myPlan')} />
              <MenuNavRow label="Настройки" onClick={() => onMenuViewChange('settings')} />
              <MenuNavRow label="Профиль" onClick={() => onMenuViewChange('profile')} />
            </div>
          </div>
        )}

        {menuView === 'engvo' && (
          <>
            {engvoPanel === 'summary' && (
              <>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    <MenuSettingRow label="Стиль общения" value={audienceLabel} onClick={() => setEngvoPanel('audience')} />
                    <MenuSettingRow label="Тема" value={topicLabel} onClick={() => setEngvoPanel('topic')} />
                    <MenuSettingRow label="Голос" value={engvoVoiceLabel} onClick={() => setEngvoPanel('voice')} />
                    <MenuSettingRow label="Уровень" value={engvoLevelLabel} onClick={() => setEngvoPanel('level')} />
                    <MenuSettingRow
                      label="Скорость речи"
                      value={engvoSpeechSpeedLabel}
                      onClick={() => setEngvoPanel('speed')}
                    />
                  </div>
                </div>
                {onOpenEngvoVoiceChat && (
                  <div className="pt-2">
                    <button type="button" onClick={onOpenEngvoVoiceChat} className={MENU_PRIMARY_CTA_CLASS}>
                      Перейти к звонку
                    </button>
                  </div>
                )}
              </>
            )}
            {engvoPanel === 'audience' && (
              <PickerList
                options={AUDIENCE_OPTIONS}
                value={settings.audience}
                onSelect={(id) => {
                  applyAudienceSelection(id as Settings['audience'])
                  setEngvoPanel('summary')
                }}
              />
            )}
            {engvoPanel === 'topic' && (
              <PickerList
                options={topicOptions.map((t) => ({ id: t.id, label: t.label }))}
                value={settings.topic}
                onSelect={(id) => {
                  applyTopicSelection(id as TopicId)
                  setEngvoPanel('summary')
                }}
              />
            )}
            {engvoPanel === 'voice' && (
              <PickerList
                options={ENGVO_REALTIME_VOICES.map((voice) => ({ id: voice, label: voice }))}
                value={engvoRealtimeVoice ?? ENGVO_DEFAULT_VOICE}
                onSelect={(id) => {
                  onEngvoVoiceChange?.(id as EngvoRealtimeVoice)
                  setEngvoPanel('summary')
                }}
              />
            )}
            {engvoPanel === 'level' && (
              <PickerList
                options={ENGVO_LEVEL_OPTIONS.map((l) => ({ id: l.id, label: l.label }))}
                value={engvoCefrLevel ?? 'a2'}
                onSelect={(id) => {
                  onEngvoLevelChange?.(id as EngvoCefrLevel)
                  setEngvoPanel('summary')
                }}
              />
            )}
            {engvoPanel === 'speed' && (
              <PickerList
                options={ENGVO_SPEECH_SPEED_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
                value={engvoSpeechSpeedPreset ?? 'conversational'}
                onSelect={(id) => {
                  onEngvoSpeechSpeedChange?.(id as EngvoSpeechSpeedPresetId)
                  setEngvoPanel('summary')
                }}
              />
            )}
          </>
        )}

        {menuView === 'lessons' && (
          <>
            {lessonsPanel === 'summary' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="Теория" onClick={() => setLessonsPanel('theory')} />
                  {featureFlags.practiceEngineV1 && (
                    <MenuNavRow label="Практика" onClick={() => setLessonsPanel('practice')} />
                  )}
                  {featureFlags.accentTrainerV1 ? (
                    <MenuNavRow label="Произношение" onClick={() => setLessonsPanel('pronunciation')} />
                  ) : (
                    <LessonTopicRow label="Произношение" />
                  )}
                  <MenuNavRow
                    label="Репетитор"
                    onClick={() => {
                      resetTutorState()
                      setLessonsPanel('tutor')
                    }}
                  />
                  <MenuNavRow label="Слова" onClick={() => setLessonsPanel('words')} />
                </div>
              </div>
            )}

            {lessonsPanel === 'words' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="Самые необходимые слова" onClick={() => setLessonsPanel('vocabulary')} />
                  <MenuNavRow label="Слова по уровням (A1-C2)" onClick={() => setLessonsPanel('wordsByLevel')} />
                  <MenuNavRow
                    label="Сегодня, темы и свои списки"
                    onClick={() => setLessonsPanel('wordsAll')}
                  />
                </div>
              </div>
            )}

            {lessonsPanel === 'vocabulary' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <p className="text-[15px] font-semibold leading-snug text-[var(--text)]">Самые необходимые слова</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Короткие игровые сессии по базовым словам: миры, повторение, мини-игра и голосовой шаг.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Раздел работает отдельно и не меняет существующие сценарии диалога, практики и произношения.
                  </p>
                  <button
                    type="button"
                    onClick={() => void onOpenVocabularyWorlds?.()}
                    disabled={!onOpenVocabularyWorlds}
                    className={`${MENU_PRIMARY_CTA_CLASS} mt-3`}
                  >
                    Открыть миры слов
                  </button>
                </div>
              </div>
            )}

            {lessonsPanel === 'wordsByLevel' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <p className="text-[15px] font-semibold leading-snug text-[var(--text)]">Слова по уровням (A1-C2)</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Уровень CEFR, тематические подборки и отдельный список выученных слов. Прогресс общий с режимом «миры».
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <button
                    type="button"
                    onClick={() => void onOpenVocabularyByLevel?.()}
                    disabled={!onOpenVocabularyByLevel}
                    className={`${MENU_PRIMARY_CTA_CLASS} mt-1`}
                  >
                    Открыть слова по уровням
                  </button>
                </div>
              </div>
            )}

            {lessonsPanel === 'wordsAll' && onOpenAdaptivePracticeTopic && onStartHomeChat && (
              <AdaptiveDailyHub
                settings={settings}
                onOpenVocabularyWorlds={() => void onOpenVocabularyWorlds?.()}
                onOpenPracticeTopic={onOpenAdaptivePracticeTopic}
                onStartChat={onStartHomeChat}
                onFooterViewChange={onAdaptiveFooterViewChange}
              />
            )}

            {lessonsPanel === 'pronunciation' && (
              <>
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Выберите короткий старт, типичные сложности русскоговорящих или полный список звуков.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAccentLesson(ACCENT_QUICK_START_LESSON_ID)}
                    disabled={!onOpenAccentTrainer}
                    className={MENU_PRIMARY_CTA_CLASS}
                  >
                    Быстрый старт
                  </button>
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    <MenuNavRow label="Сложные звуки для русскоговорящих" onClick={() => setLessonsPanel('pronunciationRussian')} />
                    <MenuNavRow label="Все звуки" onClick={() => setLessonsPanel('pronunciationAll')} />
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'pronunciationRussian' && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  Начните с групп, которые чаще всего выдают русский акцент в английской речи.
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {RUSSIAN_SPEAKER_GROUPS.map((group) => (
                      <MenuNavRow
                        key={group.id}
                        label={group.title}
                        onClick={() => {
                          setSelectedAccentGroupId(group.id)
                          setLessonsPanel('pronunciationRussianGroup')
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'pronunciationRussianGroup' && selectedAccentGroup && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  {selectedAccentGroup.subtitle}
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {selectedAccentGroup.lessonIds.map((lessonId) => {
                      const lesson = getAccentLessonById(lessonId)
                      if (!lesson) return null
                      return (
                        <AccentLessonRow
                          key={lesson.id}
                          label={lesson.title}
                          lessonId={lesson.id}
                          onClick={() => openAccentLesson(lesson.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'pronunciationAll' && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  Полный каталог по звукам и речевым навыкам. Если не знаете, с чего начать, вернитесь к быстрому старту.
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {ACCENT_SECTIONS.map((section) => (
                      <MenuNavRow
                        key={section.id}
                        label={section.title}
                        onClick={() => {
                          setSelectedAccentSectionId(section.id)
                          setLessonsPanel('pronunciationSection')
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'pronunciationSection' && selectedAccentSection && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  {selectedAccentSection.subtitle}
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {selectedAccentSection.lessonIds.map((lessonId) => {
                      const lesson = getAccentLessonById(lessonId)
                      if (!lesson) return null
                      return (
                        <AccentLessonRow
                          key={lesson.id}
                          label={lesson.shortTitle}
                          lessonId={lesson.id}
                          onClick={() => openAccentLesson(lesson.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'theory' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="По уровню" onClick={() => setLessonsPanel('theoryCefrLevels')} />
                  <MenuNavRow
                    label="По теме"
                    onClick={() => {
                      setTheoryTagsSearchQuery('')
                      setTheoryTopicLaunch(null)
                      setSelectedTheoryTopicLessonId(null)
                      setLessonsPanel('theoryGrammarCategories')
                    }}
                  />
                </div>
              </div>
            )}

            {lessonsPanel === 'theoryCefrLevels' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  {THEORY_LEVELS.map((level) => (
                    <LessonLevelRow
                      key={level.id}
                      label={level.label}
                      onClick={
                        level.id === 'A2'
                          ? () => {
                              setTheoryLessonSourceNav('cef_levels')
                              setLessonsPanel('a2')
                            }
                          : level.id === 'A1'
                            ? () => {
                                setTheoryLessonSourceNav('cef_levels')
                                setLessonsPanel('a1')
                              }
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {lessonsPanel === 'theoryGrammarCategories' && (
              <div className={lessonMenuPanelShellClass}>
                <div className={lessonMenuListRegionClass}>
                  <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                    <label className="block text-[13px] font-medium text-[var(--text-muted)]" htmlFor={pid('theory-tag-search')}>
                      Поиск тега
                    </label>
                    <input
                      id={pid('theory-tag-search')}
                      type="text"
                      value={theoryTagsSearchQuery}
                      onChange={(e) => setTheoryTagsSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[15px] text-[var(--text)] outline-none"
                      placeholder="Например: who или вложенные"
                    />
                  </div>
                  {theoryTagsSearchQuery.trim() ? (
                    <div className={MENU_GROUP_OUTER}>
                      <div className={MENU_GROUP_CLASS}>
                        {theoryTagGlobalSearchHits.map((hit) => {
                          const t = getTheoryTagById(hit.tagId)
                          if (!t) return null
                          const cat = getGrammarCategoryById(hit.categoryId)
                          const catLabel = cat?.menuTitleRu ?? cat?.menuTitle ?? ''
                          return (
                            <TheoryTagMenuRow
                              key={`${hit.tagId}-${hit.categoryId}`}
                              primary={t.menuLabelRu}
                              secondary={t.menuLabelEn}
                              meta={catLabel || undefined}
                              onClick={() => {
                                setTheoryLessonSourceNav('tag_browse')
                                setActiveGrammarCategoryId(hit.categoryId)
                                setActiveTheoryTagId(t.id)
                                setTheoryTopicLaunch({
                                  tagIds: [t.id],
                                  searchQuery: theoryTagsSearchQuery.trim() || null,
                                })
                                setLessonsPanel('theoryTagLevels')
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={MENU_GROUP_OUTER}>
                      <div className={MENU_GROUP_CLASS}>
                        {theoryTagsAlphabetical.map((t) => (
                          <TheoryTagMenuRow
                            key={t.id}
                            primary={t.menuLabelRu}
                            secondary={t.menuLabelEn}
                            onClick={() => {
                              setTheoryLessonSourceNav('tag_browse')
                              setActiveGrammarCategoryId(t.categoryId)
                              setActiveTheoryTagId(t.id)
                              setTheoryTopicLaunch({ tagIds: [t.id], searchQuery: null })
                              setLessonsPanel('theoryTagLevels')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {theoryTagsSearchQuery.trim() && theoryTagGlobalSearchHits.length === 0 ? (
                    <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                      Совпадений не нашли - уточните запрос или очистите поле, чтобы увидеть список тем.
                    </p>
                  ) : null}
                </div>
                {theoryTagsSearchQuery.trim() && theoryTagGlobalSearchHits.length > 0 ? (
                  <div className={lessonMenuFooterRegionClass}>
                    <button
                      type="button"
                      className={MENU_PRIMARY_CTA_CLASS}
                      onClick={() => {
                        const unionIds = Array.from(new Set(theoryTagGlobalSearchHits.map((h) => h.tagId)))
                        setTheoryLessonSourceNav('tag_browse')
                        setTheoryTopicLaunch({
                          tagIds: unionIds,
                          searchQuery: theoryTagsSearchQuery.trim(),
                        })
                        setActiveGrammarCategoryId(null)
                        setActiveTheoryTagId(unionIds[0] ?? null)
                        setLessonsPanel('theoryTagLevels')
                      }}
                    >
                      Уроки по запросу
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {lessonsPanel === 'theoryTagLevels' && theoryTopicLaunch && theoryTopicLaunch.tagIds.length > 0 ? (
              <div className={lessonMenuPanelShellClass}>
                <div className={`${lessonMenuListRegionClass}${homeLayout ? ' flex flex-col gap-2' : ''}`}>
                  {theoryTopicLessonsFlat.length === 0 ? (
                    <p className="shrink-0 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                      По выбранным темам пока нет уроков с теорией.
                    </p>
                  ) : (
                    <div className={MENU_GROUP_OUTER}>
                      <div className={MENU_GROUP_CLASS}>
                        {theoryLevelsWithLessons.map((lvl) => (
                          <LessonLevelRow
                            key={lvl}
                            label={THEORY_LEVELS.find((r) => r.id === lvl)?.label ?? `${lvl}`}
                            onClick={() => {
                              setTheoryTagBrowseLevel(lvl)
                              setLessonsPanel('theoryTagLessons')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {lessonsPanel === 'theoryTagLessons' &&
            theoryTopicLaunch &&
            theoryTopicLaunch.tagIds.length > 0 &&
            theoryTagBrowseLevel ? (
              <div className={lessonMenuPanelShellClass}>
                <div className={lessonMenuListRegionClass}>
                  <div className={MENU_GROUP_OUTER}>
                    <div className={MENU_GROUP_CLASS}>
                      {(theoryTopicLessonsByLevel[theoryTagBrowseLevel] ?? []).map((lesson) => {
                        const topicCopy = a2PracticeTopicCopy[lesson.id]
                        return (
                          <A2LessonChoiceRow
                            key={lesson.id}
                            label={lesson.title}
                            subtitle={topicCopy?.short}
                            description={topicCopy?.long}
                            medalDisplay={resolveLessonCardMedal(lessonProgressMap[lesson.id])}
                            rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                              lesson.id,
                              lessonProgressMap[lesson.id]
                            )}
                            selected={Boolean(lesson.enabled && selectedTheoryTopicLessonId === lesson.id)}
                            enabled={lesson.enabled}
                            onClick={
                              lesson.enabled
                                ? () => {
                                    setSelectedTheoryTopicLessonId(lesson.id)
                                    setGenerateLessonError(null)
                                  }
                                : undefined
                            }
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
                {theoryTopicLessonsFlat.length > 0 ? (
                  <div className={lessonMenuFooterRegionClass}>
                    <LessonMenuVariantDualCta
                      layout={theoryTopicLessonCtaLayout}
                      selectedLessonId={selectedTheoryTopicLessonId}
                      generatingLessonId={generatingLessonId}
                      canOpen={Boolean(onOpenLearningLesson && selectedTheoryTopicLessonId)}
                      canGenerate={Boolean(
                        onGenerateLearningLesson &&
                          selectedTheoryTopicLessonId &&
                          !generatingLessonId &&
                          (() => {
                            const m = selectedTheoryTopicLessonId
                              ? getLessonTopicById(selectedTheoryTopicLessonId)
                              : null
                            return m?.level === 'A1' || m?.level === 'A2'
                          })()
                      )}
                      onOpen={() => {
                        if (!onOpenLearningLesson || !selectedTheoryTopicLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        const panel: LessonsPanel = topicMeta?.level === 'A1' ? 'a1' : 'a2'
                        void onOpenLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                      }}
                      onGenerate={async () => {
                        if (!onGenerateLearningLesson || !selectedTheoryTopicLessonId || generatingLessonId) return
                        const topicMeta = getLessonTopicById(selectedTheoryTopicLessonId)
                        if (topicMeta?.level !== 'A1' && topicMeta?.level !== 'A2') return
                        const panel: LessonsPanel = topicMeta.level === 'A1' ? 'a1' : 'a2'
                        setGenerateLessonError(null)
                        setGeneratingLessonId(selectedTheoryTopicLessonId)
                        try {
                          await onGenerateLearningLesson(selectedTheoryTopicLessonId, panel, buildLearningLessonMeta())
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                          setGenerateLessonError(message)
                        } finally {
                          setGeneratingLessonId(null)
                        }
                      }}
                      generateError={generateLessonError}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {lessonsPanel === 'a1' && (
              <div className={lessonMenuPanelShellClass}>
                <div className={lessonMenuListRegionClass}>
                  <div className={MENU_GROUP_OUTER}>
                    <div className={MENU_GROUP_CLASS}>
                      {a1TheoryItems.map((item) => (
                        <A2LessonChoiceRow
                          key={item.id}
                          label={item.label}
                          subtitle={item.short}
                          description={item.long}
                          medalDisplay={resolveLessonCardMedal(lessonProgressMap[item.id])}
                          rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                            item.id,
                            lessonProgressMap[item.id]
                          )}
                          selected={item.enabled && selectedA1LessonId === item.id}
                          enabled={item.enabled}
                          onClick={
                            item.enabled
                              ? () => {
                                  setSelectedA1LessonId(item.id)
                                  setGenerateLessonError(null)
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className={lessonMenuFooterRegionClass}>
                  <LessonMenuVariantDualCta
                    layout={a1LessonCtaLayout}
                    selectedLessonId={selectedA1LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA1LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA1LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA1LessonId) return
                      void onOpenLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA1LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA1LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA1LessonId, 'a1', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />
                </div>
              </div>
            )}

            {lessonsPanel === 'a2' && (
              <div className={lessonMenuPanelShellClass}>
                <div className={lessonMenuListRegionClass}>
                  <div className={MENU_GROUP_OUTER}>
                    <div className={MENU_GROUP_CLASS}>
                      {a2TheoryItems.map((item) => (
                        <A2LessonChoiceRow
                          key={item.id}
                          label={item.label}
                          subtitle={item.short}
                          description={item.long}
                          medalDisplay={resolveLessonCardMedal(lessonProgressMap[item.id])}
                          rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                            item.id,
                            lessonProgressMap[item.id]
                          )}
                          selected={item.enabled && selectedA2LessonId === item.id}
                          enabled={item.enabled}
                          onClick={
                            item.enabled
                              ? () => {
                                  setSelectedA2LessonId(item.id)
                                  setGenerateLessonError(null)
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className={lessonMenuFooterRegionClass}>
                  <LessonMenuVariantDualCta
                    layout={a2LessonCtaLayout}
                    selectedLessonId={selectedA2LessonId}
                    generatingLessonId={generatingLessonId}
                    canOpen={Boolean(onOpenLearningLesson && selectedA2LessonId)}
                    canGenerate={Boolean(onGenerateLearningLesson && selectedA2LessonId && !generatingLessonId)}
                    onOpen={() => {
                      if (!onOpenLearningLesson || !selectedA2LessonId) return
                      void onOpenLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                    }}
                    onGenerate={async () => {
                      if (!onGenerateLearningLesson || !selectedA2LessonId || generatingLessonId) return
                      setGenerateLessonError(null)
                      setGeneratingLessonId(selectedA2LessonId)
                      try {
                        await onGenerateLearningLesson(selectedA2LessonId, 'a2', buildLearningLessonMeta())
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Не удалось сгенерировать урок через LLM.'
                        setGenerateLessonError(message)
                      } finally {
                        setGeneratingLessonId(null)
                      }
                    }}
                    generateError={generateLessonError}
                  />
                </div>
              </div>
            )}
            {lessonsPanel === 'practice' && (
              <>
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">Выберите урок и темп</p>
                  {practiceTheoryTagFilterId ? (
                    <div className="mb-2 rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2 text-[13px] text-[var(--status-info-text)]">
                      <span className="font-medium">Фильтр по теме:</span>{' '}
                      {getTheoryTagById(practiceTheoryTagFilterId)?.menuLabelRu ?? practiceTheoryTagFilterId}
                      <button
                        type="button"
                        className="ml-2 underline decoration-dotted hover:opacity-90"
                        onClick={() => {
                          setPracticeTheoryTagFilterId(null)
                          onPracticeTheoryTagFilterPersist?.(null)
                        }}
                      >
                        Сбросить
                      </button>
                    </div>
                  ) : null}
                  <div className={MENU_GROUP_CLASS}>
                    <MenuSettingRow
                      label="Урок"
                      value={selectedPracticeLessonLabel}
                      trailing={
                        selectedPracticeLessonId ? (
                          <LessonMenuRewardIcons
                            rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                              selectedPracticeLessonId,
                              lessonProgressMap[selectedPracticeLessonId]
                            )}
                            medalDisplay={resolveLessonCardMedal(lessonProgressMap[selectedPracticeLessonId])}
                            size="md"
                          />
                        ) : null
                      }
                      onClick={() => setLessonsPanel('practiceLevelsHub')}
                    />
                    <MenuSettingRow label="Темп" value={selectedPracticeModeLabel} onClick={() => setLessonsPanel('practiceFormat')} />
                    {isReferenceMode && selectedReferenceExerciseOption ? (
                      <MenuSettingRow
                        label="Упражнение"
                        value={`#${selectedReferenceChallengeStep} ${selectedReferenceExerciseOption.label}`}
                        onClick={() => setLessonsPanel('practiceReferenceType')}
                      />
                    ) : null}
                  </div>
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        void runPracticeRequest(onOpenPracticeSession, {
                          lessonId: selectedPracticeLessonId ?? undefined,
                          mode: selectedPracticeMode,
                          entrySource: 'menu',
                          referenceExerciseType: isReferenceMode ? selectedReferenceExerciseType : undefined,
                        })
                      }}
                      disabled={
                        !onOpenPracticeSession ||
                        !selectedPracticeLessonId ||
                        practiceBusy ||
                        (isReferenceMode && !selectedReferenceExerciseType)
                      }
                      className={MENU_PRIMARY_CTA_CLASS}
                    >
                      {practiceBusy ? 'Готовим практику...' : isReferenceMode ? 'Запустить эталон' : 'Запустить практику'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runPracticeRequest(onGeneratePracticeSession, {
                          lessonId: selectedPracticeLessonId ?? undefined,
                          mode: selectedPracticeMode,
                          entrySource: 'menu',
                          referenceExerciseType: isReferenceMode ? selectedReferenceExerciseType : undefined,
                        })
                      }
                      disabled={!onGeneratePracticeSession || !selectedPracticeLessonId || practiceBusy}
                      className={APP_BTN_SECONDARY_MENU}
                    >
                      {practiceBusy ? 'Генерируем практику...' : isReferenceMode ? 'Сгенерировать эталон' : 'Сгенерировать вариант'}
                    </button>
                    {practiceError && (
                      <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                        {practiceError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <label className="block text-[13px] font-medium text-[var(--text-muted)]" htmlFor={pid('custom-practice-topic')}>
                    Своя тема
                  </label>
                  <input
                    id={pid('custom-practice-topic')}
                    type="text"
                    value={customPracticeTopic}
                    onChange={(event) => {
                      setCustomPracticeTopic(event.target.value)
                      setCustomPracticeStep('input')
                      setCustomPracticeSearchMessage(null)
                      setCustomPracticeCandidates([])
                      setSelectedCustomPracticeLessonId(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      if (!customPracticeTopic.trim()) return
                      searchCustomPracticeTopics()
                    }}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[15px] text-[var(--text)] outline-none"
                    placeholder="Например: Present Perfect в поездке"
                  />
                  <button
                    type="button"
                    onClick={searchCustomPracticeTopics}
                    disabled={!customPracticeTopic.trim()}
                    className="btn-3d-menu w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-center text-sm font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Подобрать тему
                  </button>
                  {customPracticeSearchMessage && (
                    <p
                      className={
                        customPracticeStep === 'select'
                          ? 'rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-2 text-[13px] text-[var(--status-success-text)]'
                          : 'rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]'
                      }
                    >
                      {customPracticeSearchMessage}
                    </p>
                  )}
                  {customPracticeStep === 'select' && customPracticeCandidates.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] p-2">
                      {customPracticeCandidates.map((candidate) => (
                        <button
                          key={candidate.lessonId}
                          type="button"
                          onClick={() => setSelectedCustomPracticeLessonId(candidate.lessonId)}
                          className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[14px] text-[var(--text)] hover:bg-[var(--border)]/20"
                        >
                          <span className="min-w-0 pr-2">
                            <span className="block">{candidate.title}</span>
                            <span className="block text-[12px] leading-snug text-[var(--text-muted)]">
                              {candidate.reason === candidate.title
                                ? 'Подобрали наиболее близкую тему из каталога практики.'
                                : `Совпадение по запросу: "${candidate.reason}"`}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <LessonMenuRewardIcons
rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                              candidate.lessonId,
                              lessonProgressMap[candidate.lessonId]
                            )}
                              medalDisplay={resolveLessonCardMedal(lessonProgressMap[candidate.lessonId])}
                              size="md"
                            />
                            {selectedCustomPracticeLessonId === candidate.lessonId ? (
                              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            ) : (
                              <span className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={
                          !onOpenPracticeSession ||
                          !selectedCustomPracticeLessonId ||
                          practiceBusy ||
                          (isReferenceMode && !selectedReferenceExerciseType)
                        }
                        onClick={() => {
                          void runPracticeRequest(onOpenPracticeSession, {
                            lessonId: selectedCustomPracticeLessonId ?? undefined,
                            mode: selectedPracticeMode,
                            entrySource: 'custom_topic',
                            referenceExerciseType: isReferenceMode ? selectedReferenceExerciseType : undefined,
                          })
                        }}
                        className={MENU_PRIMARY_CTA_CLASS}
                      >
                        Запустить практику по теме
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPracticeStep('input')
                          setSelectedCustomPracticeLessonId(null)
                        }}
                        className={APP_BTN_SECONDARY_SMALL}
                      >
                        Изменить запрос
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {lessonsPanel === 'practiceLevelsHub' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="Уровни" onClick={() => setLessonsPanel('practiceLevel')} />
                </div>
              </div>
            )}

            {lessonsPanel === 'practiceLevel' && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  Выберите уровень, затем тема откроется внутри него. Так каталог будет расти без перегрузки меню.
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {THEORY_LEVELS.map((level) => (
                      <LessonLevelRow
                        key={level.id}
                        label={level.label}
                        onClick={
                          level.id === 'A2'
                            ? () => {
                                setPracticeCatalogLevel('A2')
                                setLessonsPanel('practiceLevelTopics')
                              }
                            : level.id === 'A1'
                              ? () => {
                                  setPracticeCatalogLevel('A1')
                                  setLessonsPanel('practiceLevelTopics')
                                }
                              : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'practiceLevelTopics' && (
              <>
                {practiceTheoryTagFilterId && catalogPracticeItemsFiltered.length === 0 ? (
                  <p className="mb-2 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                    На этом уровне нет уроков с выбранным тегом. Сбросьте фильтр на экране «Практика» или выберите другой уровень.
                  </p>
                ) : null}
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                  {catalogPracticeItemsFiltered.map((item) => (
                    <A2LessonChoiceRow
                      key={item.id}
                      label={item.label}
                      subtitle={item.short}
                      description={item.long}
                      medalDisplay={resolveLessonCardMedal(lessonProgressMap[item.id])}
                      rewardIcons={resolveLessonMenuRewardIconsFromProgress(
                        item.id,
                        lessonProgressMap[item.id]
                      )}
                      selected={item.enabled && selectedPracticeLessonId === item.id}
                      enabled={item.enabled}
                      onClick={
                        item.enabled
                          ? () => {
                              setSelectedPracticeLessonId(item.id)
                              setPracticeError(null)
                              setLessonsPanel('practice')
                            }
                          : undefined
                      }
                    />
                  ))}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'practiceFormat' && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  Формат определяет длину тренировки и плотность проверки.
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {PRACTICE_MODE_OPTIONS.map((mode) => (
                      <A2LessonChoiceRow
                        key={mode.id}
                        label={mode.title}
                        subtitle={mode.meta}
                        description={mode.description}
                        selected={selectedPracticeMode === mode.id}
                        enabled
                        onClick={() => {
                          setSelectedPracticeMode(mode.id)
                          if (mode.id === 'reference') {
                            setLessonsPanel('practiceReferenceType')
                            return
                          }
                          setLessonsPanel('practice')
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            {lessonsPanel === 'practiceReferenceType' && (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  Выберите эталонный тип упражнения. В сессии будет 7 повторов именно этого типа.
                </div>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {REFERENCE_EXERCISE_OPTIONS.map((item) => (
                      <A2LessonChoiceRow
                        key={item.id}
                        label={`#${item.challengeStep} ${item.label}`}
                        description={item.summary}
                        selected={selectedReferenceExerciseType === item.id}
                        enabled
                        onClick={() => {
                          setSelectedPracticeMode('reference')
                          setSelectedReferenceExerciseType(item.id)
                          setLessonsPanel('practice')
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
            {lessonsPanel === 'tutor' && (
              <>
                {tutorStep === 'input' && (
                <div className={MENU_GROUP_OUTER}>
                  <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                    <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                      Загрузите фото, и MyEng подскажет, что на изображении и что учить дальше.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="btn-3d-menu flex-1 rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-medium text-[var(--text)]"
                      >
                        Загрузить фото
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="btn-3d-menu flex-1 rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] font-medium text-[var(--text)]"
                      >
                        Сделать фото
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-[var(--text-muted)]">Что хотите учить</label>
                      <input
                        type="text"
                        value={tutorCustomFocus}
                        onChange={(event) => {
                          setTutorCustomFocus(event.target.value)
                          setTutorSuggestedTopics([])
                          setTutorCatalogLessonIds([])
                          setTutorIntentOptions([])
                          setSelectedTutorTopic(null)
                          setSelectedTutorIntent(null)
                          setTutorClarifyPrompt(null)
                          setTutorStep('input')
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return
                          event.preventDefault()
                          if ((!tutorImageDataUrl && !tutorCustomFocus.trim()) || tutorLoading) return
                          void handleTutorAnalyze()
                        }}
                        placeholder="Например: has, to be, Present Simple"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleTutorFile(event.target.files?.[0] ?? null)}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => handleTutorFile(event.target.files?.[0] ?? null)}
                    />
                    {tutorImageDataUrl && (
                      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                        <Image
                          src={tutorImageDataUrl}
                          alt="Фото для анализа"
                          width={1200}
                          height={800}
                          unoptimized
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    )}
                    {tutorImageError && (
                      <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                        {tutorImageError}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={(!tutorImageDataUrl && !tutorCustomFocus.trim()) || tutorLoading}
                      onClick={() => void handleTutorAnalyze()}
                      className={MENU_PRIMARY_CTA_CLASS}
                    >
                      {tutorLoading ? 'Анализируем...' : 'Анализировать'}
                    </button>
                    {tutorClarifyPrompt && (
                      <p className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-[13px] text-[var(--status-warning-text)]">
                        {tutorClarifyPrompt}
                      </p>
                    )}
                  </div>
                </div>
                )}

                {tutorStep === 'select' && tutorSuggestedTopics.length > 0 && (
                  <div className={MENU_GROUP_OUTER}>
                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                        Выберите тему и нажмите «Начать».
                      </p>
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] p-2">
                        {tutorSuggestedTopics.map((topic, topicIndex) => {
                          const intent =
                            tutorIntentOptions[topicIndex] ?? tutorIntentOptions.find((item) => item.title === topic)
                          return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setSelectedTutorTopic(topic)
                              setSelectedTutorIntent(intent ?? null)
                            }}
                            className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[14px] text-[var(--text)] hover:bg-[var(--border)]/20"
                          >
                            <span className="pr-2">
                              <span className="block">{topic}</span>
                              <span className="block text-[12px] leading-snug text-[var(--text-muted)]">
                                {intent?.goalRu ?? tutorTopicHintsByTopic[topic] ?? 'Выберите самый близкий вариант к вашему запросу.'}
                              </span>
                            </span>
                            {selectedTutorTopic === topic ? (
                              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            ) : (
                              <span className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                          </button>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={!selectedTutorTopic || !onOpenTutorLesson || tutorStartingLesson}
                        onClick={async () => {
                          if (!selectedTutorTopic || !onOpenTutorLesson) return
                          setTutorStartingLesson(true)
                          try {
                            const topicIndex = tutorSuggestedTopics.indexOf(selectedTutorTopic)
                            const catalogLessonId =
                              tutorCatalogLessonIds.length === tutorSuggestedTopics.length && topicIndex >= 0
                                ? tutorCatalogLessonIds[topicIndex]
                                : undefined
                            await onOpenTutorLesson({
                              requestedTopic: selectedTutorTopic,
                              originalQuery: tutorCustomFocus.trim() || undefined,
                              selectedIntent: selectedTutorIntent ?? undefined,
                              analysisSummary: tutorResult?.whatISee.summaryRu,
                              catalogLessonId,
                            })
                          } finally {
                            setTutorStartingLesson(false)
                          }
                        }}
                        className={
                          tutorStartingLesson
                            ? 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--status-info-bg)] px-4 py-3 text-center text-base font-semibold text-[var(--status-info-text)] opacity-95'
                            : MENU_PRIMARY_CTA_CLASS
                        }
                      >
                        {tutorStartingLesson ? (
                          <span className="text-sm italic">Engvo составляет урок...</span>
                        ) : (
                          'Начать'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTutorCustomFocus('')
                          setTutorStep('input')
                        }}
                        className={APP_BTN_SECONDARY_SMALL}
                      >
                        Изменить запрос
                      </button>
                    </div>
                  </div>
                )}

                {tutorResult && (
                  <>
                    <div className={MENU_GROUP_OUTER}>
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                        <h3 className="text-[15px] font-semibold text-[var(--text)]">Что вижу</h3>
                        <p className="text-[14px] leading-relaxed text-[var(--text)]">{tutorResult.whatISee.summaryRu}</p>
                        {tutorResult.whatISee.objects.length > 0 && (
                          <ul className="space-y-1 text-[13px] text-[var(--text-muted)]">
                            {tutorResult.whatISee.objects.map((obj, idx) => (
                              <li key={`obj-${idx}`}>- {obj.nameRu}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className={MENU_GROUP_OUTER}>
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                        <h3 className="text-[15px] font-semibold text-[var(--text)]">Что учить</h3>
                        {tutorResult.whatToLearn.focus.map((focus, idx) => (
                          <p key={`focus-${idx}`} className="text-[13px] leading-relaxed text-[var(--text)]">
                            <strong>{focus.topic}:</strong> {focus.why}
                          </p>
                        ))}
                        {tutorResult.whatToLearn.vocabulary.length > 0 && (
                          <ul className="space-y-1 text-[13px] text-[var(--text-muted)]">
                            {tutorResult.whatToLearn.vocabulary.map((item, idx) => (
                              <li key={`vocab-${idx}`}>
                                - {item.word} - {item.translation}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[13px] leading-relaxed text-[var(--text)]">
                          <strong>Подсказка:</strong> {tutorResult.whatToLearn.practiceHint}
                        </p>
                        <p className="text-[13px] leading-relaxed text-[var(--text)]">
                          <strong>Дальше:</strong> {tutorResult.nextStepHint}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {menuView === 'profile' && (
          <div className="space-y-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Профиль</p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
                {rewardsState?.profile.name?.trim() ? rewardsState.profile.name : 'Профиль не заполнен'}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Уровень английского: {rewardsState?.profile.englishLevel ?? 'not_set'}
              </p>
              <p className="text-[13px] text-[var(--text-muted)]">
                Регистрация: {rewardsState?.profile.registrationDate ?? '-'}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Редактировать</p>
              <div className="mt-2 space-y-2">
                <label className="block">
                  <span className="text-[12px] text-[var(--text-muted)]">Имя</span>
                  <input
                    type="text"
                    value={profileDraft.name}
                    onChange={(event) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Введите имя"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] text-[var(--text-muted)]">Уровень английского</span>
                  <select
                    value={profileDraft.englishLevel}
                    onChange={(event) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        englishLevel: event.target.value as RewardsState['profile']['englishLevel'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="not_set">Не указан</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[12px] text-[var(--text-muted)]">Язык</span>
                    <select
                      value={profileDraft.language}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          language: event.target.value as RewardsState['profile']['preferences']['language'],
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-[var(--text-muted)]">Тема профиля</span>
                    <select
                      value={profileDraft.theme}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          theme: event.target.value as RewardsState['profile']['preferences']['theme'],
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="default">Default</option>
                      <option value="futuristic">Futuristic</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--menu-control-bg)] px-3 py-2 text-[13px] text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={profileDraft.notifications}
                    onChange={(event) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        notifications: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  Уведомления включены
                </label>
                <button
                  type="button"
                  onClick={saveProfileDraft}
                  disabled={!rewardsState || !onRewardsStateChange || !hasProfileChanges}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-[14px] font-semibold text-[var(--accent-text)] disabled:opacity-50"
                >
                  Сохранить профиль
                </button>
                {profileSavedMessage ? <p className="text-[12px] text-emerald-600">{profileSavedMessage}</p> : null}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Игровая сводка</p>
              <p className="emoji-line mt-1 text-[13px] text-[var(--text)]">
                Уровень {rewardsState?.progress.level ?? 1} • ⭐ {rewardsState?.progress.totalXP ?? 0} • {DAILY_STREAK_GLYPH}{' '}
                {rewardsState?.progress.dailyStreak ?? 0}
              </p>
              <p className="emoji-line mt-1 text-[12px] text-[var(--text-muted)]">
                🎫 {rewardsState?.currencies.tickets ?? 0} • 🪙 {rewardsState?.currencies.coins ?? 0} • 💎 {rewardsState?.currencies.gems ?? 0}
              </p>
            </div>
          </div>
        )}

        {menuView === 'aiChat' && aiChatPanel === 'summary' && (
          <>
            <div className={MENU_GROUP_OUTER}>
              <div className={MENU_GROUP_CLASS}>
              <MenuSettingRow label="Режим" value={modeLabel} onClick={() => setAiChatPanel('mode')} />
              <MenuSettingRow label="Стиль общения" value={audienceLabel} onClick={() => setAiChatPanel('audience')} />
              {settings.mode !== 'communication' && (
                <MenuSettingRow label="Время" value={tenseLabel} onClick={() => setAiChatPanel('tense')} />
              )}
              {settings.mode === 'translation' && (
                <MenuSettingRow
                  label="Тип предложений"
                  value={sentenceTypeLabel}
                  onClick={() => setAiChatPanel('sentenceType')}
                />
              )}
              {(settings.mode === 'dialogue' || settings.mode === 'translation') && (
                <MenuSettingRow label="Тема" value={topicLabel} onClick={() => setAiChatPanel('topic')} />
              )}
              <MenuSettingRow label="Уровень" value={levelLabel} onClick={() => setAiChatPanel('level')} />
              </div>
            </div>

            {onStartHomeChat && (
              <div className="pt-2">
                <button type="button" onClick={onStartHomeChat} className={MENU_PRIMARY_CTA_CLASS}>
                  {settings.mode === 'dialogue'
                    ? 'Начать диалог'
                    : settings.mode === 'translation'
                      ? 'Начать тренировку перевода'
                      : 'Начать общение'}
                </button>
              </div>
            )}
          </>
        )}

        {menuView === 'aiChat' && aiChatPanel === 'mode' && (
          <PickerList
            options={MODE_OPTIONS}
            value={settings.mode}
            onSelect={(id) => {
              update({ mode: id })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'audience' && (
          <PickerList
            options={AUDIENCE_OPTIONS}
            value={settings.audience}
            onSelect={(id) => {
              applyAudienceSelection(id as Settings['audience'])
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'tense' && (
          <PickerList
            options={tenseOptions.map((t) => ({ id: t.id as TenseId, label: t.label }))}
            value={settings.tenses[0] ?? 'present_simple'}
            onSelect={(id) => {
              update({ tenses: [id] })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'sentenceType' && (
          <PickerList
            options={SENTENCE_TYPES.map((t) => ({ id: t.id, label: t.label }))}
            value={settings.sentenceType}
            onSelect={(id) => {
              update({ sentenceType: id as SentenceType })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'topic' && (
          <PickerList
            options={topicOptions.map((t) => ({ id: t.id, label: t.label }))}
            value={settings.topic}
            onSelect={(id) => {
              applyTopicSelection(id as TopicId)
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'aiChat' && aiChatPanel === 'level' && (
          <PickerList
            options={levelOptions.map((l) => ({ id: l.id, label: l.label }))}
            value={settings.level}
            onSelect={(id) => {
              const newLevel = id as LevelId
              const base = getAllowedTensesForLevel(newLevel)
              const allowed = isChild ? base.filter((tid) => CHILD_TENSE_SET.has(tid)) : base
              const tenses = normalizeSingleTenseSelection(settings.tenses, allowed, 'present_simple')
              update({ level: newLevel, tenses })
              setAiChatPanel('summary')
            }}
          />
        )}

        {menuView === 'settings' && settingsPanel === 'summary' && (
          <div className={MENU_GROUP_OUTER}>
            <div className={MENU_GROUP_CLASS}>
              <MenuSettingRow label="Тема" value={themeLabel} onClick={() => setSettingsPanel('theme')} />
              <MenuSettingRow label="ИИ" value={providerLabel} onClick={() => setSettingsPanel('provider')} />
              <VoiceSummaryRow
                label="Голос"
                voiceId={settings.voiceId}
                preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
                onOpen={() => setSettingsPanel('voice')}
              />
              <MenuSettingRow
                label="Скорость"
                value={practiceTtsSpeedLabel}
                onClick={() => setSettingsPanel('playbackSpeed')}
              />
            </div>
          </div>
        )}

        {menuView === 'settings' && settingsPanel === 'playbackSpeed' && (
          <PickerList
            options={PRACTICE_TTS_SPEED_PRESETS.map((preset, index) => ({
              id: String(index),
              label: preset.label,
            }))}
            value={String(practiceTtsSpeedDefaultIndex)}
            onSelect={(id) => {
              onPracticeTtsSpeedDefaultChange?.(Number.parseInt(id, 10))
              setSettingsPanel('summary')
            }}
          />
        )}

        {menuView === 'settings' && settingsPanel === 'provider' && (
          <PickerList
            options={PROVIDER_OPTIONS}
            value={settings.provider}
            onSelect={(id) => {
              update({ provider: id })
              setSettingsPanel('summary')
            }}
          />
        )}

        {menuView === 'settings' && settingsPanel === 'voice' && (
          <VoicePickerPanel
            value={settings.voiceId}
            onChange={(voiceId) => update({ voiceId })}
            preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
          />
        )}

        {menuView === 'settings' && settingsPanel === 'theme' && <ThemePickerPanel />}

        {menuView === 'progress' && (() => {
          const focusGoal = pickFocusModeGoal(rewardsState)
          const goalPercent =
            focusGoal && focusGoal.goalTarget > 0
              ? Math.min(100, Math.round((focusGoal.goalProgress / focusGoal.goalTarget) * 100))
              : 0
          const dailyStreak = rewardsState?.progress.dailyStreak ?? 0
          const bestDailyStreak = rewardsState?.progress.bestDailyStreak ?? dailyStreak
          const streakProgressCopy = formatStreakProgressCopy(rewardsState ?? createDefaultRewardsState())
          const lessonProgressRows = Object.values(loadLessonProgressMap())
          const bestPracticeOpportunity = pickBestPracticeRewardOpportunity(lessonProgressRows)
          return (
          <div className="space-y-2">
            {bestPracticeOpportunity ? (
              <div className="rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-3">
                <p className="text-[13px] font-medium text-[var(--status-info-text)]">Лучший заработок</p>
                <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">{bestPracticeOpportunity.label}</p>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  {bestPracticeOpportunity.reason === 'gems_pending'
                    ? 'Золото уже есть - практика закрепит 💎.'
                    : bestPracticeOpportunity.reason === 'gold_ring'
                      ? featureFlags.practiceTopicCupsV1
                        ? 'Золотая медаль + 5 практик - кубок темы 🏆.'
                        : 'Золотая медаль + практики 📝 - лучший путь к камням.'
                      : 'Практика по пройденному уроку даёт XP к уровню.'}
                </p>
                {onOpenPracticeSession ? (
                  <button
                    type="button"
                    className={`${MENU_PRIMARY_CTA_CLASS} mt-2 w-full`}
                    onClick={() =>
                      void onOpenPracticeSession({
                        lessonId: bestPracticeOpportunity.lessonId,
                        mode: 'balanced',
                        entrySource: 'menu',
                      })
                    }
                  >
                    Открыть практику
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
                <p className="emoji-line text-[18px] leading-none">{DAILY_STREAK_GLYPH}</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">{dailyStreak}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{DAILY_STREAK_LABEL}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
                <p className="emoji-line text-[18px] leading-none">⭐</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text)]">
                  {rewardsState?.progress.level ?? 1}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{rewardsState?.progress.totalXP ?? 0} XP</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-2 py-2 text-center">
                <p className="text-[10px] font-medium text-[var(--text-muted)]">Цель дня</p>
                <p className="mt-0.5 text-[12px] font-semibold leading-tight text-[var(--text)]">
                  {focusGoal ? `${focusGoal.goalProgress}/${focusGoal.goalTarget}` : '-'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{focusGoal?.label ?? 'Готово'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-3">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">{DAILY_STREAK_LABEL}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="emoji-line text-[32px] leading-none" aria-hidden>
                  {DAILY_STREAK_GLYPH}
                </span>
                <div>
                  <p className="text-[28px] font-bold tabular-nums leading-none text-[var(--text)]">{dailyStreak}</p>
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">Рекорд: {bestDailyStreak} дн.</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-[var(--text-muted)]">{nextBestAction.streak}</p>
              {streakProgressCopy.bonusTodayLabel ? (
                <p className="mt-2 text-[13px] font-medium text-[var(--text)]">
                  Бонус за первый шаг сегодня: {streakProgressCopy.bonusTodayLabel}
                </p>
              ) : null}
              {streakProgressCopy.introLine ? (
                <p className="mt-2 text-[12px] text-[var(--text-muted)]">{streakProgressCopy.introLine}</p>
              ) : null}
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">{streakProgressCopy.statusLine}</p>
              {streakProgressCopy.nextThresholdLine ? (
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">{streakProgressCopy.nextThresholdLine}</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Общий прогресс</p>
              <p className="emoji-line mt-1 text-[15px] font-semibold text-[var(--text)]">
                Уровень {rewardsState?.progress.level ?? 1} • ⭐ {rewardsState?.progress.totalXP ?? 0}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                До следующего уровня: {rewardsState?.progress.currentLevelXP ?? 0}/{rewardsState?.progress.xpToNextLevel ?? 100}
              </p>
            </div>
            {(() => {
              const lessonProgressMap = loadLessonProgressMap()
              const medalList = Object.values(lessonProgressMap).map((row) => row.medal)
              const medals = aggregateMedals(medalList, 4)
              const badgesEarned = Object.values(lessonProgressMap).filter((row) => row.lessonBadgeEarned).length
              const practiceRows = Object.values(lessonProgressMap).filter((row) => row.medal)
              const cupStats = featureFlags.practiceTopicCupsV1 ? countTopicCupStats() : null
              return (
                <>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
                  <p className="text-[13px] font-medium text-[var(--text-muted)]">Практика по темам</p>
                  {cupStats ? (
                    <>
                      <p className="emoji-line mt-1 text-[14px] font-semibold text-[var(--text)]">
                        🏆 тем: {cupStats.cups}/{cupStats.withMedal || 0}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                        Тема сдана 🏆 - золотая медаль в уроке и 5 практик (от 50% в сессии).
                      </p>
                    </>
                  ) : null}
                  {practiceRows.length === 0 ? (
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">Сначала получите медаль в уроке.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-muted)]">
                      {practiceRows.map((row) => {
                        const topic = getLessonTopicById(row.lessonId)?.title ?? `Урок ${row.lessonId}`
                        const practiceProgress = getPracticeTopicProgress(row.lessonId)
                        return (
                          <li key={`practice-${row.lessonId}`} className="flex items-center justify-between gap-2">
                            <span>{topic}</span>
                            <span className="emoji-line shrink-0 font-medium text-[var(--text)]">
                              {formatPracticeProgressBadge(practiceProgress, row.medal)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
                  <p className="text-[13px] font-medium text-[var(--text-muted)]">Награды уроков</p>
                  <p className="emoji-line mt-1 text-[14px] text-[var(--text)]">
                    🥇 {medals.gold} · 🥈 {medals.silver} · 🥉 {medals.bronze} · Золото {medals.gold}/4
                  </p>
                  {cupStats ? (
                    <p className="emoji-line mt-1 text-[14px] text-[var(--text)]">
                      Кубки тем: {cupStats.cups}/{cupStats.withMedal || 0}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[13px] text-[var(--text-muted)]">Бейджи: {badgesEarned}/4</p>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--text-muted)]">
                    {['1', '2', '3', '4'].map((lessonId) => {
                      const progress = lessonProgressMap[lessonId]
                      const topic = getLessonTopicById(lessonId)?.title ?? `Урок ${lessonId}`
                      const badge = getLessonBadgeDefinition(lessonId)
                      if (!progress) {
                        return (
                          <li key={lessonId}>
                            {topic}: не начат
                          </li>
                        )
                      }
                      const cycleLabel =
                        progress.cycle1Closed && !progress.medal
                          ? ' · цикл 1 закрыт'
                          : progress.cycle1Started && !progress.medal
                            ? ' · в процессе'
                            : ''
                      return (
                        <li key={lessonId}>
                          {topic}: {progress.medal ?? (progress.cycle1Closed ? 'начат' : '-')} · {progress.corePercent ?? 0}% core
                          {cycleLabel}
                          {badge && !progress.lessonBadgeEarned ? ` · бейдж ${progress.lessonBadgeCriteriaMet?.length ?? 0}/3` : ''}
                          {progress.lessonBadgeEarned ? ' · бейдж ✓' : ''}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                </>
              )
            })()}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Цели режимов</p>
              {(['communication', 'engvo'] as const).map((mode) => {
                const goal = rewardsState?.modeGoals[mode]
                const label = mode === 'communication' ? 'Общение' : 'Звонок'
                const statusLabel =
                  goal?.status === 'completed'
                    ? 'Завершено'
                    : goal?.status === 'in_progress'
                      ? 'В процессе'
                      : goal?.status === 'abandoned'
                        ? 'Прервано'
                        : 'Не начато'
                return (
                  <div key={mode} className="mt-1 rounded-md border border-[var(--border)]/70 bg-[var(--menu-control-bg)] px-2.5 py-2">
                    <p className="text-[13px] text-[var(--text)]">
                      {label}: {goal?.goalProgress ?? 0}/{goal?.goalTarget ?? 7}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      Статус: {statusLabel}
                      {goal?.assigned ? ' • Задание' : ''}
                      {goal?.estimatedDurationMinutes ? ` • ~${goal.estimatedDurationMinutes} мин` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Цель дня</p>
              <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">{nextBestAction.title}</p>
              <p className="mt-1 text-[13px] text-[var(--text)]">{nextBestAction.detail}</p>
              {focusGoal && focusGoal.goalTarget > 0 ? (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--menu-control-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                      style={{ width: `${goalPercent}%` }}
                      role="progressbar"
                      aria-valuenow={focusGoal.goalProgress}
                      aria-valuemin={0}
                      aria-valuemax={focusGoal.goalTarget}
                      aria-label={`${focusGoal.label}: ${focusGoal.goalProgress} из ${focusGoal.goalTarget}`}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                    {focusGoal.label}: {focusGoal.goalProgress}/{focusGoal.goalTarget}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--menu-card-bg)] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Статистика</p>
              <p className="mt-1 text-[13px] text-[var(--text)]">
                Правильных ответов (диалог): {dialogueCorrectAnswers}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--text)]">
                Запросов: {usage.limit > 0 ? `${usage.used} / ${usage.limit}` : `${usage.used}`}
              </p>
            </div>
          </div>
          )
        })()}

        {menuView === 'myPlan' && (
          <MyPlanPanel
            recommendations={myPlanRecommendations}
            settings={settings}
            onOpenLearningLesson={onOpenLearningLesson}
            onOpenPracticeSession={onOpenPracticeSession}
            onOpenVocabularyWorlds={onOpenVocabularyWorlds}
            onMenuViewChange={() => onMenuViewChange('lessons')}
          />
        )}
      </div>
    </div>
  )
}

function LessonLevelRow({ label, onClick }: { label: string; onClick?: () => void }) {
  if (onClick) {
    return <MenuNavRow label={label} onClick={onClick} />
  }
  return (
    <div className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 last:border-b-0">
      <span className={MENU_ROW_LABEL_CLASS}>{label}</span>
      <span className="text-[13px] leading-normal text-[var(--text-muted)]">Скоро</span>
    </div>
  )
}

function LessonTopicRow({ label, onClick }: { label: string; onClick?: () => void }) {
  if (onClick) {
    return <MenuNavRow label={label} onClick={onClick} />
  }
  return (
    <div className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 last:border-b-0">
      <span className={MENU_ROW_LABEL_CLASS}>{label}</span>
      <span className="text-[13px] leading-normal text-[var(--text-muted)]">Скоро</span>
    </div>
  )
}

function A2LessonChoiceRow({
  label,
  subtitle,
  description,
  medalDisplay,
  rewardIcons,
  selected,
  enabled,
  onClick,
}: {
  label: string
  subtitle?: string
  description?: string
  medalDisplay?: LessonCardMedalDisplay | null
  rewardIcons?: LessonMenuRewardIconsState | null
  selected: boolean
  enabled: boolean
  onClick?: () => void
}) {
  const showSubtitle =
    Boolean(subtitle?.trim()) &&
    normalizeMenuLabelKey(subtitle!) !== normalizeMenuLabelKey(label)
  const showDescription = Boolean(description?.trim())

  if (!enabled) {
    return (
      <div className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 last:border-b-0">
        <span className="min-w-0">
          <span className="block text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
          {showSubtitle ? (
            <span className="mt-0.5 block text-[13px] font-medium leading-snug text-slate-700">{subtitle}</span>
          ) : null}
          {showDescription ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{description}</span>
          ) : null}
        </span>
        <span className="text-[13px] leading-normal text-[var(--text-muted)]">Скоро</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 block text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
          <span className="flex shrink-0 items-center gap-2.5 pt-px">
            <LessonMenuRewardIcons rewardIcons={rewardIcons ?? null} medalDisplay={medalDisplay ?? null} size="md" />
            {selected ? (
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
            ) : (
              <span className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </span>
        </span>
        {showSubtitle ? (
          <span className="mt-0.5 block text-[13px] font-medium leading-snug text-slate-700">{subtitle}</span>
        ) : null}
        {showDescription ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{description}</span>
        ) : null}
      </span>
    </button>
  )
}

function AccentLessonRow({ label, lessonId, onClick }: { label: string; lessonId: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="min-w-0 text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
      <AccentProgressBadge lessonId={lessonId} />
    </button>
  )
}

function MenuSettingRow({
  label,
  value,
  trailing,
  onClick,
}: {
  label: string
  value: string
  trailing?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="shrink-0 text-sm font-medium leading-normal text-[var(--text-muted)]">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      <span
        className={`emoji-line min-w-0 flex-1 truncate-x whitespace-nowrap text-right text-[var(--text)] ${MENU_CHOICE_TEXT_CLASS}`}
      >
        {value}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  )
}

function VoiceSummaryRow({
  label,
  voiceId,
  preferredLangPrefixes,
  onOpen,
}: {
  label: string
  voiceId: string
  preferredLangPrefixes: string[]
  onOpen: () => void
}) {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  React.useEffect(() => {
    const list = () => setVoices(window.speechSynthesis.getVoices())
    window.speechSynthesis.onvoiceschanged = list
    list()
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])
  const display =
    !voiceId
      ? 'По умолчанию'
      : (() => {
          const allowed = voices.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p)))
          const v = allowed.find((x) => x.voiceURI === voiceId)
          return v ? `${v.name} (${v.lang})` : 'По умолчанию'
        })()

  return <MenuSettingRow label={label} value={display} onClick={onOpen} />
}

function PickerList<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { id: T; label: string }[]
  value: T
  onSelect: (id: T) => void
}) {
  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
        >
          <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
            {opt.label}
          </span>
          {value === opt.id ? (
            <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      ))}
      </div>
    </div>
  )
}

function ThemePickerPanel() {
  const { theme, setTheme } = useTheme()

  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
        {THEME_OPTIONS.map((themeOption) => {
          const selected = theme === themeOption.id
          return (
            <button
              key={themeOption.id}
              type="button"
              onClick={() => setTheme(themeOption.id)}
              className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
              aria-pressed={selected}
            >
              <span className="min-w-0 flex-1 text-left leading-snug">
                <span className="block text-[15px] font-normal text-[var(--text)]">{themeOption.name}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--text-muted)]">
                  {themeOption.description}
                </span>
              </span>
              {selected ? (
                <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VoicePickerPanel({
  value,
  onChange,
  preferredLangPrefixes,
}: {
  value: string
  onChange: (id: string) => void
  preferredLangPrefixes: string[]
}) {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const list = () => setVoices(window.speechSynthesis.getVoices())
    window.speechSynthesis.onvoiceschanged = list
    list()
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const list = React.useMemo(() => (mounted ? voices : []), [mounted, voices])
  const finalList = React.useMemo(
    () => list.filter((v) => preferredLangPrefixes.some((p) => v.lang.startsWith(p))),
    [list, preferredLangPrefixes]
  )

  const voicePrefixKey = preferredLangPrefixes.join('|')
  React.useEffect(() => {
    if (!mounted || !value || finalList.length === 0) return
    if (!finalList.some((v) => v.voiceURI === value)) onChange('')
  }, [mounted, value, finalList, voicePrefixKey, onChange])

  if (!mounted && list.length === 0) {
    return <div className="px-3 py-2 text-[13px] leading-normal text-[var(--text-muted)]">Загрузка голосов…</div>
  }

  return (
    <div className={MENU_GROUP_OUTER}>
      <div className={MENU_GROUP_CLASS}>
      <button
        type="button"
        onClick={() => onChange('')}
        className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
      >
        <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
          По умолчанию
        </span>
        {!value ? (
          <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
      {finalList.map((v) => (
        <button
          key={v.voiceURI}
          type="button"
          onClick={() => onChange(v.voiceURI)}
          className="flex w-full min-h-[44px] items-center justify-end gap-1 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
        >
          <span className={`min-w-0 flex-1 text-right leading-normal text-[var(--text)] pr-1 ${MENU_CHOICE_TEXT_CLASS}`}>
            {v.name} ({v.lang})
          </span>
          {value === v.voiceURI ? (
            <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      ))}
      </div>
    </div>
  )
}

/** Строка меню для тега теории: RU основной, EN второй строкой; опционально категория в meta. */
function TheoryTagMenuRow({
  primary,
  secondary,
  meta,
  onClick,
}: {
  primary: string
  secondary: string
  meta?: string
  onClick: () => void
}) {
  const showSecondary =
    secondary.trim().length > 0 &&
    normalizeMenuLabelKey(secondary) !== normalizeMenuLabelKey(primary)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"
    >
      <span className="min-w-0 flex-1 text-left leading-snug">
        <span className="block text-[15px] font-normal text-[var(--text)]">{primary}</span>
        {showSecondary ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-[var(--text-muted)]">{secondary}</span>
        ) : null}
        {meta ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-muted)]">{meta}</span>
        ) : null}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  )
}

function normalizeMenuLabelKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function MenuNavRow({
  label,
  onClick,
  variant = 'default',
}: {
  label: string
  onClick: () => void
  variant?: 'default' | 'primary'
}) {
  if (variant === 'primary') {
    return (
      <button type="button" onClick={onClick} className={MENU_PRIMARY_CTA_CLASS}>
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left text-[15px] font-normal leading-normal text-[var(--text)] transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"
    >
      <span className={`min-w-0 flex-1 text-left ${MENU_ROW_LABEL_CLASS}`}>{label}</span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
    </button>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function CloseMenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

