'use client'

import React from 'react'
import { manropeHome } from '@/lib/manropeHome'
import { TOPICS, LEVELS, TENSES, SENTENCE_TYPES, CHILD_TENSES } from '@/lib/constants'
import { getAllowedTensesForLevel, normalizeSingleTenseSelection } from '@/lib/levelAllowedTenses'
import type {
  Settings,
  UsageInfo,
  AppMode,
  AiProvider,
  OpenAiChatPreset,
  TenseId,
  SentenceType,
  TopicId,
  LevelId,
} from '@/lib/types'
import type { AiChatPanel } from '@/lib/aiChatPanel'
import { MENU_PRIMARY_CTA_CLASS } from '@/lib/homeCtaStyles'
import type { ImageAnalysisResult } from '@/lib/types'

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

export type MenuView = 'root' | 'lessons' | 'aiChat' | 'settings' | 'progress' | 'profile'

export type { AiChatPanel }

export type LessonsPanel = 'summary' | 'theory' | 'a2' | 'tutor'

const AI_CHAT_PANEL_TITLE: Record<AiChatPanel, string> = {
  summary: 'Чат с MyEng',
  mode: 'Режим',
  audience: 'Стиль общения',
  tense: 'Время',
  sentenceType: 'Тип предложений',
  topic: 'Тема',
  level: 'Уровень',
}

type SettingsMenuPanel = 'summary' | 'provider' | 'openAiModel' | 'voice'

const SETTINGS_PANEL_TITLE: Record<SettingsMenuPanel, string> = {
  summary: 'Настройки',
  provider: 'ИИ',
  voice: 'Голос',
}

const LESSONS_PANEL_TITLE: Record<LessonsPanel, string> = {
  summary: 'Уроки',
  theory: 'Теория',
  a2: 'A2',
  tutor: 'Репетитор',
}

const THEORY_LEVELS: { id: string; label: string }[] = [
  { id: 'A1', label: 'A1 - начальный' },
  { id: 'A2', label: 'A2 - элементарный' },
  { id: 'B1', label: 'B1 - средний' },
  { id: 'B2', label: 'B2 - выше среднего' },
]

const A2_THEORY_ITEMS: { id: string; label: string; enabled: boolean }[] = [
  { id: '1', label: 'It’s / It’s time to', enabled: true },
  { id: '2', label: 'Урок 2', enabled: false },
]

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

const OPENAI_MODEL_OPTIONS: { id: OpenAiChatPreset; label: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (как раньше)' },
  { id: 'gpt-5.4-mini-none', label: 'GPT-5.4 mini · reasoning none' },
  { id: 'gpt-5.4-mini-low', label: 'GPT-5.4 mini · reasoning low' },
]

const MENU_GROUP_CLASS =
  'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_1px_4px_rgba(0,0,0,0.07)]'

/** Вертикальный воздух вокруг карточек списков. */
const MENU_GROUP_OUTER = 'py-1'

export const FIELD_SELECT =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] pl-2 py-1 min-h-[40px] text-[13px] leading-normal text-[var(--text)] touch-manipulation select-chevron'

const MENU_VALUE_BOX =
  'w-full min-w-0 rounded border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 min-h-[40px] text-[15px] leading-normal text-[var(--text)] flex items-center justify-end'

export const MENU_FIELD_LABEL =
  'shrink-0 w-[6.3rem] text-[13px] font-medium leading-normal text-[var(--text-muted)] break-words'


const MENU_CHOICE_TEXT_CLASS =
  "text-[15px] font-normal [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif]"

const VOICE_DROPDOWN_LANG_PREFIXES: string[] = ['en']

export interface MenuSectionPanelsProps {
  menuView: MenuView
  onMenuViewChange: (v: MenuView) => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
  usage: UsageInfo
  dialogueCorrectAnswers: number
  idPrefix?: string
  className?: string
  homeLayout?: boolean
  onStartHomeChat?: () => void
  onGoHome?: () => void
  /** Стартовый экран: синхронизация подпанели «Чат с MyEng» для подсказки под меню. */
  onAiChatPanelChange?: (panel: AiChatPanel) => void
  /** Открыть урок из ветки «Обучение». */
  onOpenLearningLesson?: (lessonId: string) => void
  onOpenTutorLesson?: (request: { requestedTopic: string; analysisSummary?: string }) => Promise<void> | void
  /** Стартовый уровень lessons-панели при открытии меню. */
  initialLessonsPanel?: LessonsPanel
}

export default function MenuSectionPanels({
  menuView,
  onMenuViewChange,
  settings,
  onSettingsChange,
  usage,
  dialogueCorrectAnswers,
  idPrefix = 'menu-',
  className,
  homeLayout = false,
  onStartHomeChat,
  onGoHome,
  onAiChatPanelChange,
  onOpenLearningLesson,
  onOpenTutorLesson,
  initialLessonsPanel,
}: MenuSectionPanelsProps) {
  const pid = (suffix: string) => `${idPrefix}${suffix}`

  const [aiChatPanel, setAiChatPanel] = React.useState<AiChatPanel>('summary')
  const [settingsPanel, setSettingsPanel] = React.useState<SettingsMenuPanel>('summary')
  const [lessonsPanel, setLessonsPanel] = React.useState<LessonsPanel>('summary')
  const defaultA2LessonId = React.useMemo(
    () => A2_THEORY_ITEMS.find((item) => item.enabled)?.id ?? null,
    []
  )
  const [selectedA2LessonId, setSelectedA2LessonId] = React.useState<string | null>(defaultA2LessonId)
  const [tutorImageDataUrl, setTutorImageDataUrl] = React.useState<string | null>(null)
  const [tutorCustomFocus, setTutorCustomFocus] = React.useState('')
  const [tutorImageError, setTutorImageError] = React.useState<string | null>(null)
  const [tutorLoading, setTutorLoading] = React.useState(false)
  const [tutorResult, setTutorResult] = React.useState<ImageAnalysisResult | null>(null)
  const [tutorSuggestedTopics, setTutorSuggestedTopics] = React.useState<string[]>([])
  const [tutorTopicHintsByTopic, setTutorTopicHintsByTopic] = React.useState<Record<string, string>>({})
  const [selectedTutorTopic, setSelectedTutorTopic] = React.useState<string | null>(null)
  const [tutorClarifyPrompt, setTutorClarifyPrompt] = React.useState<string | null>(null)
  const [tutorStep, setTutorStep] = React.useState<'input' | 'select'>('input')
  const [tutorStartingLesson, setTutorStartingLesson] = React.useState(false)
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (menuView !== 'aiChat') setAiChatPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (menuView !== 'settings') setSettingsPanel('summary')
  }, [menuView])

  React.useEffect(() => {
    if (menuView !== 'lessons') setLessonsPanel('summary')
  }, [menuView])

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
    if (menuView !== 'lessons') return
    if (!initialLessonsPanel) return
    setLessonsPanel(initialLessonsPanel)
  }, [menuView, initialLessonsPanel])

  React.useEffect(() => {
    if (menuView === 'aiChat') onAiChatPanelChange?.(aiChatPanel)
  }, [menuView, aiChatPanel, onAiChatPanelChange])

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

  const modeLabel = MODE_OPTIONS.find((m) => m.id === settings.mode)?.label ?? settings.mode
  const audienceLabel = AUDIENCE_OPTIONS.find((a) => a.id === settings.audience)?.label ?? settings.audience
  const levelLabel = levelOptions.find((l) => l.id === settings.level)?.label ?? settings.level
  const providerLabel = PROVIDER_OPTIONS.find((p) => p.id === settings.provider)?.label ?? settings.provider
  const openAiModelLabel =
    OPENAI_MODEL_OPTIONS.find((p) => p.id === (settings.openAiChatPreset ?? 'gpt-4o-mini'))?.label ??
    settings.openAiChatPreset ??
    'gpt-4o-mini'
  const tenseLabel =
    tenseOptions.find((t) => t.id === (settings.tenses[0] ?? 'present_simple'))?.label ??
    TENSES.find((t) => t.id === (settings.tenses[0] ?? 'present_simple'))?.label ??
    settings.tenses[0]
  const sentenceTypeLabel =
    SENTENCE_TYPES.find((t) => t.id === settings.sentenceType)?.label ?? settings.sentenceType
  const topicLabel = topicOptions.find((t) => t.id === settings.topic)?.label ?? settings.topic

  const handleMenuBack = () => {
    if (menuView === 'lessons' && lessonsPanel !== 'summary') {
      if (lessonsPanel === 'a2') {
        setLessonsPanel('theory')
        return
      }
      if (lessonsPanel === 'tutor') {
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
      if (settingsPanel === 'openAiModel') {
        setSettingsPanel('summary')
        return
      }
      setSettingsPanel('summary')
      return
    }
    onMenuViewChange('root')
  }

  const rootClass =
    className ??
    (homeLayout ? 'flex min-h-0 flex-col' : 'flex min-h-0 flex-1 flex-col')

  const headerTitle =
    menuView === 'lessons'
      ? LESSONS_PANEL_TITLE[lessonsPanel]
      : menuView === 'aiChat'
        ? AI_CHAT_PANEL_TITLE[aiChatPanel]
        : menuView === 'settings'
          ? SETTINGS_PANEL_TITLE[settingsPanel]
          : menuView === 'progress'
            ? 'Прогресс'
            : menuView === 'profile'
              ? 'Профиль'
              : !homeLayout
                ? 'Главная'
                : ''

  const handleGoHome = () => {
    if (onGoHome) onGoHome()
    else onMenuViewChange('root')
  }

  const resetTutorState = React.useCallback(() => {
    setTutorImageError(null)
    setTutorLoading(false)
    setTutorResult(null)
    setTutorImageDataUrl(null)
    setTutorCustomFocus('')
    setTutorSuggestedTopics([])
    setTutorTopicHintsByTopic({})
    setSelectedTutorTopic(null)
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
      setTutorTopicHintsByTopic({})
      setSelectedTutorTopic(null)
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
          query,
          level: settings.level,
          audience: settings.audience,
          analysisSummary,
        }),
      })
      const data = (await response.json()) as {
        resolved?: boolean
        suggestions?: string[]
        suggestionMeta?: Array<{ topic?: string; whyRu?: string }>
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
        suggestionMeta: Array.isArray(data.suggestionMeta) ? data.suggestionMeta : [],
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
          setTutorTopicHintsByTopic({})
          setSelectedTutorTopic(null)
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
        setTutorStep('select')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
        setTutorImageError(message)
        setTutorSuggestedTopics([])
        setTutorTopicHintsByTopic({})
        setSelectedTutorTopic(null)
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
        setTutorTopicHintsByTopic({})
        setSelectedTutorTopic(null)
        setTutorStep('input')
        setTutorClarifyPrompt(
          resolution.clarifyPrompt ??
            'ИИ: не удалось точно определить тему. Уточните, что хотите учить (например: Present Simple, Have/Has, Articles a/an/the).'
        )
        return
      }
      setTutorClarifyPrompt(null)
      setTutorSuggestedTopics(resolution.suggestions)
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
      setTutorStep('select')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
      setTutorImageError(message)
      setTutorResult(null)
    } finally {
      setTutorLoading(false)
    }
  }, [
    tutorImageDataUrl,
    tutorCustomFocus,
    settings.provider,
    settings.level,
    settings.audience,
  ])

  return (
    <div className={`${rootClass} ${manropeHome.className}`.trim()}>
      {(menuView !== 'root' || !homeLayout) && (
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/70 pb-1.5">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={menuView === 'root' ? handleGoHome : handleMenuBack}
              className="btn-3d-menu grid min-h-[44px] min-w-[6rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-0 rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] px-2 py-1.5 text-[13px] font-medium leading-normal text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label={
                menuView === 'root'
                  ? 'На стартовый экран'
                  : menuView === 'aiChat' && aiChatPanel !== 'summary'
                    ? 'Назад к настройкам чата'
                    : menuView === 'settings' && settingsPanel !== 'summary'
                      ? 'Назад к настройкам'
                      : 'Назад к разделам'
              }
            >
              <span className="flex justify-end pr-0.5" aria-hidden>
                <ChevronLeftIcon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </span>
              <span className="text-center">Назад</span>
              <span className="min-w-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleGoHome}
              className="btn-3d-menu flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--text)]/[0.18] bg-[var(--bg-card)] text-[var(--text)] touch-manipulation focus-visible:outline-none"
              aria-label="На стартовый экран"
              title="Стартовая страница"
            >
              <HomeIcon className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
          </div>
          <h2 className="min-w-0 flex-1 pr-2 text-right [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Noto_Sans',Arial,sans-serif] text-[18px] font-semibold tracking-normal leading-[1.25] text-[var(--text)] sm:pr-3">
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
                : menuView
        }
        className={
          homeLayout
            ? 'menu-panel-view-enter max-h-[calc(100dvh-12rem)] space-y-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5'
            : 'menu-panel-view-enter min-h-0 flex-1 space-y-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1'
        }
      >
        {menuView === 'root' && !homeLayout && (
          <div className={MENU_GROUP_OUTER}>
            <div className={MENU_GROUP_CLASS}>
              <MenuNavRow label="Чат с MyEng" onClick={() => onMenuViewChange('aiChat')} />
              <MenuNavRow label="Уроки" onClick={() => onMenuViewChange('lessons')} />
              <MenuNavRow label="Прогресс" onClick={() => onMenuViewChange('progress')} />
              <MenuNavRow label="Настройки" onClick={() => onMenuViewChange('settings')} />
              <MenuNavRow label="Профиль" onClick={() => onMenuViewChange('profile')} />
            </div>
          </div>
        )}

        {menuView === 'lessons' && (
          <>
            {lessonsPanel === 'summary' && (
              <div className={MENU_GROUP_OUTER}>
                <div className={MENU_GROUP_CLASS}>
                  <MenuNavRow label="Теория" onClick={() => setLessonsPanel('theory')} />
                  <LessonTopicRow label="Произношение" />
                  <MenuNavRow
                    label="Репетитор"
                    onClick={() => {
                      resetTutorState()
                      setLessonsPanel('tutor')
                    }}
                  />
                  <LessonTopicRow label="1000 необходимых слов" />
                </div>
              </div>
            )}

            {lessonsPanel === 'theory' && (
              <>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {THEORY_LEVELS.map((level) => (
                      <LessonLevelRow
                        key={level.id}
                        label={level.label}
                        onClick={level.id === 'A2' ? () => setLessonsPanel('a2') : undefined}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {lessonsPanel === 'a2' && (
              <>
                <div className={MENU_GROUP_OUTER}>
                  <div className={MENU_GROUP_CLASS}>
                    {A2_THEORY_ITEMS.map((item) => (
                      <A2LessonChoiceRow
                        key={item.id}
                        label={item.label}
                        selected={item.enabled && selectedA2LessonId === item.id}
                        enabled={item.enabled}
                        onClick={item.enabled ? () => setSelectedA2LessonId(item.id) : undefined}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!onOpenLearningLesson || !selectedA2LessonId) return
                      onOpenLearningLesson(selectedA2LessonId)
                    }}
                    disabled={!onOpenLearningLesson || !selectedA2LessonId}
                    className={MENU_PRIMARY_CTA_CLASS}
                  >
                    Начать урок
                  </button>
                </div>
              </>
            )}
            {lessonsPanel === 'tutor' && (
              <>
                {tutorStep === 'input' && (
                <div className={MENU_GROUP_OUTER}>
                  <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                    <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                      Загрузите фото, и MyEng подскажет, что на изображении и что учить дальше.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="btn-3d-menu flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-medium text-[var(--text)]"
                      >
                        Загрузить фото
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="btn-3d-menu flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] font-medium text-[var(--text)]"
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
                          setSelectedTutorTopic(null)
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
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
                        <img src={tutorImageDataUrl} alt="Фото для анализа" className="h-auto w-full object-cover" />
                      </div>
                    )}
                    {tutorImageError && (
                      <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">
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
                      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
                        {tutorClarifyPrompt}
                      </p>
                    )}
                  </div>
                </div>
                )}

                {tutorStep === 'select' && tutorSuggestedTopics.length > 0 && (
                  <div className={MENU_GROUP_OUTER}>
                    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                        Выберите тему и нажмите «Начать».
                      </p>
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                        {tutorSuggestedTopics.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setSelectedTutorTopic(topic)}
                            className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[14px] text-[var(--text)] hover:bg-[var(--border)]/20"
                          >
                            <span className="pr-2">
                              <span className="block">{topic}</span>
                              <span className="block text-[12px] leading-snug text-[var(--text-muted)]">
                                {tutorTopicHintsByTopic[topic] ?? 'Выберите самый близкий вариант к вашему запросу.'}
                              </span>
                            </span>
                            {selectedTutorTopic === topic ? (
                              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            ) : (
                              <span className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={!selectedTutorTopic || !onOpenTutorLesson || tutorStartingLesson}
                        onClick={async () => {
                          if (!selectedTutorTopic || !onOpenTutorLesson) return
                          setTutorStartingLesson(true)
                          try {
                            await onOpenTutorLesson({
                              requestedTopic: selectedTutorTopic,
                              analysisSummary: tutorResult?.whatISee.summaryRu,
                            })
                          } finally {
                            setTutorStartingLesson(false)
                          }
                        }}
                        className={
                          tutorStartingLesson
                            ? 'w-full rounded-xl border border-gray-300 bg-gradient-to-b from-gray-400 to-gray-500 px-4 py-3 text-center text-base font-semibold text-white opacity-90'
                            : MENU_PRIMARY_CTA_CLASS
                        }
                      >
                        {tutorStartingLesson ? (
                          <span className="text-sm italic">MyEng составляет урок...</span>
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
                        className="btn-3d-menu w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Изменить запрос
                      </button>
                    </div>
                  </div>
                )}

                {tutorResult && (
                  <>
                    <div className={MENU_GROUP_OUTER}>
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
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
                      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
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
          <div className="flex w-full items-start gap-3">
            <span className={MENU_FIELD_LABEL}>Раздел</span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Профиль появится позже.
            </p>
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
              if (id === 'child') {
                const safeTopic = CHILD_SAFE_TOPICS.has(settings.topic)
                  ? settings.topic
                  : 'hobbies'
                update({ audience: id, level: 'all', tenses: ['present_simple'], topic: safeTopic })
              } else {
                update({ audience: id })
              }
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
              update({ topic: id as TopicId })
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
              <MenuSettingRow label="ИИ" value={providerLabel} onClick={() => setSettingsPanel('provider')} />
              {settings.provider === 'openai' && (
                <MenuSettingRow
                  label="Модель ChatGPT"
                  value={openAiModelLabel}
                  onClick={() => setSettingsPanel('openAiModel')}
                />
              )}
              <VoiceSummaryRow
                label="Голос"
                voiceId={settings.voiceId}
                preferredLangPrefixes={VOICE_DROPDOWN_LANG_PREFIXES}
                onOpen={() => setSettingsPanel('voice')}
              />
            </div>
          </div>
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

        {menuView === 'settings' && settingsPanel === 'openAiModel' && settings.provider === 'openai' && (
          <PickerList
            options={OPENAI_MODEL_OPTIONS}
            value={settings.openAiChatPreset ?? 'gpt-4o-mini'}
            onSelect={(id) => {
              update({ openAiChatPreset: id })
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

        {menuView === 'progress' && (
          <>
            {settings.mode === 'dialogue' ? (
              <>
                <div className="flex w-full items-center gap-3">
                  <span
                    id={pid('progress-correct-label')}
                    className="shrink-0 whitespace-nowrap text-[13px] font-medium leading-normal text-[var(--text-muted)]"
                  >
                    Правильных ответов
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={MENU_VALUE_BOX}
                      role="status"
                      aria-labelledby={pid('progress-correct-label')}
                    >
                      <span className="tabular-nums">{dialogueCorrectAnswers}</span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center gap-3">
                  <span id={pid('progress-usage-label')} className={MENU_FIELD_LABEL}>
                    Запросов
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={MENU_VALUE_BOX}
                      role="status"
                      aria-labelledby={pid('progress-usage-label')}
                    >
                      <span className="tabular-nums">
                        {usage.limit > 0 ? `${usage.used} / ${usage.limit}` : `${usage.used}`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex w-full items-start gap-3">
                <span className={MENU_FIELD_LABEL}>Справка</span>
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                  Счётчик правильных ответов доступен в режиме «Диалог».
                </p>
              </div>
            )}
          </>
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
      <span className="text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
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
      <span className="text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
      <span className="text-[13px] leading-normal text-[var(--text-muted)]">Скоро</span>
    </div>
  )
}

function A2LessonChoiceRow({
  label,
  selected,
  enabled,
  onClick,
}: {
  label: string
  selected: boolean
  enabled: boolean
  onClick?: () => void
}) {
  if (!enabled) {
    return (
      <div className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 last:border-b-0">
        <span className="text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
        <span className="text-[13px] leading-normal text-[var(--text-muted)]">Скоро</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="text-[15px] font-normal leading-normal text-[var(--text)]">{label}</span>
      {selected ? (
        <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
      ) : (
        <span className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </button>
  )
}

function MenuSettingRow({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-between gap-2 border-b border-[var(--border)]/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--border)]/25 active:bg-[var(--border)]/35 touch-manipulation"
    >
      <span className="shrink-0 text-sm font-medium leading-normal text-[var(--text-muted)]">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-right leading-normal text-[var(--text)] ${MENU_CHOICE_TEXT_CLASS}`}>
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
      <span>{label}</span>
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

